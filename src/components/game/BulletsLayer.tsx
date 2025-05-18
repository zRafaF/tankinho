import { Circle } from "react-konva";

interface BulletsLayerProps {
  bullets: Array<{
    id: number;
    x: number;
    y: number;
  }>;
  blockSize: number;
}

export const BulletsLayer = ({ bullets, blockSize }: BulletsLayerProps) => (
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
