// src/hooks/useGameConnection.ts
import { useState, useEffect, useCallback } from "react";
import {
  ClientMessageSchema,
  ServerMessageSchema,
  ClientMessage_ClientFlags,
  ServerMessage_ServerFlags,
} from "@/gen/proto/connection_pb";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseGameConnectionProps {
  joined?: () => void;
  startMatch?: () => void;
}

export function useGameConnection({
  joined,
  startMatch,
}: UseGameConnectionProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [roomCode, setRoomCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  // Initialize WebSocket connection
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
      setConnectionState("error");
      setError("Connection error. Please try again.");
      console.error("WebSocket error:", event);
    };

    ws.onmessage = (event) => {
      try {
        const data = new Uint8Array(event.data);
        const serverMessage = fromBinary(ServerMessageSchema, data);

        console.log("Received message:", serverMessage);

        switch (serverMessage.message.case) {
          case "error":
            setError(serverMessage.message.value.message);
            return;
          case "success":
            setError("");
            break;

          case "matchCreated":
            const matchData = serverMessage.message.value;
            setRoomCode(matchData.matchId);
            setPlayerId(matchData.playerId);
            setIsHost(true);
            if (joined) {
              joined();
            }
            break;

          case "matchJoined":
            const matchJoinedData = serverMessage.message.value;
            setRoomCode(matchJoinedData.matchId);
            setPlayerId(matchJoinedData.playerId);
            setIsHost(false);
            if (joined) {
              joined();
            }
            break;

          case "serverFlags":
            const flags = serverMessage.message.value;
            if (flags === ServerMessage_ServerFlags.SERVER_START_MATCH) {
              if (startMatch) {
                startMatch();
              }
            }
            break;

          default:
            break;
        }
      } catch (e) {
        setError("Invalid server response");
        console.error("Message parsing error:", e);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const createMatch = useCallback(() => {
    if (!socket || connectionState !== "connected") return;

    try {
      const message = create(ClientMessageSchema);
      message.message.case = "createMatch";
      message.message.value = true;

      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      setError("Failed to create match");
      console.error("Create match error:", e);
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
        setError("Failed to join match");
        console.error("Join match error:", e);
      }
    },
    [socket, connectionState]
  );

  const disconnectFromMatch = useCallback(() => {
    console.log({
      socket,
      connectionState,
    });

    if (!socket) return;

    try {
      const message = create(ClientMessageSchema);
      message.message.case = "clientFlags";
      message.message.value =
        ClientMessage_ClientFlags.CLIENT_DISCONNECT_FROM_MATCH;

      socket.send(toBinary(ClientMessageSchema, message));
    } catch (e) {
      setError("Failed to disconnect from match");
      console.error("Disconnect error:", e);
    }
  }, [socket]);

  return {
    connectionState,
    roomCode,
    error,
    createMatch,
    joinMatch,
    disconnectFromMatch,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
  };
}
