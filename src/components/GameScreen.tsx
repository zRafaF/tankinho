import { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Circle, Ellipse } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  TURN_TIME_SEC,
  TURN_DELAY_MS,
  BULLET_GRAVITY,
  BULLET_SPEED_FACTOR,
  EXPLOSION_RADIUS,
  EXPLOSION_DAMAGE,
} from "@/config/gameConfig";
import {
  createTerrain,
  getEnvironmentBit,
  clearEnvironmentBit,
} from "@/lib/environmentUtils";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
}

type RoundState = "player" | "bullet" | "other";

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  // --- Core State ---
  const [health, setHealth] = useState(100);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>("player");
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);
  const [bitmask, setBitmask] = useState<Uint8Array>(() => createTerrain());
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  // --- Refs ---
  const nextBulletId = useRef(1);
  const nextExplosionId = useRef(1);
  const explodedBullets = useRef<Set<number>>(new Set());
  const stageRef = useRef<any>(null);
  const playerPosRef = useRef(playerPos);
  const bitmaskRef = useRef(bitmask);

  // --- UI Boilerplate ---
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // Update refs when state changes
  useEffect(() => {
    playerPosRef.current = playerPos;
    bitmaskRef.current = bitmask;
  }, [playerPos, bitmask]);

  // — Resize Handler —
  useEffect(() => {
    const onResize = () =>
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // — Turn Management —
  useTurnTimer(roundState, setRoundState, setTurnTime);

  // — Turret Angle —
  useTurretAngle(stageRef, blockSize, playerPos, roundState, setTurretAngle);

  // — Shooting Logic —
  const handleShoot = useCallback(() => {
    const frac = powerBars / SHOOTING_POWER_BARS;
    const speed = frac * BULLET_SPEED_FACTOR;
    const vx = Math.cos(turretAngle) * speed;
    const vy = Math.sin(turretAngle) * speed;

    setBullets((prev) => [
      ...prev,
      {
        id: nextBulletId.current++,
        x: playerPosRef.current.x,
        y: playerPosRef.current.y,
        vx,
        vy,
      },
    ]);
    setRoundState("bullet");
  }, [powerBars, turretAngle]);

  useShootingControls(
    roundState,
    isCharging,
    setIsCharging,
    setPowerBars,
    handleShoot
  );

  // — Bullet Physics —
  useBulletPhysics(
    roundState,
    bullets,
    setBullets,
    setRoundState,
    triggerExplosion
  );

  // — Explosion Handler —
  const triggerExplosion = useCallback(
    (bid: number, wx: number, wy: number) => {
      if (explodedBullets.current.has(bid)) return;
      explodedBullets.current.add(bid);

      // Visual effect
      const eid = nextExplosionId.current++;
      setExplosions((prev) => [...prev, { id: eid, x: wx, y: wy }]);
      setTimeout(() => {
        setExplosions((prev) => prev.filter((e) => e.id !== eid));
      }, 1000);

      // Terrain destruction
      setBitmask((prev) => {
        const newMask = new Uint8Array(prev);
        const cx = Math.floor(wx);
        const cy = Math.floor(wy);

        for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
          for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
            if (dx * dx + dy * dy <= EXPLOSION_RADIUS ** 2) {
              clearEnvironmentBit(newMask, cx + dx, cy + dy);
            }
          }
        }
        return newMask;
      });

      // Player damage
      const dist2 =
        (playerPosRef.current.x - wx) ** 2 + (playerPosRef.current.y - wy) ** 2;
      if (dist2 <= EXPLOSION_RADIUS ** 2) {
        setHealth((prev) => Math.max(0, prev - EXPLOSION_DAMAGE));
      }
    },
    []
  );

  // — Exit Handler —
  const handleExit = () => {
    disconnectFromMatch();
    onExitGame();
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={stageHeight}
        className="absolute top-1/2 left-0 transform -translate-y-1/2"
      >
        <Environment bitmask={bitmask} blockSize={blockSize} />
        <Layer>
          <Player
            x={playerPos.x}
            y={playerPos.y}
            health={health}
            bitmask={bitmask}
            blockSize={blockSize}
            turretAngle={turretAngle}
            isTurnActive={roundState === "player"}
            onPositionChange={setPlayerPos}
          />

          {bullets.map((b) => (
            <Circle
              key={b.id}
              x={b.x * blockSize}
              y={b.y * blockSize}
              radius={blockSize * 0.2}
              fill="yellow"
            />
          ))}

          {explosions.map((e) => (
            <Ellipse
              key={e.id}
              x={e.x * blockSize}
              y={e.y * blockSize}
              radiusX={EXPLOSION_RADIUS * blockSize}
              radiusY={EXPLOSION_RADIUS * blockSize}
              fill="rgba(255,165,0,0.5)"
            />
          ))}
        </Layer>
      </Stage>

      <GameUI
        roomCode={roomCode}
        onExit={handleExit}
        roundState={roundState}
        turnTime={turnTime}
        powerBars={powerBars}
        isCharging={isCharging}
      />
    </div>
  );
}

