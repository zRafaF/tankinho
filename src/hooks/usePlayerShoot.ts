import { useEffect, useRef, useState } from "react";
import {
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  BULLET_SPEED_FACTOR,
} from "@/config/gameConfig";

export function usePlayerShoot(
  roundState: string,
  setRoundState: (s: any) => void,
  getTurretAngle: () => number,
  playerPos: { x: number; y: number }
) {
  const [bullets, setBullets] = useState<any[]>([]);
  const nextBulletId = useRef(1);
  const [powerBars, setPowerBars] = useState(1);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (roundState !== "player" || e.code !== "Space" || isCharging) return;
      setIsCharging(true);
      setPowerBars(1);
    };

    const onUp = (e: KeyboardEvent) => {
      if (roundState !== "player" || e.code !== "Space" || !isCharging) return;
      setIsCharging(false);
      const frac = powerBars / SHOOTING_POWER_BARS;
      const speed = frac * BULLET_SPEED_FACTOR;
      const angle = getTurretAngle();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const id = nextBulletId.current++;
      setBullets((bs) => [
        ...bs,
        { id, x: playerPos.x, y: playerPos.y, vx, vy },
      ]);
      setRoundState("bullet");
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
    getTurretAngle,
    playerPos,
    setRoundState,
  ]);

  useEffect(() => {
    if (roundState !== "player" || !isCharging) return;
    const interval = setInterval(() => {
      setPowerBars((b) => Math.min(b + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roundState, isCharging]);

  const clearBullets = () => setBullets([]);

  return {
    bullets,
    addBullet: setBullets,
    powerBars,
    isCharging,
    clearBullets,
  };
}
