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
  DYNAMIC_UPDATE_INTERVAL_MS,
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
import type {
  Bullet,
  Explosion,
  GameOverState,
  RoundState,
} from "@/types/gameTypes";
import {
  calculateExplosionEffects,
  computeGroundY,
  updateBulletPhysics,
} from "@/lib/gameHelpers";
import { Bullets, Explosions } from "./game/GameElements";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [opponentPos, setOpponentPos] = useState(
    isHost ? INITIAL_GUEST_POS : INITIAL_PLAYER_POS
  );
  const [opponentAngle, setOpponentAngle] = useState(0);
  const [opponentHealth, setOpponentHealth] = useState(100);

  const [gameOver, setGameOver] = useState<GameOverState>({
    isGameOver: false,
    isWinner: false,
  });

  // Initialize game start
  useEffect(() => {
    if (gameStarted) {
      setPlayerPos(isHost ? INITIAL_PLAYER_POS : INITIAL_GUEST_POS);
      setRoundState(isHost ? "player" : "other");
      setTurnTime(TURN_TIME_SEC);
      setCurrentTurn(Turn.HOST); // always start with host
    }
  }, [gameStarted]);

  useEffect(() => {
    const bottomLimit = ENVIRONMENT_HEIGHT - 1;
    if (playerPos.y >= bottomLimit) {
      setHealth(0);
    }
  }, [playerPos]);

  useEffect(() => {
    const bottomLimit = ENVIRONMENT_HEIGHT - 1;
    if (opponentPos.y >= bottomLimit) {
      setOpponentHealth(0);
    }
  }, [opponentPos]);
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

  useEffect(() => {
    if (!latestOpponentState?.bullets) {
      setBullets([]);
      return;
    }
    const obs: Bullet[] = latestOpponentState.bullets.map((b, idx) => ({
      id: idx,
      x: b.position?.x ?? 0,
      y: b.position?.y ?? 0,
      vx: b.velocity?.x ?? 0,
      vy: b.velocity?.y ?? 0,
    }));
    setBullets(obs);
  }, [latestOpponentState]);

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

    const opponent = latestOpponentState
      ? isHost
        ? latestOpponentState.guestPlayer
        : latestOpponentState.hostPlayer
      : undefined;

    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : opponent,
      guestPlayer: !isHost ? me : opponent,
      bullets: bulletMessages,
      turn: currentTurn,
    });

    sendDynamicUpdate(dynamic);
  };

  const endTurn = (
    newBitmask: Uint8Array,
    newBullets: Bullet[],
    myHealth: number,
    opponentsHealth: number
  ) => {
    const newTurn = isHost ? Turn.GUEST : Turn.HOST;

    // marshal “me”
    const { playerPos, turretAngle, turnTime } = latestState.current;
    const me = create(PlayerSchema, {
      position: create(Vec2Schema, { x: playerPos.x, y: playerPos.y }),
      velocity: create(Vec2Schema, { x: 0, y: 0 }),
      aimAngle: turretAngle,
      health: myHealth,
      timeLeft: turnTime,
    });

    const opponent = latestOpponentState
      ? isHost
        ? latestOpponentState.guestPlayer
        : latestOpponentState.hostPlayer
      : undefined;

    if (opponent) {
      opponent.health = opponentsHealth;
    }

    // 1) send final DynamicUpdate
    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : opponent,
      guestPlayer: !isHost ? me : opponent,
      bullets: newBullets.map((b) =>
        create(BulletSchema, {
          position: create(Vec2Schema, { x: b.x, y: b.y }),
          velocity: create(Vec2Schema, { x: b.vx, y: b.vy }),
        })
      ),
      turn: newTurn,
    });

    // 2) send TurnUpdate using the latest bitmaskRef
    const turnMsg = create(TurnUpdateSchema, {
      bitMask: newBitmask,
      dynamicUpdate: dynamic,
    });
    sendTurnUpdate(turnMsg);

    // 3) switch locally
    setCurrentTurn(newTurn);
    setRoundState("other");
  };

  const skipTurn = useCallback(() => {
    if (roundState !== "player" || !isMyTurn) return;
    const { playerPos, turretAngle, bullets, health, turnTime } =
      latestState.current;
    const me = create(PlayerSchema, {
      position: create(Vec2Schema, { x: playerPos.x, y: playerPos.y }),
      velocity: create(Vec2Schema, { x: 0, y: 0 }),
      aimAngle: turretAngle,
      health,
      timeLeft: turnTime,
    });
    const opponent = latestOpponentState
      ? isHost
        ? latestOpponentState.guestPlayer
        : latestOpponentState.hostPlayer
      : undefined;
    if (opponent) {
      opponent.health = opponentHealth;
    }

    const dynamic = create(DynamicUpdateSchema, {
      hostPlayer: isHost ? me : opponent,
      guestPlayer: !isHost ? me : opponent,
      bullets: bullets.map((b) =>
        create(BulletSchema, {
          position: create(Vec2Schema, { x: b.x, y: b.y }),
          velocity: create(Vec2Schema, { x: b.vx, y: b.vy }),
        })
      ),
      turn: isHost ? Turn.GUEST : Turn.HOST,
    });

    const turnMsg = create(TurnUpdateSchema, {
      bitMask: bitmask,
      dynamicUpdate: dynamic,
    });
    sendTurnUpdate(turnMsg);
    setCurrentTurn(isHost ? Turn.GUEST : Turn.HOST);
    setRoundState("other");
  }, [
    roundState,
    isMyTurn,
    latestState,
    latestOpponentState,
    isHost,
    bitmask,
    opponentHealth,
    sendTurnUpdate,
    setCurrentTurn,
  ]);

  useEffect(() => {
    if (!isMyTurn || roundState === "other") return;

    sendUpdate();
    const id = setInterval(sendUpdate, DYNAMIC_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isMyTurn, roundState, sendDynamicUpdate, currentTurn]);

  // Handle incoming turn updates
  useEffect(() => {
    if (!latestOpponentState) return;

    // Always update the opponent state
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

    setHealth(
      isHost
        ? latestOpponentState.hostPlayer?.health ?? 100
        : latestOpponentState.guestPlayer?.health ?? 100
    );

    // Only update turn state if this is a turnUpdate (not dynamicUpdate)
    if (
      latestOpponentState.turn !== undefined &&
      latestOpponentState.turn !== currentTurn
    ) {
      if (latestOpponentState.turn === (isHost ? Turn.HOST : Turn.GUEST)) {
        setRoundState("player");
        setTurnTime(TURN_TIME_SEC);
      } else {
        setRoundState("other");
      }
    }
  }, [latestOpponentState, isHost]);

  // Turn timer (now truly counts down and ends your turn)
  useEffect(() => {
    if (roundState !== "player" || !gameStarted) return;

    let animationFrameId: number;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = TURN_TIME_SEC - Math.floor(elapsed / 1000);
      const { bullets: pBullets } = latestState.current;
      if (remaining <= 0) {
        setTurnTime(0);
        endTurn(bitmask, pBullets, health, opponentHealth);
        return;
      }

      setTurnTime(remaining);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [roundState, gameStarted]);

  // Mouse movement for aiming
  useEffect(() => {
    if (roundState !== "player" || !isMyTurn || !gameStarted) return;

    const stage = stageRef.current;
    if (!stage) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = stage.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      setTurretAngle(Math.atan2(wy - playerPos.y, wx - playerPos.x));
    };

    // Add event listener to the stage container instead of window
    const container = stage.container();
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [roundState, playerPos, blockSize, isMyTurn, gameStarted]);

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

  // clean up when game over occurs
  useEffect(() => {
    if (!gameOver.isGameOver) return;

    // Clear any pending intervals or animations
    return () => {
      // This will run when component unmounts or when gameOver changes
      // No need to manually clean up as React will handle it
    };
  }, [gameOver.isGameOver]);

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
  }, [roundState, bitmask]);

  // Check for game over
  useEffect(() => {
    if ((health <= 0 || opponentHealth <= 0) && !gameOver.isGameOver) {
      const isWinner = opponentHealth <= 0;
      setGameOver({
        isGameOver: true,
        isWinner,
      });

      // Send final update (only if not already game over)
      const newTurn = isHost ? Turn.GUEST : Turn.HOST;
      const { playerPos, turretAngle, bullets, health, turnTime } =
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

      const opponent = latestOpponentState
        ? isHost
          ? latestOpponentState.guestPlayer
          : latestOpponentState.hostPlayer
        : undefined;

      const dynamic = create(DynamicUpdateSchema, {
        hostPlayer: isHost ? me : opponent,
        guestPlayer: !isHost ? me : opponent,
        bullets: bulletMessages,
        turn: newTurn,
      });

      const update = create(TurnUpdateSchema, {
        bitMask: bitmask,
        dynamicUpdate: dynamic,
      });
      sendTurnUpdate(update);
      setCurrentTurn(newTurn);
      setRoundState("other");
    }
  }, [
    health,
    opponentHealth,
    bitmask,
    isHost,
    sendTurnUpdate,
    setCurrentTurn,
    gameOver.isGameOver,
  ]);

  // Add this resize handler effect
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const triggerExplosion = (bid: number, wx: number, wy: number) => {
    if (explodedBullets.current.has(bid)) return;
    explodedBullets.current.add(bid);

    const eid = nextExplId.current++;
    setExplosions((es) => [...es, { id: eid, x: wx, y: wy }]);
    setTimeout(() => {
      setExplosions((es) => es.filter((e) => e.id !== eid));
    }, 1000);

    const { newBitmask, damage } = calculateExplosionEffects(
      bitmask,
      playerPos,
      wx,
      wy
    );

    // Calculate damage to opponent
    const { damage: opponentDamage } = calculateExplosionEffects(
      bitmask,
      opponentPos,
      wx,
      wy
    );

    setBitmask(newBitmask);

    const newBullets = bullets.filter((b) => b.id !== bid);

    setBullets(newBullets);
    const myNewHealth = Math.max(0, health - damage);
    const myNewOpponentHealth = Math.max(0, opponentHealth - opponentDamage);

    if (damage > 0) setHealth(myNewHealth);
    if (opponentDamage > 0) {
      setOpponentHealth(myNewOpponentHealth);
      console.log("Opponent took damage:", opponentDamage);
    }

    endTurn(newBitmask, newBullets, myNewHealth, myNewOpponentHealth); // send updates, swap turns
  };

  const handleExit = () => {
    disconnectFromMatch();
    onExitGame();
  };

  useEffect(() => {
    const myId = isHost ? Turn.HOST : Turn.GUEST;
    if (currentTurn === myId) {
      setRoundState("player");
      setTurnTime(TURN_TIME_SEC);
    }
  }, [currentTurn]);

  useEffect(() => {
    // keep the remote tank grounded at all times
    setOpponentPos((op) => ({
      x: op.x,
      y: computeGroundY(op.x, op.y, bitmask),
    }));
  }, [opponentPos.x, opponentPos.y, bitmask]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {gameOver.isGameOver && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-800/90 rounded-xl border border-purple-500/30">
            <h2 className="text-4xl font-bold mb-4">
              {gameOver.isWinner ? "You Won!" : "You Lost!"}
            </h2>
            <p
              className={cn(
                "text-xl mb-6",
                gameOver.isWinner ? "text-green-400" : "text-red-400"
              )}
            >
              {gameOver.isWinner
                ? "Congratulations!"
                : "Better luck next time!"}
            </p>
            <Button
              onClick={() => {
                disconnectFromMatch();
                onExitGame();
              }}
              variant="outline"
              size="lg"
              className="bg-black/50 border-red-500/30 hover:bg-red-900/30 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Menu
            </Button>
          </div>
        </div>
      )}
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={stageHeight}
        className="absolute top-1/2 left-0 transform -translate-y-1/2 border-y"
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
          <Bullets bullets={[...bullets]} blockSize={blockSize} />
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
        onSkipTurn={skipTurn}
      />
    </div>
  );
}
