import { useState, useEffect } from "react";
import {
  INITIAL_PLAYER_POS,
  INITIAL_GUEST_POS,
  TURN_TIME_SEC,
} from "@/config/gameConfig";
import { Turn } from "@/gen/proto/game_pb";
import {
  PlayerSchema,
  Vec2Schema,
  DynamicUpdateSchema,
  TurnUpdateSchema,
} from "@/gen/proto/game_pb";
import { create } from "@bufbuild/protobuf";

interface UseGameMechanicsProps {
  isHost: boolean;
  gameStarted: boolean;
  latestOpponentState: any;
  sendTurnUpdate: (update: any) => void;
  setBitmask: (bitmask: Uint8Array) => void;
}

export const useGameMechanics = ({
  isHost,
  gameStarted,
  latestOpponentState,
  sendTurnUpdate,
  setBitmask,
}: UseGameMechanicsProps) => {
  const [health, setHealth] = useState(100);
  const [playerPos, setPlayerPos] = useState(
    isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS
  );
  const [opponentPos, setOpponentPos] = useState({ x: 0, y: 0 });
  const [opponentAngle, setOpponentAngle] = useState(0);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [roundState, setRoundState] = useState<"player" | "bullet" | "other">(
    "other"
  );
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    if (gameStarted && isHost) {
      setRoundState("player");
      setTurnTime(TURN_TIME_SEC);
      setIsMyTurn(true);
    }
  }, [gameStarted, isHost]);

  useEffect(() => {
    if (!latestOpponentState) return;

    const opponentPlayer = isHost
      ? latestOpponentState.guestPlayer
      : latestOpponentState.hostPlayer;

    if (opponentPlayer) {
      setOpponentPos({
        x: opponentPlayer.position?.x ?? 0,
        y: opponentPlayer.position?.y ?? 0,
      });
      setOpponentAngle(opponentPlayer.aimAngle ?? 0);
      setOpponentHealth(opponentPlayer.health ?? 100);
    }

    const theirTurn = latestOpponentState.turn;
    if (theirTurn !== (isHost ? Turn.HOST : Turn.GUEST)) {
      setIsMyTurn(false);
    }
  }, [latestOpponentState, isHost]);

  useEffect(() => {
    if (roundState !== "player") return;

    let animationFrameId: number;
    let startTime = Date.now();

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = TURN_TIME_SEC - Math.floor(elapsed / 1000);

      if (remaining <= 0) {
        setTurnTime(0);
        setRoundState("other");
        return;
      }

      setTurnTime(remaining);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [roundState]);

  useEffect(() => {
    if (health <= 0) {
      const newTurn = isHost ? Turn.GUEST : Turn.HOST;
      const update = create(TurnUpdateSchema, {
        bitMask: new Uint8Array(),
        turn: newTurn,
      });
      sendTurnUpdate(update);
      setRoundState("other");
    }
  }, [health, isHost, sendTurnUpdate, setBitmask]);

  return {
    health,
    setHealth,
    playerPos,
    setPlayerPos,
    opponentPos,
    opponentHealth,
    opponentAngle,
    roundState,
    setRoundState,
    turnTime,
    setTurnTime,
    isMyTurn,
  };
};
