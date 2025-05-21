import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
} from "react";
import {
  ClientMessageSchema,
  Error_Type,
  ServerMessageSchema,
  ServerMessage_ServerFlags,
} from "@/gen/proto/connection_pb";
import {
  Turn,
  GameUpdateSchema,
  type DynamicUpdate,
  type TurnUpdate,
} from "@/gen/proto/game_pb";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { createTerrain } from "@/lib/environmentUtils";

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

  bitmask: Uint8Array;
  setBitmask: Dispatch<React.SetStateAction<Uint8Array>>;

  latestOpponentState: DynamicUpdate | null;
  setLatestOpponentState: (update: DynamicUpdate) => void;
  sendDynamicUpdate: (update: DynamicUpdate) => void;
  sendTurnUpdate: (update: TurnUpdate) => void;
  currentTurn: Turn;
  setCurrentTurn: (t: Turn) => void;
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

export const GameConnectionProvider = ({
  children,
  onCreateHost,
  onJoinGuest,
  onStartMatch,
  onOtherPlayerDisconnected,
}: {
  children: React.ReactNode;
  onCreateHost: (matchId: string) => void;
  onJoinGuest: (matchId: string) => void;
  onStartMatch?: () => void;
  onOtherPlayerDisconnected?: () => void;
}) => {
  const [bitmask, setBitmask] = useState<Uint8Array>(() => createTerrain());

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [latestOpponentState, setLatestOpponentState] =
    useState<DynamicUpdate | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Turn>(Turn.HOST);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(
    () => {
      const ws = new WebSocket(import.meta.env.VITE_WS_SERVER);
      ws.binaryType = "arraybuffer";
      socketRef.current = ws;

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
              if (
                serverMessage.message.value.type ===
                  Error_Type.ERROR_HOST_DISCONNECTED ||
                serverMessage.message.value.type ===
                  Error_Type.ERROR_GUEST_DISCONNECTED
              ) {
                onOtherPlayerDisconnected?.();
              }
              break;

            case "success":
              setError("");
              break;

            case "matchCreated":
              setRoomCode(serverMessage.message.value.matchId);
              setPlayerId(serverMessage.message.value.playerId);
              setIsHost(true);
              onCreateHost(serverMessage.message.value.matchId);
              break;

            case "matchJoined":
              setRoomCode(serverMessage.message.value.matchId);
              setPlayerId(serverMessage.message.value.playerId);
              setIsHost(false);
              onJoinGuest(serverMessage.message.value.matchId);
              break;

            case "serverFlags":
              if (
                serverMessage.message.value ===
                ServerMessage_ServerFlags.SERVER_START_MATCH
              ) {
                onStartMatch?.();
              }
              break;

            case "gameUpdate": {
              const gameUpdate = serverMessage.message.value;
              switch (gameUpdate.data.case) {
                case "dynamicUpdate":
                  const dynamic = gameUpdate.data.value;
                  setLatestOpponentState(dynamic);
                  break;
                case "turnUpdate":
                  const turnUpdate = gameUpdate.data.value;

                  console.log(turnUpdate);

                  setCurrentTurn(turnUpdate.turn);
                  setBitmask(turnUpdate.bitMask);
                  break;
              }
              break;
            }
          }
        } catch (e) {
          console.error("Message parsing error:", e);
          setError("Invalid server response");
        }
      };

      return () => ws.close();
    },
    [] // needs to be empty to avoid weak websocket connection
  );

  const createMatch = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || connectionState !== "connected") return;
    try {
      const message = create(ClientMessageSchema);
      message.message.case = "createMatch";
      message.message.value = true;
      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      setError("Failed to create match");
    }
  }, [connectionState]);

  const joinMatch = useCallback(
    (code: string) => {
      const socket = socketRef.current;
      if (!socket || connectionState !== "connected") return;
      try {
        const message = create(ClientMessageSchema);
        message.message.case = "joinMatch";
        message.message.value = code;
        socket.send(toBinary(ClientMessageSchema, message));
      } catch (e) {
        setError("Failed to join match");
      }
    },
    [connectionState]
  );

  const disconnectFromMatch = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !roomCode) return;
    try {
      const message = create(ClientMessageSchema);
      message.message.case = "disconnectMatch";
      message.message.value = roomCode;
      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      setError("Failed to disconnect");
    }
  }, [roomCode]);

  const sendDynamicUpdate = useCallback(
    (update: DynamicUpdate) => {
      const socket = socketRef.current;
      if (
        !socket ||
        connectionState !== "connected" ||
        !roomCode ||
        !socket.readyState
      )
        return;

      const wrapper = create(GameUpdateSchema, {
        matchId: roomCode,
        data: { case: "dynamicUpdate", value: update },
      });

      const message = create(ClientMessageSchema);
      message.message.case = "gameUpdate";
      message.message.value = wrapper;

      socket.send(toBinary(ClientMessageSchema, message));
    },
    [roomCode, connectionState]
  );

  const sendTurnUpdate = (update: TurnUpdate) => {
    const socket = socketRef.current;
    if (!socket || connectionState !== "connected" || !roomCode) return;

    const finalUpdate = create(GameUpdateSchema, {
      matchId: roomCode,
      data: { case: "turnUpdate", value: update },
    });

    const message = create(ClientMessageSchema);
    message.message.case = "gameUpdate";
    message.message.value = finalUpdate;

    socket.send(toBinary(ClientMessageSchema, message));
  };

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

    bitmask,
    setBitmask,

    latestOpponentState,
    setLatestOpponentState,
    sendDynamicUpdate,
    sendTurnUpdate,
    currentTurn,
    setCurrentTurn,
  };

  return (
    <GameConnectionContext.Provider value={value}>
      {children}
    </GameConnectionContext.Provider>
  );
};
