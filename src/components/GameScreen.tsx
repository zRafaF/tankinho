import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Circle, Ellipse } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  INITIAL_GUEST_POS,
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  TURN_TIME_SEC,
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
import { create } from "@bufbuild/protobuf";
import {
  BulletSchema,
  DynamicUpdateSchema,
  PlayerSchema,
  Turn,
  TurnUpdateSchema,
  Vec2Schema,
} from "@/gen/proto/game_pb";

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

export default function GameScreen({
  onExitGame,
  gameStarted,
}: {
  onExitGame: () => void;
  gameStarted: boolean;
}) {
  const [health, setHealth] = useState(100);
  const {
    roomCode,
    disconnectFromMatch,
    latestOpponentState,
    sendDynamicUpdate,
    sendTurnUpdate,
    currentTurn,
    setCurrentTurn,
    isHost,
    bitmask,
    setBitmask,
  } = useGameConnectionContext();
  const [playerPos, setPlayerPos] = useState(
    isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS
  );
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>("other");
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);

  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const nextBulletId = useRef(1);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const nextExplId = useRef(1);
  const explodedBullets = useRef<Set<number>>(new Set());

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const stageRef = useRef<any>(null);
  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  const isMyTurn = currentTurn === (isHost ? Turn.HOST : Turn.GUEST);

  const [opponentPos, setOpponentPos] = useState({ x: 0, y: 0 });
  const [opponentAngle, setOpponentAngle] = useState(0);
  const [opponentHealth, setOpponentHealth] = useState(100);

  // Initialize game start
  useEffect(() => {
    if (gameStarted && isHost) {
      setRoundState("player");
      setTurnTime(TURN_TIME_SEC);
      setCurrentTurn(Turn.HOST);
    }
  }, [gameStarted, isHost, setCurrentTurn]);

  // Sync opponent state
  useEffect(() => {
    if (!latestOpponentState) return;
    const opponentPlayer = isHost
      ? latestOpponentState.guestPlayer
      : latestOpponentState.hostPlayer;
    if (opponentPlayer) {
      setOpponentPos({
        x: opponentPlayer.position?.x ?? 0,
        y: opponentPlayer.position?.y ?? 0,
      });
      setOpponentAngle(opponentPlayer.aimAngle ?? 0);
      setOpponentHealth(opponentPlayer.health ?? 100);
    }
  }, [latestOpponentState, isHost]);

  // Dynamic updates
  const latestState = useRef({
    playerPos,
    turretAngle,
    bullets,
    health,
    turnTime,
    isHost,
  });

  useEffect(() => {
    latestState.current = {
      playerPos,
      turretAngle,
      bullets,
      health,
      turnTime,
      isHost,
    };
  }, [playerPos, turretAngle, bullets, health, turnTime, isHost]);

  const sendUpdate = () => {
    const { playerPos, turretAngle, bullets, health, turnTime, isHost } =
      latestState.current;

    const me = create(PlayerSchema, {
      position: create(Vec2Schema, { x: playerPos.x, y: playerPos.y }),
      velocity: create(Vec2Schema, { x: 0, y: 0 }),
      aimAngle: turretAngle,
      health,
      timeLeft: turnTime,
    });

    const bulletMessages = bullets.map((b) =>
      create(BulletSchema, {
        position: create(Vec2Schema, { x: b.x, y: b.y }),
        velocity: create(Vec2Schema, { x: b.vx, y: b.vy }),
      })
    );

    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : undefined,
      guestPlayer: !isHost ? me : undefined,
      bullets: bulletMessages,
      turn: currentTurn,
    });

    sendDynamicUpdate(dynamic);
  };

  useEffect(() => {
    if (!isMyTurn || roundState === "other") return;

    sendUpdate();
    const id = setInterval(sendUpdate, 300);
    return () => clearInterval(id);
  }, [isMyTurn, roundState, sendDynamicUpdate, currentTurn]);

  // Handle turn transitions when bullets are done
  useEffect(() => {
    if (roundState === "bullet" && bullets.length === 0) {
      sendUpdate();
      const newTurn = isHost ? Turn.GUEST : Turn.HOST;
      const update = create(TurnUpdateSchema, {
        bitMask: bitmask,
        turn: newTurn,
      });
      sendTurnUpdate(update);
      setCurrentTurn(newTurn);
      setRoundState("other");
    }
  }, [
    roundState,
    bullets.length,
    bitmask,
    isHost,
    sendTurnUpdate,
    setCurrentTurn,
  ]);

  // Handle incoming turn updates
  useEffect(() => {
    if (!latestOpponentState) return;

    const theirTurn = latestOpponentState.turn;
    if (theirTurn !== currentTurn) {
      setCurrentTurn(theirTurn);
      if (theirTurn === (isHost ? Turn.HOST : Turn.GUEST)) {
        setRoundState("player");
        setTurnTime(TURN_TIME_SEC);
        setPlayerPos(isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS);
      }
    }
  }, [latestOpponentState, currentTurn, isHost, setCurrentTurn]);

  // Turn timer
  useEffect(() => {
    if (roundState !== "player") return;

    let animationFrameId: number;
    let startTime = Date.now();

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = TURN_TIME_SEC - Math.floor(elapsed / 1000);

      if (remaining <= 0) {
        setTurnTime(0);
        setRoundState("other");
        return;
      }

      setTurnTime(remaining);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [roundState]);

  // Window resize handler
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mouse movement for aiming
  useEffect(() => {
    if (roundState !== "player" || !isMyTurn) return;
    const onMove = (e: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      setTurretAngle(Math.atan2(wy - playerPos.y, wx - playerPos.x));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [roundState, playerPos, blockSize, isMyTurn]);

  // Shooting controls
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (roundState !== "player" || !isMyTurn) return;
      if (e.code === "Space" && !isCharging) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (roundState !== "player" || !isMyTurn) return;
      if (e.code === "Space" && isCharging) {
        setIsCharging(false);
        const frac = powerBars / SHOOTING_POWER_BARS;
        const speed = frac * BULLET_SPEED_FACTOR;
        const vx = Math.cos(turretAngle) * speed;
        const vy = Math.sin(turretAngle) * speed;
        const id = nextBulletId.current++;
        setBullets((bs) => [
          ...bs,
          { id, x: playerPos.x, y: playerPos.y, vx, vy },
        ]);
        setRoundState("bullet");
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [roundState, isCharging, powerBars, turretAngle, playerPos, isMyTurn]);

  // Power charging
  useEffect(() => {
    if (roundState !== "player" || !isCharging || !isMyTurn) return;
    const id = window.setInterval(() => {
      setPowerBars((b) => Math.min(b + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roundState, isCharging, isMyTurn]);

  // Bullet physics
  useEffect(() => {
    if (roundState !== "bullet") return;
    let raf = 0;
    let last = performance.now();
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
            if (
              b.x < 0 ||
              b.x > ENVIRONMENT_WIDTH ||
              b.y < 0 ||
              b.y > ENVIRONMENT_HEIGHT
            ) {
              triggerExplosion(b.id, b.x, b.y);
              return false;
            }
            const tx = Math.floor(b.x),
              ty = Math.floor(b.y);
            if (getEnvironmentBit(bitmask, tx, ty)) {
              triggerExplosion(b.id, b.x, b.y);
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

  // Check for game over
  useEffect(() => {
    if (health <= 0) {
      const newTurn = isHost ? Turn.GUEST : Turn.HOST;
      const update = create(TurnUpdateSchema, {
        bitMask: bitmask,
        turn: newTurn,
      });
      sendTurnUpdate(update);
      setCurrentTurn(newTurn);
      setRoundState("other");
    }
  }, [health, bitmask, isHost, sendTurnUpdate, setCurrentTurn]);

  const triggerExplosion = (bid: number, wx: number, wy: number) => {
    if (explodedBullets.current.has(bid)) return;
    explodedBullets.current.add(bid);

    const eid = nextExplId.current++;
    setExplosions((es) => [...es, { id: eid, x: wx, y: wy }]);
    setTimeout(() => {
      setExplosions((es) => es.filter((e) => e.id !== eid));
    }, 1000);

    const cx = Math.floor(wx),
      cy = Math.floor(wy);
    const newMask = Uint8Array.from(bitmask);
    for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
      for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
        if (dx * dx + dy * dy <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
          clearEnvironmentBit(newMask, cx + dx, cy + dy);
        }
      }
    }
    setBitmask(newMask);

    const dist2 = (playerPos.x - wx) ** 2 + (playerPos.y - wy) ** 2;
    if (dist2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
      setHealth((h) => Math.max(0, h - EXPLOSION_DAMAGE));
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
            isTurnActive={roundState === "player" && isMyTurn}
            isLocalPlayer={true}
            onPositionChange={setPlayerPos}
          />
          <Player
            x={opponentPos.x}
            y={opponentPos.y}
            health={opponentHealth}
            bitmask={bitmask}
            blockSize={blockSize}
            turretAngle={opponentAngle}
            isTurnActive={false}
            isLocalPlayer={false}
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
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
