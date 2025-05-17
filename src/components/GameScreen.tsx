import { useState, useEffect, useRef } from "react";
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
import { createTerrain, getEnvironmentBit } from "@/lib/environmentUtils";
import { clearEnvironmentBit } from "@/lib/environmentUtils";
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

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  // --- State ---
  const [health, setHealth] = useState(100);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<"player" | "bullet" | "other">(
    "player"
  );
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);

  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const nextBulletId = useRef(1);

  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const nextExplId = useRef(1);

  // store bitmask in state so we can update it
  const [bitmask, setBitmask] = useState<Uint8Array>(() => createTerrain());

  // UI boilerplate
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const stageRef = useRef<any>(null);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // resize
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // player phase countdown
  useEffect(() => {
    if (roundState !== "player") return;
    setTurnTime(TURN_TIME_SEC);
    const id = window.setInterval(() => {
      setTurnTime((t) => {
        if (t <= 1) {
          clearInterval(id);
          console.log("🔚 Time up → handOverTurn()");
          setRoundState("other");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [roundState]);

  // other-player downtime
  useEffect(() => {
    if (roundState !== "other") return;
    const id = window.setTimeout(() => {
      console.log("🔁 Back to player turn");
      setRoundState("player");
    }, TURN_DELAY_MS);
    return () => clearTimeout(id);
  }, [roundState]);

  // mouse → turret
  useEffect(() => {
    if (roundState !== "player") return;
    const onMove = (e: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      setTurretAngle(Math.atan2(wy - playerPos.y, wx - playerPos.x));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [roundState, playerPos, blockSize]);

  // charge & shoot
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (roundState !== "player") return;
      if (e.code === "Space" && !isCharging) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (roundState !== "player") return;
      if (e.code === "Space" && isCharging) {
        setIsCharging(false);
        // fire bullet
        const frac = powerBars / SHOOTING_POWER_BARS;
        const speed = frac * BULLET_SPEED_FACTOR;
        const vx = Math.cos(turretAngle) * speed;
        const vy = Math.sin(turretAngle) * speed;
        const id = nextBulletId.current++;
        setBullets((bs) => [
          ...bs,
          { id, x: playerPos.x, y: playerPos.y, vx, vy },
        ]);
        console.log(`🔫 Fired! power ${powerBars}/${SHOOTING_POWER_BARS}`);
        setRoundState("bullet");
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [roundState, isCharging, powerBars, turretAngle, playerPos]);

  // charging interval
  useEffect(() => {
    if (roundState !== "player" || !isCharging) return;
    const id = window.setInterval(() => {
      setPowerBars((b) => Math.min(b + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roundState, isCharging]);

  // bullet physics & collision
  useEffect(() => {
    if (roundState !== "bullet") return;
    let raf = 0,
      last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setBullets((list) =>
        list
          .map((b) => {
            const nvy = b.vy + BULLET_GRAVITY * dt;
            return { ...b, x: b.x + b.vx * dt, y: b.y + nvy * dt, vy: nvy };
          })
          .filter((b) => {
            // OOB
            if (
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y < 0 ||
              b.y > ENVIRONMENT_HEIGHT
            ) {
              console.log(`💥 Bullet ${b.id} OOB`);
              return false;
            }
            const tx = Math.floor(b.x),
              ty = Math.floor(b.y);
            if (getEnvironmentBit(bitmask, tx, ty)) {
              // hit: explosion
              doExplosion(b.x, b.y);
              return false;
            }
            return true;
          })
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roundState, bitmask]);

  // end bullet phase
  useEffect(() => {
    if (roundState === "bullet" && bullets.length === 0) {
      console.log("🛑 Bullet over → handOverTurn()");
      setRoundState("other");
    }
  }, [roundState, bullets]);

  // explosion: terrain, damage, visual
  const doExplosion = (wx: number, wy: number) => {
    // 1) Visual
    const eid = nextExplId.current++;
    setExplosions((es) => [...es, { id: eid, x: wx, y: wy }]);
    setTimeout(() => {
      setExplosions((es) => es.filter((e) => e.id !== eid));
    }, 1000);

    // 2) Tile‐center of explosion
    const cx = Math.floor(wx);
    const cy = Math.floor(wy);

    // 3) Destroy terrain in a circle
    // Work on a *copy* so React re-renders Environment
    const newMask = Uint8Array.from(bitmask);
    for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
      for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
        if (dx * dx + dy * dy <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
          clearEnvironmentBit(newMask, cx + dx, cy + dy);
        }
      }
    }
    setBitmask(newMask);

    // 4) Damage player if within radius
    const dist2 = (playerPos.x - wx) ** 2 + (playerPos.y - wy) ** 2;
    if (dist2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
      setHealth((h) => {
        const nh = Math.max(0, h - EXPLOSION_DAMAGE);
        console.log(`💔 Player hit! health now ${nh}`);
        return nh;
      });
    }
  };

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
