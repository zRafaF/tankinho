export const ENVIRONMENT_WIDTH = 100;
export const ENVIRONMENT_HEIGHT = 30;
export const BASE_BLOCK_SIZE = 40; // Used for reference calculations
export const PLAYER_SPEED = 5; // in environment units per second
export const PLAYER_WIDTH = 1; // in environment units
export const PLAYER_HEIGHT = 1; // in environment units
export const PLAYER_GRAVITY = 9.8; // in environment units per second squared
export const PLAYER_MAX_STEP_OVER = 2; // max blocks player can step over
export const INITIAL_PLAYER_POS = { x: 20, y: 1 }; // in environment units (starting in air)
export const TERRAIN_CONFIG = {
  airRows: 20,
  amplitude: 3,
  frequency: 0.1,
};
// ——— Shooting settings ———
export const SHOOTING_POWER_BARS = 30;
export const SHOOTING_POWER_INTERVAL_MS = 50; // how often (ms) a bar fills

// ——— Turn settings ———
export const TURN_TIME_SEC = 20; // seconds per turn
export const TURN_DELAY_MS = 1000; // downtime between turns

export const BULLET_GRAVITY = 9.8; // environment units/sec²
export const BULLET_SPEED_FACTOR = 40; // scales powerBars → initial speed

export const EXPLOSION_RADIUS = 2; // in blocks
export const EXPLOSION_DAMAGE = 35; // health points
