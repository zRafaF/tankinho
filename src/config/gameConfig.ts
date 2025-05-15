export const ENVIRONMENT_WIDTH = 100;
export const ENVIRONMENT_HEIGHT = 20;
export const BASE_BLOCK_SIZE = 40; // Used for reference calculations
export const PLAYER_SPEED = 5; // in environment units per second
export const PLAYER_WIDTH = 1; // in environment units
export const PLAYER_HEIGHT = 1; // in environment units
export const PLAYER_GRAVITY = 9.8; // in environment units per second squared
export const PLAYER_MAX_STEP_OVER = 3; // max blocks player can step over
export const INITIAL_PLAYER_POS = { x: 50, y: 5 }; // in environment units (starting in air)
export const TERRAIN_CONFIG = {
  airRows: 2, // number of air rows above terrain
  amplitude: 3, // height of sine wave
  frequency: 0.1, // how many waves across the width
  flatBottomRows: 2, // number of flat rows at bottom
};
