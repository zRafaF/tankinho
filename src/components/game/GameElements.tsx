import { EXPLOSION_RADIUS } from "@/config/gameConfig";
import type { Bullet, Explosion } from "@/types/gameTypes";
import { Circle, Ellipse } from "react-konva";

// src/components/game/GameElements.tsx
export const Bullets = ({
  bullets,
  blockSize,
}: {
  bullets: Bullet[];
  blockSize: number;
}) => (
  <>
    {bullets.map((b) => (
      <Circle
        key={b.id}
        x={b.x * blockSize}
        y={b.y * blockSize}
        radius={blockSize * 0.2}
        fill="yellow"
      />
    ))}
  </>
);

export const Explosions = ({
  explosions,
  blockSize,
}: {
  explosions: Explosion[];
  blockSize: number;
}) => (
  <>
    {explosions.map((e) => (
      <Ellipse
        key={e.id}
        x={e.x * blockSize}
        y={e.y * blockSize}
        radiusX={EXPLOSION_RADIUS * blockSize}
        radiusY={EXPLOSION_RADIUS * blockSize}
        fill="rgba(255,165,0,0.5)"
      />
    ))}
  </>
);
