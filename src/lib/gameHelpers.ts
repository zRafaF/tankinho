// src/lib/gameHelpers.ts
import {
  BULLET_GRAVITY,
  EXPLOSION_RADIUS,
  EXPLOSION_DAMAGE,
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from "@/config/gameConfig";
import { getEnvironmentBit, clearEnvironmentBit } from "@/lib/environmentUtils";
import type { Bullet } from "@/types/gameTypes";

export const calculateExplosionEffects = (
  bitmask: Uint8Array,
  playerPos: { x: number; y: number },
  wx: number,
  wy: number
) => {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  const newMask = Uint8Array.from(bitmask);

  for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
    for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
      if (dx * dx + dy * dy <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
        clearEnvironmentBit(newMask, cx + dx, cy + dy);
      }
    }
  }

  const dist2 = (playerPos.x - wx) ** 2 + (playerPos.y - wy) ** 2;
  const damage =
    dist2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS ? EXPLOSION_DAMAGE : 0;

  return { newBitmask: newMask, damage };
};

export const updateBulletPhysics = (
  bullets: Bullet[],
  bitmask: Uint8Array,
  dt: number,
  triggerExplosion: (bid: number, wx: number, wy: number) => void
) => {
  return bullets
    .map((b) => {
      const nvy = b.vy + BULLET_GRAVITY * dt;
      return { ...b, x: b.x + b.vx * dt, y: b.y + nvy * dt, vy: nvy };
    })
    .filter((b) => {
      if (
        b.x < 0 ||
        b.x > ENVIRONMENT_WIDTH ||
        b.y < 0 ||
        b.y > ENVIRONMENT_HEIGHT
      ) {
        triggerExplosion(b.id, b.x, b.y);
        return false;
      }
      const tx = Math.floor(b.x),
        ty = Math.floor(b.y);
      if (getEnvironmentBit(bitmask, tx, ty)) {
        triggerExplosion(b.id, b.x, b.y);
        return false;
      }
      return true;
    });
};

/**
 * Given an x-position and the current terrain bitmask,
 * returns the y so that the bottom of the tank
 * rests on the first occupied pixel below.
 */
export function computeGroundY(
  x: number,
  yStart: number,
  bitmask: Uint8Array
): number {
  const halfW = PLAYER_WIDTH / 2;
  const colStart = Math.floor(x - halfW);
  const colEnd = Math.floor(x + halfW - 0.001);

  let groundRow = ENVIRONMENT_HEIGHT;
  // scan from just below the tank's center downward
  for (
    let row = Math.ceil(yStart + PLAYER_HEIGHT / 2);
    row < ENVIRONMENT_HEIGHT;
    row++
  ) {
    if (
      getEnvironmentBit(bitmask, colStart, row) ||
      getEnvironmentBit(bitmask, colEnd, row)
    ) {
      groundRow = row;
      break;
    }
  }
  // return the y‐coordinate of the tank's center
  return groundRow - PLAYER_HEIGHT / 2;
}
