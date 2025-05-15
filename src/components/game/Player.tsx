import { Group, Rect, Text } from "react-konva";
import { useEffect, useRef, useState } from "react";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_GRAVITY,
  PLAYER_MAX_STEP_OVER,
  ENVIRONMENT_WIDTH,
} from "@/config/gameConfig";
import { isCollidingWithTerrain, canStepOver } from "@/lib/environmentUtils";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  blockSize: number;
  bitmask: Uint8Array;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export function Player({
  x,
  y,
  health,
  blockSize,
  bitmask,
  onPositionChange,
}: PlayerProps) {
  const positionRef = useRef({ x, y });
  const velocityRef = useRef({ x: 0, y: 0 });
  const [renderPosition, setRenderPosition] = useState({ x, y });

  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);

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

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const pos = positionRef.current;
      const vel = velocityRef.current;

      // Apply gravity
      vel.y += PLAYER_GRAVITY * deltaTime;

      // Horizontal input
      vel.x = 0;
      if (movingLeft) vel.x -= PLAYER_SPEED;
      if (movingRight) vel.x += PLAYER_SPEED;

      // Predict next position
      let newX = pos.x + vel.x * deltaTime;
      let newY = pos.y + vel.y * deltaTime;

      // === Horizontal movement and step-over logic ===
      if (vel.x !== 0) {
        const testX = newX;
        const collided = isCollidingWithTerrain(
          bitmask,
          testX,
          pos.y,
          PLAYER_WIDTH,
          PLAYER_HEIGHT
        );

        if (collided) {
          // Try step-over
          const stepResult = canStepOver(
            bitmask,
            testX,
            pos.y - PLAYER_HEIGHT / 2,
            PLAYER_WIDTH,
            PLAYER_MAX_STEP_OVER
          );
          if (stepResult.canStep && stepResult.newY) {
            newX = testX;
            newY = stepResult.newY;
            vel.y = 0;
          } else {
            // Block horizontal movement
            newX = pos.x;
          }
        }
      }

      // === Vertical movement (gravity & falling) ===
      const verticalCollision = isCollidingWithTerrain(
        bitmask,
        newX,
        newY,
        PLAYER_WIDTH,
        PLAYER_HEIGHT
      );

      if (verticalCollision) {
        if (vel.y > 0) {
          // Falling, snap to ground
          newY = Math.floor(newY + PLAYER_HEIGHT / 2) - PLAYER_HEIGHT / 2;
        }
        vel.y = 0;
      }

      // Clamp horizontal position
      newX = Math.max(
        PLAYER_WIDTH / 2,
        Math.min(newX, ENVIRONMENT_WIDTH - PLAYER_WIDTH / 2)
      );

      // Finalize position
      const finalPos = { x: newX, y: newY };
      positionRef.current = finalPos;

      // Update React state for rendering
      setRenderPosition(finalPos);
      onPositionChange(finalPos);

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bitmask, movingLeft, movingRight, onPositionChange]);

  // === RENDER ===
  const playerWidth = PLAYER_WIDTH * blockSize;
  const playerHeight = PLAYER_HEIGHT * blockSize;

  return (
    <Group x={renderPosition.x * blockSize} y={renderPosition.y * blockSize}>
      {/* Health bar */}
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
