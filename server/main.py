import asyncio
import websockets
from gameserver import GameServer
import os

WS_HOST = os.getenv("WS_HOST", "localhost")
WS_PORT = int(os.getenv("WS_PORT", "8765"))


async def main():
    server = GameServer()
    async with websockets.serve(
        server.handle_connection,
        WS_HOST,
        WS_PORT,
    ):
        print(f"Server started on ws://{WS_HOST}:{WS_PORT}")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
