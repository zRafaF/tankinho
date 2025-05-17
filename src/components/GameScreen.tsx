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
import { createTerrain, getEnvironmentBit } from "@/lib/environmentUtils";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";

type RoundState = "player" | "bullet" | "other";

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  // --- Core state ---
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>("player");
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);

  // --- Charging & power ---
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  // --- Bullets ---
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const nextBulletId = useRef(1);

  // --- UI boilerplate ---
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const [bitmask] = useState<Uint8Array>(createTerrain);
  const stageRef = useRef<any>(null);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // — Resize handler —
  useEffect(() => {
    const onResize = () =>
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // — 1) Player-turn countdown —
  useEffect(() => {
    if (roundState !== "player") return;
    setTurnTime(TURN_TIME_SEC);
    const id = window.setInterval(() => {
      setTurnTime((t) => {
        if (t <= 1) {
          clearInterval(id);
          console.log("🔚 Player time up → handOverTurn()");
          setRoundState("other");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [roundState]);

  // — 2) Other-player “downtime” —
  useEffect(() => {
    if (roundState !== "other") return;
    const id = window.setTimeout(() => {
      console.log("🔁 Back to player turn");
      setRoundState("player");
    }, TURN_DELAY_MS);
    return () => clearTimeout(id);
  }, [roundState]);

  // — Mouse→turret (only in player phase) —
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

  // — Space: charge / shoot (only in player phase) —
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
        const frac = powerBars / SHOOTING_POWER_BARS;
        const speed = frac * BULLET_SPEED_FACTOR;
        const vx = Math.cos(turretAngle) * speed;
        const vy = Math.sin(turretAngle) * speed;
        const id = nextBulletId.current++;
        setBullets((bs) => [
          ...bs,
          {
            id,
            x: playerPos.x,
            y: playerPos.y,
            vx,
            vy,
          },
        ]);
        console.log(`🔫 Shot! power ${powerBars}/${SHOOTING_POWER_BARS}`);
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

  // — Charging bars every interval —
  useEffect(() => {
    if (roundState !== "player" || !isCharging) return;
    const id = window.setInterval(() => {
      setPowerBars((b) => Math.min(b + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roundState, isCharging]);

  // — Bullet physics & collision (only in bullet phase) —
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
            return {
              ...b,
              x: b.x + b.vx * dt,
              y: b.y + nvy * dt,
              vy: nvy,
            };
          })
          .filter((b) => {
            // out of bounds
            if (
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y < 0 ||
              b.y > ENVIRONMENT_HEIGHT
            ) {
              console.log(`💥 Bullet ${b.id} out of bounds → boom`);
              return false;
            }
            // terrain hit
            const tx = Math.floor(b.x),
              ty = Math.floor(b.y);
            if (getEnvironmentBit(bitmask, tx, ty)) {
              console.log(`💥 Bullet ${b.id} hit terrain → boom`);
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

  // — End bullet phase when no bullets left —
  useEffect(() => {
    if (roundState === "bullet" && bullets.length === 0) {
      console.log("🛑 Bullet phase over → handOverTurn()");
      setRoundState("other");
    }
  }, [roundState, bullets.length]);

  // — Exit handler —
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
            health={100}
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
