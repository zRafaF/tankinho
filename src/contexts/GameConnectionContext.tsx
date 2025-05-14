// src/contexts/GameConnectionContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  ClientMessageSchema,
  ServerMessageSchema,
  ServerMessage_ServerFlags,
} from "@/gen/proto/connection_pb";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface GameConnectionContextValue {
  connectionState: ConnectionState;
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

const GameConnectionContext = createContext<
  GameConnectionContextValue | undefined
>(undefined);

export const useGameConnectionContext = () => {
  const context = useContext(GameConnectionContext);
  if (!context) {
    throw new Error(
      "useGameConnectionContext must be used within a GameConnectionProvider"
    );
  }
  return context;
};

interface GameConnectionProviderProps {
  children: React.ReactNode;
  onCreateHost: (matchId: string) => void;
  onJoinGuest: (matchId: string) => void;
  onStartMatch?: () => void;
}

export const GameConnectionProvider = ({
  children,
  onCreateHost,
  onJoinGuest,
  onStartMatch,
}: GameConnectionProviderProps) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_SERVER);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnectionState("connected");
      setError("");
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setConnectionState("error");
      setError("Connection error. Please try again.");
    };

    ws.onmessage = (event) => {
      try {
        const data = new Uint8Array(event.data);
        const serverMessage = fromBinary(ServerMessageSchema, data);

        switch (serverMessage.message.case) {
          case "error":
            setError(serverMessage.message.value.message);
            break;

          case "success":
            setError("");
            break;

          case "matchCreated": {
            const matchData = serverMessage.message.value;
            setRoomCode(matchData.matchId);
            setPlayerId(matchData.playerId);
            setIsHost(true);
            onCreateHost(matchData.matchId);
            break;
          }

          case "matchJoined": {
            const matchData = serverMessage.message.value;
            setRoomCode(matchData.matchId);
            setPlayerId(matchData.playerId);
            setIsHost(false);
            onJoinGuest(matchData.matchId);
            break;
          }

          case "serverFlags":
            if (
              serverMessage.message.value ===
              ServerMessage_ServerFlags.SERVER_START_MATCH
            ) {
              onStartMatch?.();
            }
            break;
        }
      } catch (e) {
        console.error("Message parsing error:", e);
        setError("Invalid server response");
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  const createMatch = useCallback(() => {
    if (!socket || connectionState !== "connected") return;
    try {
      const message = create(ClientMessageSchema);
      message.message.case = "createMatch";
      message.message.value = true;
      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      console.error("Create match error:", e);
      setError("Failed to create match");
    }
  }, [socket, connectionState]);

  const joinMatch = useCallback(
    (code: string) => {
      if (!socket || connectionState !== "connected") return;
      try {
        const message = create(ClientMessageSchema);
        message.message.case = "joinMatch";
        message.message.value = code;
        socket.send(toBinary(ClientMessageSchema, message));
      } catch (e) {
        console.error("Join match error:", e);
        setError("Failed to join match");
      }
    },
    [socket, connectionState]
  );

  const disconnectFromMatch = useCallback(() => {
    if (!socket || !roomCode) return;
    try {
      const message = create(ClientMessageSchema);
      message.message.case = "disconnectMatch";
      message.message.value = roomCode;
      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      console.error("Disconnect error:", e);
      setError("Failed to disconnect from match");
    }
  }, [socket, roomCode]);

  const value: GameConnectionContextValue = {
    connectionState,
    roomCode,
    playerId,
    isHost,
    error,
    createMatch,
    joinMatch,
    disconnectFromMatch,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
  };

  return (
    <GameConnectionContext.Provider value={value}>
      {children}
    </GameConnectionContext.Provider>
  );
};
