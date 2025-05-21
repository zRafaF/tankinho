import { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  INITIAL_GUEST_POS,
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  TURN_TIME_SEC,
  BULLET_SPEED_FACTOR,
} from "@/config/gameConfig";
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
import type { Bullet, Explosion, RoundState } from "@/types/gameTypes";
import {
  calculateExplosionEffects,
  computeGroundY,
  updateBulletPhysics,
} from "@/lib/gameHelpers";
import { Bullets, Explosions } from "./game/GameElements";

export default function GameScreen({
  onExitGame,
  gameStarted,
}: {
  onExitGame: () => void;
  gameStarted: boolean;
}) {
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

  // Game state
  const [health, setHealth] = useState(100);
  const [playerPos, setPlayerPos] = useState(
    isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS
  );
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>("other");
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  // Game elements
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const nextBulletId = useRef(1);
  const nextExplId = useRef(1);
  const explodedBullets = useRef<Set<number>>(new Set());

  // Opponent state
  const [opponentPos, setOpponentPos] = useState(
    isHost ? INITIAL_GUEST_POS : INITIAL_PLAYER_POS
  );
  const [opponentAngle, setOpponentAngle] = useState(0);
  const [opponentHealth, setOpponentHealth] = useState(100);

  // UI state
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Refs and context
  const stageRef = useRef<any>(null);

  const latestState = useRef({
    playerPos,
    turretAngle,
    bullets,
    health,
    turnTime,
    isHost,
  });
  // Derived values
  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;
  const isMyTurn = currentTurn === (isHost ? Turn.HOST : Turn.GUEST);

  /* ===== Helper Functions ===== */

  const updateLatestState = useCallback(() => {
    latestState.current = {
      playerPos,
      turretAngle,
      bullets,
      health,
      turnTime,
      isHost,
    };
  }, [playerPos, turretAngle, bullets, health, turnTime, isHost]);

  const createPlayerSchema = useCallback(
    (pos: { x: number; y: number }, angle: number, health: number) => {
      return create(PlayerSchema, {
        position: create(Vec2Schema, { x: pos.x, y: pos.y }),
        velocity: create(Vec2Schema, { x: 0, y: 0 }),
        aimAngle: angle,
        health,
        timeLeft: turnTime,
      });
    },
    [turnTime]
  );

  const sendGameUpdate = useCallback(() => {
    const { playerPos, turretAngle, bullets, health } = latestState.current;

    const me = createPlayerSchema(playerPos, turretAngle, health);
    const opponent = latestOpponentState
      ? isHost
        ? latestOpponentState.guestPlayer
        : latestOpponentState.hostPlayer
      : undefined;

    const bulletMessages = bullets.map((b) =>
      create(BulletSchema, {
        position: create(Vec2Schema, { x: b.x, y: b.y }),
        velocity: create(Vec2Schema, { x: b.vx, y: b.vy }),
      })
    );

    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : opponent,
      guestPlayer: !isHost ? me : opponent,
      bullets: bulletMessages,
      turn: currentTurn,
    });

    sendDynamicUpdate(dynamic);
  }, [
    createPlayerSchema,
    currentTurn,
    isHost,
    latestOpponentState,
    sendDynamicUpdate,
  ]);

  const handleTurnTransition = useCallback(() => {
    const newTurn = isHost ? Turn.GUEST : Turn.HOST;
    const { playerPos, turretAngle, bullets, health } = latestState.current;

    // Send final dynamic update
    const me = createPlayerSchema(playerPos, turretAngle, health);
    const opponent = latestOpponentState
      ? isHost
        ? latestOpponentState.guestPlayer
        : latestOpponentState.hostPlayer
      : undefined;

    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : opponent,
      guestPlayer: !isHost ? me : opponent,
      bullets: bullets.map((b) =>
        create(BulletSchema, {
          position: create(Vec2Schema, { x: b.x, y: b.y }),
          velocity: create(Vec2Schema, { x: b.vx, y: b.vy }),
        })
      ),
      turn: newTurn,
    });
    sendDynamicUpdate(dynamic);

    // Send turn update
    const turnMsg = create(TurnUpdateSchema, {
      bitMask: bitmask,
      turn: newTurn,
    });
    sendTurnUpdate(turnMsg);

    // Update local state
    setCurrentTurn(newTurn);
    setRoundState("other");
  }, [
    bitmask,
    createPlayerSchema,
    isHost,
    latestOpponentState,
    sendDynamicUpdate,
    sendTurnUpdate,
    setCurrentTurn,
  ]);

  const triggerExplosion = useCallback(
    (bid: number, wx: number, wy: number) => {
      if (explodedBullets.current.has(bid)) return;
      explodedBullets.current.add(bid);

      // Add explosion effect
      const eid = nextExplId.current++;
      setExplosions((es) => [...es, { id: eid, x: wx, y: wy }]);
      setTimeout(() => {
        setExplosions((es) => es.filter((e) => e.id !== eid));
      }, 1000);

      // Calculate explosion damage and terrain destruction
      const { newBitmask, damage } = calculateExplosionEffects(
        bitmask,
        playerPos,
        wx,
        wy
      );
      setBitmask(newBitmask);
      if (damage > 0) setHealth((h) => Math.max(0, h - damage));
    },
    [bitmask, playerPos, setBitmask]
  );

  const handleShoot = useCallback(() => {
    if (roundState !== "player" || !isMyTurn) return;

    const frac = powerBars / SHOOTING_POWER_BARS;
    const speed = frac * BULLET_SPEED_FACTOR;
    const vx = Math.cos(turretAngle) * speed;
    const vy = Math.sin(turretAngle) * speed;
    const id = nextBulletId.current++;

    setBullets((bs) => [...bs, { id, x: playerPos.x, y: playerPos.y, vx, vy }]);
    setRoundState("bullet");
  }, [isMyTurn, playerPos, powerBars, roundState, turretAngle]);

  const handleExit = useCallback(() => {
    disconnectFromMatch();
    onExitGame();
  }, [disconnectFromMatch, onExitGame]);

  /* ===== Effect Hooks ===== */

  // Initialize game
  useEffect(() => {
    if (gameStarted) {
      setPlayerPos(isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS);
      setRoundState(isHost ? "player" : "other");
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

  // Keep latestState ref updated
  useEffect(() => {
    updateLatestState();
  }, [updateLatestState]);

  // Send periodic game updates during my turn
  useEffect(() => {
    if (!isMyTurn || roundState === "other") return;

    sendGameUpdate();
    const id = setInterval(sendGameUpdate, 1000);
    return () => clearInterval(id);
  }, [isMyTurn, roundState, sendGameUpdate]);

  // Handle turn transitions when bullets are done
  useEffect(() => {
    if (roundState !== "bullet" || bullets.length > 0) return;
    handleTurnTransition();
  }, [roundState, bullets.length, handleTurnTransition]);

  // Handle incoming turn updates
  useEffect(() => {
    if (!latestOpponentState) return;

    const theirTurn = latestOpponentState.turn;
    if (theirTurn !== currentTurn) {
      setCurrentTurn(theirTurn);
      if (theirTurn === (isHost ? Turn.HOST : Turn.GUEST)) {
        setRoundState("player");
        setTurnTime(TURN_TIME_SEC);
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
      if (roundState !== "player" || !isMyTurn || !isCharging) return;
      if (e.code === "Space") {
        setIsCharging(false);
        handleShoot();
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [roundState, isCharging, isMyTurn, handleShoot]);

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
        updateBulletPhysics(list, bitmask, dt, triggerExplosion)
      );
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roundState, bitmask, triggerExplosion]);

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

  // Keep the remote tank grounded
  useEffect(() => {
    setOpponentPos((op) => ({
      x: op.x,
      y: computeGroundY(op.x, op.y, bitmask),
    }));
  }, [opponentPos.x, opponentPos.y, bitmask]);

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
          <Bullets bullets={bullets} blockSize={blockSize} />
          <Explosions explosions={explosions} blockSize={blockSize} />
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
