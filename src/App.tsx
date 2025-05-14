import { useState } from "react";
import ConnectionScreen from "@/components/ConnectionScreen";
import GameScreen from "@/components/GameScreen";

export type GameState = {
  status: "connecting" | "in-game" | "waiting";
  roomCode?: string;
  isHost?: boolean;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: "connecting",
  });

  return (
    <div className="w-full h-screen bg-gray-900">
      {gameState.status === "connecting" ? (
        <ConnectionScreen
          onJoinGame={(code) => {
            setGameState({
              status: "in-game",
              roomCode: code,
              isHost: false,
            });
          }}
          onCreateHost={(code) => {
            setGameState({
              status: "waiting",
              roomCode: code,
              isHost: true,
            });
          }}
        />
      ) : (
        <GameScreen
          roomCode={gameState.roomCode!}
          isHost={gameState.isHost || false}
          gameStarted={gameState.status === "in-game"}
          onExitGame={() => setGameState({ status: "connecting" })}
        />
      )}
    </div>
  );
}

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};
