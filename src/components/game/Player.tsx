import { Group, Rect, Text } from "react-konva";
import { PLAYER_WIDTH, PLAYER_HEIGHT } from "@/config/gameConfig";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  blockSize: number;
}

export function Player({ x, y, health, blockSize }: PlayerProps) {
  const playerWidth = PLAYER_WIDTH * blockSize;
  const playerHeight = PLAYER_HEIGHT * blockSize;

  return (
    <Group x={x} y={y}>
      {/* Health bar positioned above player */}
      <Group x={-playerWidth * 0.75} y={-playerHeight * 1.5}>
        <Rect
          width={playerWidth * 1.5}
          height={playerHeight * 0.25}
          fill="#444"
          cornerRadius={Math.max(2, blockSize * 0.075)}
        />
        <Rect
          width={(health / 100) * playerWidth * 1.5}
          height={playerHeight * 0.25}
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

      {/* Player body */}
      <Rect
        x={-playerWidth / 2}
        y={-playerHeight / 2}
        width={playerWidth}
        height={playerHeight}
        fill="#555"
        cornerRadius={Math.max(3, blockSize * 0.1)}
      />
    </Group>
  );
}
