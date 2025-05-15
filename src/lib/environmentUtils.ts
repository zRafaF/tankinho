import { ENVIRONMENT_WIDTH, ENVIRONMENT_HEIGHT } from "@/config/gameConfig";

export const BYTES_PER_ROW = Math.ceil(ENVIRONMENT_WIDTH / 8);

export function getEnvironmentBit(
  bitmask: Uint8Array,
  x: number,
  y: number
): boolean {
  if (x < 0 || x >= ENVIRONMENT_WIDTH || y < 0 || y >= ENVIRONMENT_HEIGHT)
    return false;

  const byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
  const bitPosition = 7 - (x % 8); // Using MSB first ordering
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

export function createInitialBitmask(): Uint8Array {
  const buffer = new Uint8Array(ENVIRONMENT_HEIGHT * BYTES_PER_ROW);

  // Fill bottom 3 rows
  for (let y = ENVIRONMENT_HEIGHT - 3; y < ENVIRONMENT_HEIGHT; y++) {
    for (let x = 0; x < ENVIRONMENT_WIDTH; x++) {
      setEnvironmentBit(buffer, x, y);
    }
  }
  return buffer;
}
