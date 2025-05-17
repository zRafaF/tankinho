import { useRef, useState } from "react";
import { clearEnvironmentBit } from "@/lib/environmentUtils";
import { EXPLOSION_RADIUS, EXPLOSION_DAMAGE } from "@/config/gameConfig";

export function useExplosions(
  bitmask: Uint8Array,
  setBitmask: any,
  playerPos: any,
  setHealth: any
) {
  const [explosions, setExplosions] = useState<any[]>([]);
  const explodedBullets = useRef<Set<number>>(new Set());
  const nextExplId = useRef(1);

  const triggerExplosion = (id: number, x: number, y: number) => {
    if (explodedBullets.current.has(id)) return;
    explodedBullets.current.add(id);
    const eid = nextExplId.current++;
    setExplosions((e) => [...e, { id: eid, x, y }]);
    setTimeout(() => {
      setExplosions((e) => e.filter((ex) => ex.id !== eid));
    }, 1000);

    const cx = Math.floor(x),
      cy = Math.floor(y);
    const newMask = Uint8Array.from(bitmask);
    for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
      for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
        if (dx * dx + dy * dy <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
          clearEnvironmentBit(newMask, cx + dx, cy + dy);
        }
      }
    }
    setBitmask(newMask);

    const dist2 = (playerPos.x - x) ** 2 + (playerPos.y - y) ** 2;
    if (dist2 <= EXPLOSION_RADIUS ** 2) {
      setHealth((h: number) => Math.max(0, h - EXPLOSION_DAMAGE));
    }
  };

  return { explosions, triggerExplosion };
}
