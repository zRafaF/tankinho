import { Layer, Rect } from "react-konva";
import { getEnvironmentBit } from "@/lib/environmentUtils";
import { ENVIRONMENT_WIDTH, ENVIRONMENT_HEIGHT } from "@/config/gameConfig";
import React from "react";

interface EnvironmentProps {
  bitmask: Uint8Array;
  blockSize: number;
}

// Color scheme variants
const colorSchemes = {
  variant3: {
    exposed: "#94d694", // soft green grass
    inside1: "#437a3b", // darker earth stripe
    inside2: "#35622f", // even darker earth stripe
    stroke: "#2a4b24",
  },
  dirtPath: {
    exposed: "#e2c290", // dry dirt top
    inside1: "#a67c52", // compact dirt 1
    inside2: "#8c6239", // compact dirt 2
    stroke: "#5c3b1e",
  },
  stoneLayer: {
    exposed: "#c2c2c2", // dusty rock top
    inside1: "#7f7f7f", // inner stone 1
    inside2: "#666666", // inner stone 2
    stroke: "#4d4d4d",
  },
  roadTiles: {
    exposed: "#b0b0a0", // paved surface
    inside1: "#6f6f64", // underlayer 1
    inside2: "#5a5a50", // underlayer 2
    stroke: "#3c3c36",
  },
  mudGrass: {
    exposed: "#a5d6a7", // wet grassy top
    inside1: "#6d4c41", // mud stripe 1
    inside2: "#5d4037", // mud stripe 2
    stroke: "#3e2723",
  },
};

// Choose a variant here
const activeScheme = colorSchemes.stoneLayer;

/**
 * Returns true if the block at (x, y) is exposed to air (i.e., at least one neighboring cell is empty or out of bounds).
 * Blocks on the left, right, and bottom edges are considered inside.
 */
function isExposed(bitmask: Uint8Array, x: number, y: number) {
  // Treat virtual -1 and width/height as filled to fix top edge corners
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];

  return neighbors.some(([nx, ny]) => {
    if (
      nx < 0 ||
      nx >= ENVIRONMENT_WIDTH ||
      ny < 0 ||
      ny >= ENVIRONMENT_HEIGHT
    ) {
      return false; // Out-of-bounds treated as filled block
    }
    return !getEnvironmentBit(bitmask, nx, ny);
  });
}

export const Environment = React.memo(function Environment({
  bitmask,
  blockSize,
}: EnvironmentProps) {
  return (
    <Layer>
      {Array.from({ length: ENVIRONMENT_HEIGHT }).map((_, y) =>
        Array.from({ length: ENVIRONMENT_WIDTH }).map((_, x) => {
          if (getEnvironmentBit(bitmask, x, y)) {
            const exposed = isExposed(bitmask, x, y);

            const fillColor = exposed
              ? activeScheme.exposed
              : x % 2 === 0
              ? activeScheme.inside1
              : activeScheme.inside2;

            return (
              <Rect
                key={`${x}-${y}`}
                x={x * blockSize}
                y={y * blockSize}
                width={blockSize}
                height={blockSize}
                fill={fillColor}
                stroke={activeScheme.stroke}
                strokeWidth={Math.max(1, blockSize / 20)}
              />
            );
          }
          return null;
        })
      )}
    </Layer>
  );
});
