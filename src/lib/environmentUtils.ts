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
  const { airRows, amplitude, frequency } = TERRAIN_CONFIG;

  // Generate sine wave terrain starting after airRows
  for (let x = 0; x < ENVIRONMENT_WIDTH; x++) {
    const waveHeight =
      airRows + Math.round(amplitude * Math.sin(x * frequency));

    // Fill from waveHeight down to bottom
    for (let y = waveHeight; y < ENVIRONMENT_HEIGHT; y++) {
      setEnvironmentBit(buffer, x, y);
    }
  }

  return buffer;
}

export function isCollidingWithTerrain(
  bitmask: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const left = Math.floor(x - width / 2);
  const right = Math.floor(x + width / 2);
  const bottom = Math.floor(y + height / 2);

  // Check along the bottom edge
  for (let checkX = left; checkX <= right; checkX++) {
    if (getEnvironmentBit(bitmask, checkX, bottom)) {
      return true;
    }
  }
  return false;
}

export function canStepOver(
  bitmask: Uint8Array,
  x: number,
  y: number,
  width: number,
  maxStep: number
): { canStep: boolean; newY?: number } {
  const left = Math.floor(x - width / 2);
  const right = Math.floor(x + width / 2);
  const bottom = Math.floor(y);

  // Check if there's ground within maxStep below
  for (let step = 1; step <= maxStep; step++) {
    for (let checkX = left; checkX <= right; checkX++) {
      if (getEnvironmentBit(bitmask, checkX, bottom + step)) {
        return { canStep: true, newY: bottom + step - 0.5 }; // Position player on top
      }
    }
  }
  return { canStep: false };
}

export function clearEnvironmentBit(bitmask: Uint8Array, x: number, y: number) {
  if (x < 0 || x >= ENVIRONMENT_WIDTH || y < 0 || y >= ENVIRONMENT_HEIGHT)
    return;
  const byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
  const bitPosition = 7 - (x % 8);
  bitmask[byteIndex] &= ~(1 << bitPosition);
}
