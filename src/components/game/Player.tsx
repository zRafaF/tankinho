import { Group, Rect, Text } from "react-konva";
import { useEffect, useRef } from "react";
import React from "react";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_MAX_STEP_OVER,
  ENVIRONMENT_WIDTH,
} from "@/config/gameConfig";
import { getEnvironmentBit } from "@/lib/environmentUtils";
import { computeGroundY } from "@/lib/gameHelpers";

interface PlayerProps {
  x: number;
  y: number;
  health: number;
  bitmask: Uint8Array;
  blockSize: number;
  turretAngle: number;
  isTurnActive: boolean;
  isLocalPlayer: boolean;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

function PlayerInner({
  x,
  y,
  health,
  bitmask,
  blockSize,
  turretAngle,
  isTurnActive,
  isLocalPlayer,
  onPositionChange,
}: PlayerProps) {
  const posRef = useRef({ x, y });
  const [movingLeft, setMovingLeft] = React.useState(false);
  const [movingRight, setMovingRight] = React.useState(false);

  // Sync ref to prop updates
  useEffect(() => {
    posRef.current = { x, y };
  }, [x, y]);

  // Handle input for local player
  useEffect(() => {
    if (!isLocalPlayer) return;

    const down = (e: KeyboardEvent) => {
      if (!isTurnActive) return;
      if (e.key === "a") setMovingLeft(true);
      if (e.key === "d") setMovingRight(true);
    };
    const up = (e: KeyboardEvent) => {
      if (!isTurnActive) return;
      if (e.key === "a") setMovingLeft(false);
      if (e.key === "d") setMovingRight(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [isTurnActive, isLocalPlayer]);

  // Physics loop (movement + gravity or just gravity)
  useEffect(() => {
    if (!onPositionChange) return;

    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let { x: oldX, y: oldY } = posRef.current;
      let newX = oldX;

      // Local player movement
      if (isLocalPlayer && isTurnActive) {
        let vx = 0;
        if (movingLeft) vx -= PLAYER_SPEED;
        if (movingRight) vx += PLAYER_SPEED;
        newX = oldX + vx * dt;

        newX = Math.max(
          PLAYER_WIDTH / 2,
          Math.min(newX, ENVIRONMENT_WIDTH - PLAYER_WIDTH / 2)
        );

        const halfW = PLAYER_WIDTH / 2;
        const dir = vx > 0 ? 1 : vx < 0 ? -1 : 0;
        if (dir !== 0) {
          const aheadCol =
            dir > 0
              ? Math.floor(newX + halfW - 0.001)
              : Math.floor(newX - halfW + 0.001);
          const footRow = Math.floor(oldY + PLAYER_HEIGHT / 2);

          if (getEnvironmentBit(bitmask, aheadCol, footRow)) {
            let wallH = 1;
            while (
              wallH <= PLAYER_MAX_STEP_OVER &&
              getEnvironmentBit(bitmask, aheadCol, footRow - wallH)
            ) {
              wallH++;
            }
            if (wallH <= PLAYER_MAX_STEP_OVER) {
              oldY -= wallH;
            } else {
              newX = dir > 0 ? aheadCol - halfW : aheadCol + 1 + halfW;
            }
          }
        }
      }

      // Use the new computeGroundY function for gravity
      const newY = computeGroundY(newX, oldY, bitmask);

      const newPos = { x: newX, y: newY };
      if (newPos.x !== posRef.current.x || newPos.y !== posRef.current.y) {
        posRef.current = newPos;
        onPositionChange(newPos);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [
    movingLeft,
    movingRight,
    bitmask,
    isTurnActive,
    isLocalPlayer,
    onPositionChange,
  ]);

  const pw = PLAYER_WIDTH * blockSize;
  const ph = PLAYER_HEIGHT * blockSize;
  const turretLen = 1.5 * blockSize;
  const turretW = 0.3 * blockSize;

  return (
    <Group x={x * blockSize} y={y * blockSize}>
      <Group rotation={(turretAngle * 180) / Math.PI}>
        <Rect
          x={0}
          y={-turretW / 2}
          width={turretLen}
          height={turretW}
          fill="#777"
          cornerRadius={blockSize * 0.05}
        />
      </Group>
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
      <Rect
        x={-pw / 2}
        y={-ph / 2}
        width={pw}
        height={ph}
        fill={isLocalPlayer ? "#555" : "#7c3aed"}
        cornerRadius={blockSize * 0.1}
      />
    </Group>
  );
}

export const Player = React.memo(
  PlayerInner,
  (prev, next) =>
    prev.x === next.x &&
    prev.y === next.y &&
    prev.health === next.health &&
    prev.blockSize === next.blockSize &&
    prev.bitmask === next.bitmask &&
    prev.turretAngle === next.turretAngle &&
    prev.isTurnActive === next.isTurnActive &&
    prev.isLocalPlayer === next.isLocalPlayer &&
    prev.onPositionChange === next.onPositionChange
);
