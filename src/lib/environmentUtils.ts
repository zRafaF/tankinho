import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  TERRAIN_CONFIG,
} from "@/config/gameConfig";

export const BYTES_PER_ROW = Math.ceil(ENVIRONMENT_WIDTH / 8);

export function getEnvironmentBit(
  bitmask: Uint8Array,
  x: number,
  y: number
): boolean {
  if (x < 0 || x >= ENVIRONMENT_WIDTH || y < 0 || y >= ENVIRONMENT_HEIGHT)
    return false;

  const byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
  const bitPosition = 7 - (x % 8);
  return (bitmask[byteIndex] & (1 << bitPosition)) !== 0;
}

export function setEnvironmentBit(
  bitmask: Uint8Array,
  x: number,
  y: number
): void {
  if (x < 0 || x >= ENVIRONMENT_WIDTH || y < 0 || y >= ENVIRONMENT_HEIGHT)
    return;

  const byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
  const bitPosition = 7 - (x % 8);
  bitmask[byteIndex] |= 1 << bitPosition;
}

export function createTerrain(): Uint8Array {
  const buffer = new Uint8Array(ENVIRONMENT_HEIGHT * BYTES_PER_ROW);
  const { airRows, amplitude, frequency, flatBottomRows } = TERRAIN_CONFIG;

  // Generate sine wave terrain
  for (let x = 0; x < ENVIRONMENT_WIDTH; x++) {
    const waveHeight = Math.round(
      amplitude * Math.sin(x * frequency) +
        (ENVIRONMENT_HEIGHT - amplitude - flatBottomRows - airRows)
    );

    // Fill from waveHeight down to bottom (leaving airRows at top)
    for (let y = waveHeight + airRows; y < ENVIRONMENT_HEIGHT; y++) {
      setEnvironmentBit(buffer, x, y);
    }
  }

  // Ensure flat ground at the bottom
  for (let x = 0; x < ENVIRONMENT_WIDTH; x++) {
    for (
      let y = ENVIRONMENT_HEIGHT - flatBottomRows;
      y < ENVIRONMENT_HEIGHT;
      y++
    ) {
      setEnvironmentBit(buffer, x, y);
    }
  }

  return buffer;
}

// Helper function for collision detection
export function canStepOver(
  bitmask: Uint8Array,
  x: number,
  y: number,
  maxStep: number
): boolean {
  for (let step = 1; step <= maxStep; step++) {
    if (y + step >= ENVIRONMENT_HEIGHT) return true; // Bottom of world is always solid
    if (getEnvironmentBit(bitmask, Math.round(x), y + step)) return true;
  }
  return false;
}
