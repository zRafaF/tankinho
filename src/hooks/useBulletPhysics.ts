import { useEffect, useState } from "react";
import {
  BULLET_GRAVITY,
  ENVIRONMENT_HEIGHT,
  ENVIRONMENT_WIDTH,
} from "@/config/gameConfig";
import { getEnvironmentBit } from "@/lib/environmentUtils";

export function useBulletPhysics(
  roundState: string,
  bullets: any[],
  bitmask: Uint8Array,
  setRoundState: any
) {
  const [updatedBullets, setUpdatedBullets] = useState(bullets);

  useEffect(() => {
    if (roundState !== "bullet") return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setUpdatedBullets((list) =>
        list
          .map((b) => {
            const nvy = b.vy + BULLET_GRAVITY * dt;
            return { ...b, x: b.x + b.vx * dt, y: b.y + nvy * dt, vy: nvy };
          })
          .filter(
            (b) =>
              b.x >= 0 &&
              b.x <= ENVIRONMENT_WIDTH &&
              b.y >= 0 &&
              b.y <= ENVIRONMENT_HEIGHT &&
              !getEnvironmentBit(bitmask, Math.floor(b.x), Math.floor(b.y))
          )
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roundState, bitmask]);

  useEffect(() => {
    if (roundState === "bullet" && updatedBullets.length === 0) {
      setRoundState("other");
    }
  }, [roundState, updatedBullets]);

  const handleBulletExplosion = (
    triggerExplosion: (id: number, x: number, y: number) => void
  ) => {
    bullets.forEach((b) => {
      if (
        b.x < 0 ||
        b.x > ENVIRONMENT_WIDTH ||
        b.y < 0 ||
        b.y > ENVIRONMENT_HEIGHT ||
        getEnvironmentBit(bitmask, Math.floor(b.x), Math.floor(b.y))
      ) {
        triggerExplosion(b.id, b.x, b.y);
      }
    });
  };

  return { updatedBullets, handleBulletExplosion };
}
