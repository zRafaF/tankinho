import { useState, useEffect, useRef } from "react";
import {
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  BULLET_SPEED_FACTOR,
} from "@/config/gameConfig";

interface UseShootingProps {
  isMyTurn: boolean;
  roundState: "player" | "bullet" | "other";
  playerPos: { x: number; y: number };
  turretAngle: number;
  setRoundState: (state: "player" | "bullet" | "other") => void;
}

export type BulletType = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export const useShooting = ({
  isMyTurn,
  roundState,
  playerPos,
  turretAngle,
  setRoundState,
}: UseShootingProps) => {
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);
  const [bullets, setBullets] = useState<Array<BulletType>>([]);
  const nextBulletId = useRef(1);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (roundState !== "player" || !isMyTurn) return;
      if (e.code === "Space" && !isCharging) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (roundState !== "player" || !isMyTurn) return;
      if (e.code === "Space" && isCharging) {
        setIsCharging(false);
        const frac = powerBars / SHOOTING_POWER_BARS;
        const speed = frac * BULLET_SPEED_FACTOR;
        const vx = Math.cos(turretAngle) * speed;
        const vy = Math.sin(turretAngle) * speed;
        const id = nextBulletId.current++;
        setBullets((bs) => [
          ...bs,
          { id, x: playerPos.x, y: playerPos.y, vx, vy },
        ]);
        setRoundState("bullet");
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [
    roundState,
    isCharging,
    powerBars,
    turretAngle,
    playerPos,
    isMyTurn,
    setRoundState,
  ]);

  useEffect(() => {
    if (roundState !== "player" || !isCharging || !isMyTurn) return;

    const id = window.setInterval(() => {
      setPowerBars((b) => Math.min(b + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);

    return () => clearInterval(id);
  }, [roundState, isCharging, isMyTurn]);

  return {
    powerBars,
    isCharging,
    bullets,
    setBullets,
    nextBulletId,
  };
};
