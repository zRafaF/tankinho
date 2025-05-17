import { Group, Rect, Text } from "react-konva";
import { useEffect, useRef } from "react";
import React from "react";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
} from "@/config/gameConfig";
import { getEnvironmentBit } from "@/lib/environmentUtils";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  bitmask: Uint8Array;
  blockSize: number;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

function PlayerInner({
  x,
  y,
  health,
  bitmask,
  blockSize,
  onPositionChange,
}: PlayerProps) {
  const positionRef = useRef({ x, y });
  const [movingLeft, setMovingLeft] = React.useState(false);
  const [movingRight, setMovingRight] = React.useState(false);

  // === Keyboard Input ===
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(true);
      if (e.key === "d") setMovingRight(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(false);
      if (e.key === "d") setMovingRight(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // === Movement + Snap to Ground ===
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let newX = positionRef.current.x;
      if (movingLeft) newX -= PLAYER_SPEED * dt;
      if (movingRight) newX += PLAYER_SPEED * dt;

      // Clamp X
      newX = Math.max(
        PLAYER_WIDTH / 2,
        Math.min(newX, ENVIRONMENT_WIDTH - PLAYER_WIDTH / 2)
      );

      // === Snap to ground ===
      const halfW = PLAYER_WIDTH / 2;
      const colStart = Math.floor(newX - halfW);
      const colEnd = Math.floor(newX + halfW - 0.001);

      let groundRow = ENVIRONMENT_HEIGHT;
      for (
        let row = Math.ceil(y + PLAYER_HEIGHT / 2);
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

      const newY = groundRow - PLAYER_HEIGHT / 2;

      const newPos = { x: newX, y: newY };
      if (
        newPos.x !== positionRef.current.x ||
        newPos.y !== positionRef.current.y
      ) {
        positionRef.current = newPos;
        onPositionChange(newPos);
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [movingLeft, movingRight, bitmask, y, onPositionChange]);

  // === Render ===
  console.log("Player render");

  const pw = PLAYER_WIDTH * blockSize;
  const ph = PLAYER_HEIGHT * blockSize;

  return (
    <Group x={x * blockSize} y={y * blockSize}>
      {/* Health Bar */}
      <Group y={-ph * 1.2}>
        <Rect
          x={-pw * 0.75}
          width={pw * 1.5}
          height={blockSize * 0.3}
          fill="#444"
          cornerRadius={blockSize * 0.1}
        />
        <Rect
          x={-pw * 0.75}
          width={(health / 100) * pw * 1.5}
          height={blockSize * 0.3}
          fill={health > 50 ? "#4ade80" : "#f87171"}
          cornerRadius={blockSize * 0.1}
        />
        <Text
          text={`${health}%`}
          x={-pw * 0.75}
          width={pw * 1.5}
          height={blockSize * 0.3}
          fontSize={blockSize * 0.25}
          align="center"
          verticalAlign="middle"
          fill="white"
        />
      </Group>

      {/* Player body */}
      <Rect
        x={-pw / 2}
        y={-ph / 2}
        width={pw}
        height={ph}
        fill="#555"
        cornerRadius={blockSize * 0.1}
      />
    </Group>
  );
}

// Custom memo to avoid re-rendering unless props really changed
export const Player = React.memo(
  PlayerInner,
  (prev, next) =>
    prev.x === next.x &&
    prev.y === next.y &&
    prev.health === next.health &&
    prev.blockSize === next.blockSize &&
    prev.bitmask === next.bitmask &&
    prev.onPositionChange === next.onPositionChange
);
