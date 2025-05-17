import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Circle } from "react-konva";
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
} from "@/config/gameConfig";
import { createTerrain } from "@/lib/environmentUtils";
import { getEnvironmentBit } from "@/lib/environmentUtils";
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

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  // --- Game & turn state ---
  const [health] = useState(100);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);
  const [isTurnActive, setIsTurnActive] = useState(false);

  // --- Shooting power state ---
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  // --- Bullets ---
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const nextBulletId = useRef(1);

  // --- Boilerplate UI state ---
  const [copied, setCopied] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const [environmentBitmask] = useState<Uint8Array>(createTerrain);
  const stageRef = useRef<any>(null);

  // — Resize handler —
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // — Start first turn —
  useEffect(() => {
    console.log("➡️ New turn started");
    setIsTurnActive(true);
    setTurnTime(TURN_TIME_SEC);
  }, []);

  // — Turn countdown & cycle —
  useEffect(() => {
    if (!isTurnActive) return;
    const timer = window.setInterval(() => {
      setTurnTime((t) => {
        if (t <= 1) {
          clearInterval(timer);
          console.log("⏹ End of turn");
          setIsTurnActive(false);
          // schedule next turn
          setTimeout(() => {
            console.log("🔁 Preparing next turn...");
            setIsTurnActive(true);
            setTurnTime(TURN_TIME_SEC);
          }, TURN_DELAY_MS);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTurnActive]);

  // — Global mouse → turret angle (only on-turn) —
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTurnActive) return;
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const worldX = mx / blockSize,
        worldY = my / blockSize;
      setTurretAngle(Math.atan2(worldY - playerPos.y, worldX - playerPos.x));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [blockSize, playerPos, isTurnActive]);

  // — Space: charge & shoot bullet (only on-turn) —
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isCharging && isTurnActive) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isCharging && isTurnActive) {
        setIsCharging(false);
        // compute initial bullet velocity
        const powerFraction = powerBars / SHOOTING_POWER_BARS;
        const speed = powerFraction * BULLET_SPEED_FACTOR;
        const vx = Math.cos(turretAngle) * speed;
        const vy = Math.sin(turretAngle) * speed;

        // spawn bullet at player center
        const id = nextBulletId.current++;
        setBullets((b) => [
          ...b,
          { id, x: playerPos.x, y: playerPos.y, vx, vy },
        ]);

        console.log(
          `🔫 Shot fired with power bars: ${powerBars}/${SHOOTING_POWER_BARS}`
        );
        console.log(
          `   → Bullet ${id} spawned, vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`
        );

        // end turn immediately
        setIsTurnActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isCharging, powerBars, isTurnActive, playerPos, turretAngle]);

  // — Charge bars every INTERVAL ms while holding Space —
  useEffect(() => {
    if (!isCharging || !isTurnActive) return;
    const id = window.setInterval(() => {
      setPowerBars((bars) => Math.min(bars + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isCharging, isTurnActive]);

  // — Bullet physics loop —
  useEffect(() => {
    let rafId: number;
    let last = performance.now();

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setBullets((list) =>
        list
          .map((b) => {
            // apply velocity + gravity
            const nvx = b.vx;
            const nvy = b.vy + BULLET_GRAVITY * dt;
            const nx = b.x + nvx * dt;
            const ny = b.y + nvy * dt;
            return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
          })
          .filter((b) => {
            // out of bounds?
            if (
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y > ENVIRONMENT_HEIGHT
            ) {
              console.log(`💥 Bullet ${b.id} boom (out of bounds)`);
              return false;
            }
            // hit ground?
            const tileX = Math.floor(b.x);
            const tileY = Math.floor(b.y);
            if (getEnvironmentBit(environmentBitmask, tileX, tileY)) {
              console.log(`💥 Bullet ${b.id} boom (hit ground)`);
              return false;
            }
            return true;
          })
      );

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [environmentBitmask]);

  // — Copy room code & exit handlers —
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <Environment bitmask={environmentBitmask} blockSize={blockSize} />
        <Layer>
          {/* Player */}
          <Player
            x={playerPos.x}
            y={playerPos.y}
            health={health}
            bitmask={environmentBitmask}
            blockSize={blockSize}
            turretAngle={turretAngle}
            isTurnActive={isTurnActive}
            onPositionChange={setPlayerPos}
          />

          {/* Bullets */}
          {bullets.map((b) => (
            <Circle
              key={b.id}
              x={b.x * blockSize}
              y={b.y * blockSize}
              radius={blockSize * 0.2}
              fill="yellow"
            />
          ))}
        </Layer>
      </Stage>

      {/* {console.log("PlayerPos:", playerPos, "Bullets:", bullets)} */}

      <GameUI
        roomCode={roomCode}
        copied={copied}
        onCopy={copyRoomCode}
        onExit={handleExit}
        powerBars={powerBars}
        isCharging={isCharging}
        turnTime={turnTime}
        isTurnActive={isTurnActive}
      />
    </div>
  );
}
