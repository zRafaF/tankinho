import { Layer, Rect } from "react-konva";
import { getEnvironmentBit } from "@/lib/environmentUtils";
import { ENVIRONMENT_WIDTH, ENVIRONMENT_HEIGHT } from "@/config/gameConfig";
import React from "react";

interface EnvironmentProps {
  bitmask: Uint8Array;
  blockSize: number;
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
            // prints 1 every 10th block
            if (x % 50 === 0) {
              console.log("env render");
            }

            return (
              <Rect
                key={`${x}-${y}`}
                x={x * blockSize}
                y={y * blockSize}
                width={blockSize}
                height={blockSize}
                fill={x % 2 === 0 ? "#4a6b3f" : "#3a5530"}
                stroke="#2d3b27"
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
