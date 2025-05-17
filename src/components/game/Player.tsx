import { Group, Rect, Text } from "react-konva";
import { useEffect, useRef, useState } from "react";
import React from "react";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  ENVIRONMENT_WIDTH,
} from "@/config/gameConfig";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  bitmask: Uint8Array;
  blockSize: number;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export const Player = React.memo(function Player({
  x,
  y,
  health,
  bitmask,
  blockSize,
  onPositionChange,
}: PlayerProps) {
  console.log(2); // 🔁 Only prints when actual re-render happens

  const positionRef = useRef({ x, y });
  const renderPositionRef = useRef({ x, y });
  const [renderPosition, setRenderPosition] = useState({ x, y });

  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);

  // Keyboard input setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(true);
      if (e.key === "d") setMovingRight(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(false);
      if (e.key === "d") setMovingRight(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Movement and animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const pos = positionRef.current;

      // Movement calculation
      let velX = 0;
      if (movingLeft) velX -= PLAYER_SPEED;
      if (movingRight) velX += PLAYER_SPEED;

      let newX = pos.x + velX * deltaTime;
      const newY = pos.y;

      newX = Math.max(
        PLAYER_WIDTH / 2,
        Math.min(newX, ENVIRONMENT_WIDTH - PLAYER_WIDTH / 2)
      );

      const finalPos = { x: newX, y: newY };

      positionRef.current = finalPos;

      const prev = renderPositionRef.current;

      if (finalPos.x !== prev.x || finalPos.y !== prev.y) {
        renderPositionRef.current = finalPos;
        setRenderPosition(finalPos);
        onPositionChange(finalPos);
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [movingLeft, movingRight, onPositionChange]);

  // === Render ===
  const playerWidth = PLAYER_WIDTH * blockSize;
  const playerHeight = PLAYER_HEIGHT * blockSize;

  return (
    <Group x={renderPosition.x * blockSize} y={renderPosition.y * blockSize}>
      {/* Health Bar */}
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

      {/* Player Body */}
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
});
