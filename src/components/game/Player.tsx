import { Group, Rect, Text } from "react-konva";
import { useEffect, useRef } from "react";
import React from "react";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_MAX_STEP_OVER,
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
  turretAngle: number;
  isTurnActive: boolean;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

function PlayerInner({
  x,
  y,
  health,
  bitmask,
  blockSize,
  turretAngle,
  isTurnActive,
  onPositionChange,
}: PlayerProps) {
  const posRef = useRef({ x, y });
  const [movingLeft, setMovingLeft] = React.useState(false);
  const [movingRight, setMovingRight] = React.useState(false);

  useEffect(() => {
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
  }, [isTurnActive]);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (!isTurnActive) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let { x: oldX, y: oldY } = posRef.current;
      let vx = 0;
      if (movingLeft) vx -= PLAYER_SPEED;
      if (movingRight) vx += PLAYER_SPEED;
      let newX = oldX + vx * dt;

      newX = Math.max(
        PLAYER_WIDTH / 2,
        Math.min(newX, ENVIRONMENT_WIDTH - PLAYER_WIDTH / 2)
      );

      // — side collision & step-over —
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

      // — snap to ground —
      const colStart = Math.floor(newX - halfW);
      const colEnd = Math.floor(newX + halfW - 0.001);
      let groundRow = ENVIRONMENT_HEIGHT;
      for (
        let row = Math.ceil(oldY + PLAYER_HEIGHT / 2);
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
      if (newPos.x !== posRef.current.x || newPos.y !== posRef.current.y) {
        posRef.current = newPos;
        onPositionChange(newPos);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [movingLeft, movingRight, bitmask, isTurnActive, onPositionChange]);

  // — render —
  const pw = PLAYER_WIDTH * blockSize;
  const ph = PLAYER_HEIGHT * blockSize;
  const turretLen = 2 * blockSize;
  const turretW = 0.3 * blockSize;

  return (
    <Group x={x * blockSize} y={y * blockSize}>
      {/* Turret */}
      <Group rotation={(turretAngle * 180) / Math.PI}>
        <Rect
          x={0}
          y={-turretW / 2}
          width={turretLen}
          height={turretW}
          fill="#333"
          cornerRadius={blockSize * 0.05}
        />
      </Group>

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

      {/* Body */}
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
    prev.onPositionChange === next.onPositionChange
);
