import sys

sys.path.append("server/proto/")
from proto.connection_pb2 import ClientMessage, ServerMessage, Error
from proto.game_pb2 import GameUpdate, Turn
import websockets
from helpers import *


class Match:
    def __init__(
        self,
        _host: websockets.ServerConnection = None,
        _guest: websockets.ServerConnection = None,
    ):
        self.host_connection = _host
        self.guest_connection = _guest


class GameServer:
    def __init__(self):
        self.matches: dict[str, Match] = {}  # Hash table of match_id to Match object

    async def handle_connection(self, websocket: websockets.ServerConnection):
        print(self.matches)
        try:
            async for message in websocket:
                client_msg = ClientMessage()
                client_msg.ParseFromString(message)

                if client_msg.create_match:
                    await self.handle_create_match(websocket)
                elif client_msg.join_match:
                    await self.handle_join_match(websocket, client_msg.join_match)
                elif client_msg.client_flags:
                    await self.handle_client_flags(websocket, client_msg.client_flags)
                elif client_msg.disconnect_match:
                    print(f"Match disconnected: {client_msg.disconnect_match}")
                    await self.handle_disconnect(client_msg.disconnect_match)
                elif client_msg.game_update:
                    await self.handle_game_update(websocket, client_msg.game_update)

        except websockets.exceptions.ConnectionClosed:
            await self.handle_connection_closed(websocket)
        except Exception as e:
            print(f"Unexpected error in handle_connection: {e}")

    async def handle_connection_closed(self, websocket: websockets.ServerConnection):
        print(f"Connection closed: {websocket}")
        # Find all matches where the disconnected websocket is host or guest
        to_remove = []
        for match_id, match in self.matches.items():
            if (
                match.host_connection == websocket
                or match.guest_connection == websocket
            ):
                to_remove.append(match_id)

        # Process each affected match
        for match_id in to_remove:
            await self.handle_disconnect(match_id)

    async def handle_client_flags(
        self, websocket: websockets.ServerConnection, flags: ClientMessage.ClientFlags
    ):
        print(f"Client flags received: {flags}")
        if flags == ClientMessage.ClientFlags.NONE:
            print("Client flags: NONE")

    async def handle_create_match(self, websocket: websockets.ServerConnection):
        print("Creating match...")
        while True:
            match_id = get_random_match_id()
            if match_id not in self.matches:
                break

        self.matches[match_id] = Match(websocket, None)

        response = ServerMessage()
        response.match_created.match_id = match_id
        response.match_created.player_id = get_player_id()
        await websocket.send(response.SerializeToString())

        print(f"Match created: {match_id}")

    async def handle_game_update(
        self, websocket: websockets.ServerConnection, game_update: GameUpdate
    ):
        if game_update.dynamic_update:
            match = self.matches.get(game_update.match_id)
            if match is not None:
                target_ws = (
                    match.guest_connection
                    if game_update.dynamic_update.turn == Turn.TURN_HOST
                    else match.host_connection
                )

                print(f"Game update received: {game_update}")

                if target_ws is not None:
                    response = ServerMessage()
                    response.game_update.dynamic_update.CopyFrom(
                        game_update.dynamic_update
                    )
                    try:
                        await target_ws.send(response.SerializeToString())
                    except websockets.exceptions.ConnectionClosed:
                        print("Failed to send update - connection closed")
                        await self.handle_connection_closed(target_ws)
        elif game_update.turn_update:
            print(f"turn: {game_update}")

    async def handle_join_match(
        self, websocket: websockets.ServerConnection, match_id: str
    ):
        print(f"Match ID for joining websocket: {match_id}")
        if match_id not in self.matches:
            error = ServerMessage()
            error.error.message = "Match not found"
            error.error.type = Error.ERROR_MATCH_NOT_FOUND
            await websocket.send(error.SerializeToString())
            return

        match = self.matches[match_id]
        if match.guest_connection is not None:
            error = ServerMessage()
            error.error.message = "Match is full"
            error.error.type = Error.ERROR_MATCH_FULL
            await websocket.send(error.SerializeToString())
            return

        match.guest_connection = websocket

        response = ServerMessage()
        response.match_joined.match_id = match_id
        response.match_joined.player_id = get_player_id()
        await match.guest_connection.send(response.SerializeToString())

        success = ServerMessage()
        success.server_flags = ServerMessage.SERVER_START_MATCH
        try:
            await match.host_connection.send(success.SerializeToString())
            await match.guest_connection.send(success.SerializeToString())
        except websockets.exceptions.ConnectionClosed:
            print("Failed to send start match - connection closed")
            await self.handle_connection_closed(websocket)
            return

        print(f"Guest player has joined match: {match_id}")

    async def handle_disconnect(self, match_id: str):
        print(f"Match ID for disconnecting websocket: {match_id}")

        if not match_id or match_id not in self.matches:
            print(f"Invalid match ID or match not found: {match_id}")
            return

        match = self.matches[match_id]

        # Notify the other player if they're still connected
        try:
            if match.guest_connection is not None:
                error = ServerMessage()
                error.error.message = "Host disconnected"
                error.error.type = Error.ERROR_HOST_DISCONNECTED
                try:
                    await match.guest_connection.send(error.SerializeToString())
                except websockets.exceptions.ConnectionClosed:
                    print("Guest connection already closed")
        except Exception as e:
            print(f"Error notifying guest: {e}")

        try:
            if match.host_connection is not None:
                error = ServerMessage()
                error.error.message = "Guest disconnected"
                error.error.type = Error.ERROR_GUEST_DISCONNECTED
                try:
                    await match.host_connection.send(error.SerializeToString())
                except websockets.exceptions.ConnectionClosed:
                    print("Host connection already closed")
        except Exception as e:
            print(f"Error notifying host: {e}")

        print(f"Player disconnected from match: {match_id}")
        del self.matches[match_id]
