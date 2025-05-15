import { Group, Rect, Text } from "react-konva";
import { ENVIRONMENT_WIDTH } from "@/config/gameConfig";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  blockSize: number;
}

export function Player({ x, y, health, blockSize }: PlayerProps) {
  return (
    <Group x={x} y={y}>
      <Group x={-blockSize * 0.75} y={-blockSize * 1.5}>
        <Rect
          width={blockSize * 1.5}
          height={blockSize * 0.25}
          fill="#444"
          cornerRadius={Math.max(2, blockSize * 0.075)}
        />
        <Rect
          width={(health / 100) * blockSize * 1.5}
          height={blockSize * 0.25}
          fill={health > 50 ? "#4ade80" : "#f87171"}
          cornerRadius={Math.max(2, blockSize * 0.075)}
        />
        <Text
          text={`${health}%`}
          x={blockSize * 0.1}
          y={-blockSize * 0.05}
          fontSize={blockSize * 0.3}
          fill="white"
        />
      </Group>
      <Rect
        x={-blockSize / 2}
        y={-blockSize / 2}
        width={blockSize}
        height={blockSize}
        fill="#555"
        cornerRadius={Math.max(3, blockSize * 0.1)}
      />
    </Group>
  );
}