// Custom Hooks
function useTurnTimer(
  roundState: RoundState,
  setRoundState: (state: RoundState) => void,
  setTurnTime: (time: number) => void
) {
  useEffect(() => {
    if (roundState !== "player") return;
    setTurnTime(TURN_TIME_SEC);

    const id = setInterval(() => {
      setTurnTime((prev) => {
        if (prev <= 1) {
          setRoundState("other");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [roundState, setRoundState, setTurnTime]);

  useEffect(() => {
    if (roundState !== "other") return;
    const id = setTimeout(() => setRoundState("player"), TURN_DELAY_MS);
    return () => clearTimeout(id);
  }, [roundState, setRoundState]);
}

function useTurretAngle(
  stageRef: React.RefObject<any>,
  blockSize: number,
  playerPos: { x: number; y: number },
  roundState: RoundState,
  setTurretAngle: (angle: number) => void
) {
  useEffect(() => {
    if (roundState !== "player") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      setTurretAngle(Math.atan2(wy - playerPos.y, wx - playerPos.x));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [roundState, playerPos, blockSize, stageRef, setTurretAngle]);
}

function useShootingControls(
  roundState: RoundState,
  isCharging: boolean,
  setIsCharging: (charging: boolean) => void,
  setPowerBars: (bars: number) => void,
  handleShoot: () => void
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (roundState === "player" && e.code === "Space" && !isCharging) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (roundState === "player" && e.code === "Space" && isCharging) {
        setIsCharging(false);
        handleShoot();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [roundState, isCharging, setIsCharging, handleShoot, setPowerBars]);

  useEffect(() => {
    if (roundState !== "player" || !isCharging) return;
    const id = setInterval(() => {
      setPowerBars((prev) => Math.min(prev + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roundState, isCharging, setPowerBars]);
}

function useBulletPhysics(
  roundState: RoundState,
  bullets: Bullet[],
  setBullets: (bullets: Bullet[]) => void,
  setRoundState: (state: RoundState) => void,
  triggerExplosion: (id: number, x: number, y: number) => void
) {
  useEffect(() => {
    if (roundState !== "bullet") return;

    let rafId: number;
    let lastTime = performance.now();

    const updateBullets = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setBullets((prev) => {
        const updated = prev
          .map((b) => ({
            ...b,
            x: b.x + b.vx * dt,
            y: b.y + b.vy * dt,
            vy: b.vy + BULLET_GRAVITY * dt,
          }))
          .filter((b) => {
            const isOutOfBounds =
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y < 0 ||
              b.y > ENVIRONMENT_HEIGHT;
            const tx = Math.floor(b.x);
            const ty = Math.floor(b.y);
            const hitTerrain = getEnvironmentBit(bitmaskRef.current, tx, ty);

            if (isOutOfBounds || hitTerrain) {
              triggerExplosion(b.id, b.x, b.y);
              return false;
            }
            return true;
          });

        if (updated.length === 0) {
          setRoundState("other");
        }
        return updated;
      });

      rafId = requestAnimationFrame(updateBullets);
    };

    rafId = requestAnimationFrame(updateBullets);
    return () => cancelAnimationFrame(rafId);
  }, [roundState, setBullets, setRoundState, triggerExplosion]);
}
