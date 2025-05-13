# server.py
import asyncio
import random
import websockets
import sys

sys.path.append("server/proto/")
from proto.connection_pb2 import ClientMessage, ServerMessage, Error


class GameServer:
    def __init__(self):
        self.matches = {}  # {match_id: {'host': ws, 'guest': ws}}
        self.connected_players = {}  # {ws: match_id}

    async def handle_connection(self, websocket):
        try:
            async for message in websocket:
                client_msg = ClientMessage()
                client_msg.ParseFromString(message)

                if client_msg.HasField("create_match"):
                    await self.handle_create_match(websocket)
                elif client_msg.HasField("join_match"):
                    await self.handle_join_match(
                        websocket, client_msg.join_match.match_id
                    )

        except websockets.exceptions.ConnectionClosed:
            await self.handle_disconnect(websocket)

    async def handle_create_match(self, websocket):
        # Generate unique 4-digit code
        while True:
            match_id = f"{random.randint(1000, 9999)}"
            if match_id not in self.matches:
                break

        self.matches[match_id] = {"host": websocket, "guest": None}
        self.connected_players[websocket] = match_id

        # Send success response with match ID
        response = ServerMessage()
        response.success = True
        await websocket.send(response.SerializeToString())

        print(f"Match created: {match_id}")

    async def handle_join_match(self, websocket, match_id):
        if match_id not in self.matches:
            error = ServerMessage()
            error.error.message = "Match not found"
            error.error.type = Error.ERROR_MATCH_NOT_FOUND
            await websocket.send(error.SerializeToString())
            return

        match = self.matches[match_id]
        if match["guest"] is not None:
            error = ServerMessage()
            error.error.message = "Match is full"
            error.error.type = Error.ERROR_MATCH_FULL
            await websocket.send(error.SerializeToString())
            return

        # Add guest to match
        match["guest"] = websocket
        self.connected_players[websocket] = match_id

        # Notify both players
        success = ServerMessage()
        success.success = True

        await match["host"].send(success.SerializeToString())
        await websocket.send(success.SerializeToString())

        print(f"Player joined match: {match_id}")

    async def handle_disconnect(self, websocket):
        match_id = self.connected_players.get(websocket)
        if not match_id:
            return

        match = self.matches.get(match_id)
        if not match:
            return

        # Clean up match if host disconnects
        if websocket == match["host"]:
            if match["guest"]:
                error = ServerMessage()
                error.error.message = "Host disconnected"
                error.error.type = Error.ERROR_UNKNOWN
                await match["guest"].send(error.SerializeToString())
            del self.matches[match_id]
        elif websocket == match["guest"]:
            match["guest"] = None  # Allow new guest to join

        del self.connected_players[websocket]


async def main():
    server = GameServer()
    async with websockets.serve(
        server.handle_connection,
        "localhost",
        8765,
    ):
        print("Server started on ws://localhost:8765")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
