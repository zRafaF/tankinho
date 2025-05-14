import React, { createContext, useContext } from "react";
import { useGameConnection } from "@/hooks/useGameConnection";

// 1. Define the shape of context data
export interface GameConnectionContextValue {
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  roomCode: string;
  playerId: number | null;
  isHost: boolean;
  error: string;
  createMatch: () => void;
  joinMatch: (code: string) => void;
  disconnectFromMatch: () => void;
  isConnected: boolean;
  isConnecting: boolean;
}

// 2. Create context with a default stub
const GameConnectionContext = createContext<
  GameConnectionContextValue | undefined
>(undefined);

interface GameConnectionProviderProps {
  children: React.ReactNode;
  onCreateHost?: (matchId: string) => void;
  onJoinGuest?: (matchId: string) => void;
}

// 3. Provider component wraps app and exposes context
export const GameConnectionProvider: React.FC<GameConnectionProviderProps> = ({
  children,
  onCreateHost,
  onJoinGuest,
}) => {
  const {
    connectionState,
    roomCode,
    playerId,
    isHost,
    error,
    createMatch,
    joinMatch,
    disconnectFromMatch,
    isConnected,
    isConnecting,
  } = useGameConnection({
    joined: (host, matchId) => {
      if (host) onCreateHost?.(matchId);
      else onJoinGuest?.(matchId);
    },
  });

  const value: GameConnectionContextValue = {
    connectionState,
    roomCode,
    playerId,
    isHost,
    error,
    createMatch,
    joinMatch,
    disconnectFromMatch,
    isConnected,
    isConnecting,
  };

  return (
    <GameConnectionContext.Provider value={value}>
      {children}
    </GameConnectionContext.Provider>
  );
};

export function useGameConnectionContext(): GameConnectionContextValue {
  const context = useContext(GameConnectionContext);
  if (!context) {
    throw new Error(
      "useGameConnectionContext must be used within a GameConnectionProvider"
    );
  }
  return context;
}
