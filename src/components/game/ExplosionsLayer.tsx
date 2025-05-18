import { Ellipse } from "react-konva";
import { EXPLOSION_RADIUS } from "@/config/gameConfig";

interface ExplosionsLayerProps {
  explosions: Array<{
    id: number;
    x: number;
    y: number;
  }>;
  blockSize: number;
}

export const ExplosionsLayer = ({
  explosions,
  blockSize,
}: ExplosionsLayerProps) => (
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
