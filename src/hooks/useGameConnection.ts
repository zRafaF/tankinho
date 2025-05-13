// src/hooks/useGameConnection.ts
import { useState, useEffect, useCallback } from "react";
import {
  ClientMessageSchema,
  ServerMessageSchema,
} from "@/gen/proto/connection_pb";
import { CreateMatchSchema, JoinMatchSchema } from "@/gen/proto/match_pb";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export function useGameConnection() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [roomCode, setRoomCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

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

        if (serverMessage.message.case === "error") {
          setError(serverMessage.message.value.message);
          return;
        }

        if (serverMessage.message.case === "success") {
          // Handle successful match creation/join
          setError("");
        }

        // Add other message handlers here
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
      message.message.value = create(CreateMatchSchema, {
        matchId: "abcd", // Replace with actual match ID generation logic
      });

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
        message.message.value = create(JoinMatchSchema, {
          matchId: code,
        });

        socket.send(toBinary(ClientMessageSchema, message));
      } catch (e) {
        setError("Failed to join match");
        console.error("Join match error:", e);
      }
    },
    [socket, connectionState]
  );

  return {
    connectionState,
    roomCode,
    error,
    createMatch,
    joinMatch,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
  };
}
