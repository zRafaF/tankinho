import { useEffect, useState } from "react";
import {
  BULLET_GRAVITY,
  ENVIRONMENT_HEIGHT,
  ENVIRONMENT_WIDTH,
} from "@/config/gameConfig";
import { getEnvironmentBit } from "@/lib/environmentUtils";

export function useBulletPhysics(
  roundState: "player" | "bullet" | "other",
  bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number }>,
  bitmask: Uint8Array,
  setRoundState: (s: "player" | "bullet" | "other") => void
) {
  const [updatedBullets, setUpdatedBullets] = useState(bullets);

  useEffect(() => {
    if (roundState !== "bullet") return;
    setUpdatedBullets(bullets);

    let raf: number;
    let last = performance.now();

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setUpdatedBullets((curr) =>
        curr
          .map((b) => {
            const nvy = b.vy + BULLET_GRAVITY * dt;
            return {
              ...b,
              x: b.x + b.vx * dt,
              y: b.y + nvy * dt,
              vy: nvy,
            };
          })
          .filter((b) => {
            const outOfBounds =
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y < 0 ||
              b.y > ENVIRONMENT_HEIGHT;
            const tx = Math.floor(b.x),
              ty = Math.floor(b.y);
            const hitTerrain = getEnvironmentBit(bitmask, tx, ty);
            return !(outOfBounds || hitTerrain);
          })
      );

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roundState, bullets, bitmask]);

  useEffect(() => {
    if (roundState === "bullet" && updatedBullets.length === 0) {
      setRoundState("other");
    }
  }, [roundState, updatedBullets, setRoundState]);

  const handleBulletExplosion = (
    triggerExplosion: (id: number, x: number, y: number) => void
  ) => {
    updatedBullets.forEach((b) => {
      const outOfBounds =
        b.x < 0 ||
        b.x > ENVIRONMENT_WIDTH ||
        b.y < 0 ||
        b.y > ENVIRONMENT_HEIGHT;
      const tx = Math.floor(b.x),
        ty = Math.floor(b.y);
      const hitTerrain = getEnvironmentBit(bitmask, tx, ty);
      if (outOfBounds || hitTerrain) {
        triggerExplosion(b.id, b.x, b.y);
      }
    });
  };

  return { updatedBullets, handleBulletExplosion };
}
