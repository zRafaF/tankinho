import sys

sys.path.append("server/proto/")
from proto.connection_pb2 import ClientMessage, ServerMessage, Error
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

        except websockets.exceptions.ConnectionClosed:
            await self.handle_disconnect(websocket)

    async def handle_client_flags(
        self, websocket: websockets.ServerConnection, flags: ClientMessage.ClientFlags
    ):
        print(f"Client flags received: {flags}")
        if flags == ClientMessage.ClientFlags.NONE:
            print("Client flags: NONE")

    async def handle_create_match(self, websocket: websockets.ServerConnection):
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

    async def handle_join_match(
        self, websocket: websockets.ServerConnection, match_id: str
    ):
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
        response.match_created.match_id = match_id
        response.match_created.player_id = get_player_id()
        await match.guest_connection.send(response.SerializeToString())

        success = ServerMessage()
        success.server_flags = ServerMessage.SERVER_START_MATCH
        await match.host_connection.send(success.SerializeToString())

        print(f"Guest player has joined match: {match_id}")

    async def handle_disconnect(self, match_id: str):
        print(f"Match ID for disconnecting websocket: {match_id}")

        if not match_id:
            return

        match = self.matches[match_id]

        if match is None:
            print(f"Match not found for ID: {match_id}")
            return

        if match.guest_connection is not None:
            error = ServerMessage()
            error.error.message = "Host disconnected"
            error.error.type = Error.ERROR_HOST_DISCONNECTED
            await match.guest_connection.send(error.SerializeToString())
        if match.host_connection is not None:
            error = ServerMessage()
            error.error.message = "Guest disconnected"
            error.error.type = Error.ERROR_GUEST_DISCONNECTED
            await match.host_connection.send(error.SerializeToString())

        print(f"Player disconnected from match: {match_id}")
        del self.matches[match_id]
