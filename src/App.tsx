import { useState } from "react";
import ConnectionScreen from "@/components/ConnectionScreen";
import GameScreen from "@/components/GameScreen";
import { GameConnectionProvider } from "./contexts/GameConnectionContext";

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
    <GameConnectionProvider
      onCreateHost={(matchId) => {
        setGameState({
          status: "waiting",
          roomCode: matchId,
          isHost: true,
        });
      }}
      onJoinGuest={(matchId) => {
        setGameState({
          status: "in-game",
          roomCode: matchId,
          isHost: false,
        });
      }}
    >
      <div className="w-full h-screen bg-gray-900">
        {gameState.status === "connecting" ? (
          <ConnectionScreen />
        ) : (
          <GameScreen
            gameStarted={gameState.status === "in-game"}
            onExitGame={() => setGameState({ status: "connecting" })}
          />
        )}
      </div>
    </GameConnectionProvider>
  );
}
