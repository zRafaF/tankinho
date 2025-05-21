export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
}

export type RoundState = "player" | "bullet" | "other";
