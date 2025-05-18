import { useState, useEffect, useRef, type Dispatch } from "react";
import {
  BULLET_GRAVITY,
  EXPLOSION_RADIUS,
  EXPLOSION_DAMAGE,
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
} from "@/config/gameConfig";
import { getEnvironmentBit, clearEnvironmentBit } from "@/lib/environmentUtils";
import { Turn, TurnUpdateSchema } from "@/gen/proto/game_pb";
import { create } from "@bufbuild/protobuf";
import type { BulletType } from "./useShooting";

interface UseBulletPhysicsProps {
  bullets: Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
  setBullets: Dispatch<React.SetStateAction<BulletType[]>>;
  bitmask: Uint8Array;
  setBitmask: (bitmask: Uint8Array) => void;
  health: number;
  setHealth: Dispatch<React.SetStateAction<number>>;
  playerPos: { x: number; y: number };
  roundState: "player" | "bullet" | "other";
  isHost: boolean;
  sendTurnUpdate: (update: any) => void;
  setCurrentTurn: () => void;
}

export const useBulletPhysics = ({
  bullets,
  setBullets,
  bitmask,
  setBitmask,
  health,
  setHealth,
  playerPos,
  roundState,
  isHost,
  sendTurnUpdate,
  setCurrentTurn,
}: UseBulletPhysicsProps) => {
  const [explosions, setExplosions] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
    }>
  >([]);
  const nextExplId = useRef(1);
  const explodedBullets = useRef<Set<number>>(new Set());

  const triggerExplosion = (bid: number, wx: number, wy: number) => {
    if (explodedBullets.current.has(bid)) return;
    explodedBullets.current.add(bid);

    const eid = nextExplId.current++;
    setExplosions((es) => [...es, { id: eid, x: wx, y: wy }]);
    setTimeout(() => {
      setExplosions((es) => es.filter((e) => e.id !== eid));
    }, 1000);

    const cx = Math.floor(wx),
      cy = Math.floor(wy);
    const newMask = Uint8Array.from(bitmask);
    for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
      for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
        if (dx * dx + dy * dy <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
          clearEnvironmentBit(newMask, cx + dx, cy + dy);
        }
      }
    }
    setBitmask(newMask);

    const dist2 = (playerPos.x - wx) ** 2 + (playerPos.y - wy) ** 2;
    if (dist2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
      setHealth((h) => Math.max(0, h - EXPLOSION_DAMAGE));
    }
  };

  useEffect(() => {
    if (roundState !== "bullet") return;

    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setBullets((list) =>
        list
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
          })
      );

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roundState, bitmask, triggerExplosion]);

  useEffect(() => {
    if (roundState === "bullet" && bullets.length === 0) {
      const newTurn = isHost ? Turn.GUEST : Turn.HOST;
      const update = create(TurnUpdateSchema, {
        bitMask: bitmask,
        turn: newTurn,
      });
      sendTurnUpdate(update);
      setCurrentTurn();
    }
  }, [roundState, bullets.length, bitmask, isHost, sendTurnUpdate]);

  return { explosions, triggerExplosion };
};
