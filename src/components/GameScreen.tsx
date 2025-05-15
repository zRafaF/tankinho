import { useState, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  BASE_BLOCK_SIZE,
  PLAYER_SPEED,
  PLAYER_GRAVITY,
  PLAYER_MAX_STEP_OVER,
  INITIAL_PLAYER_POS,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from "@/config/gameConfig";
import {
  createTerrain,
  canStepOver,
  getEnvironmentBit,
} from "@/lib/environmentUtils";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";

interface GameScreenProps {
  onExitGame: () => void;
}

export default function GameScreen({ onExitGame }: GameScreenProps) {
  const [health] = useState(100);
  const [copied, setCopied] = useState(false);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [playerVelocity, setPlayerVelocity] = useState({ x: 0, y: 0 });
  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();

  const [environmentBitmask] = useState<Uint8Array>(createTerrain);

  // Full-width responsive scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(true);
      if (e.key === "d") setMovingRight(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a") setMovingLeft(false);
      if (e.key === "d") setMovingRight(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Game loop with physics
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      setPlayerPos((prev) => {
        setPlayerVelocity((vel) => {
          // Apply gravity
          let newVelY = vel.y + PLAYER_GRAVITY * deltaTime;

          // Horizontal movement
          let newVelX = 0;
          if (movingLeft) newVelX = -PLAYER_SPEED;
          if (movingRight) newVelX = PLAYER_SPEED;

          return { x: newVelX, y: newVelY };
        });

        const newPos = {
          x: prev.x + playerVelocity.x * deltaTime,
          y: prev.y + playerVelocity.y * deltaTime,
        };

        // Keep within horizontal bounds
        newPos.x = Math.max(0, Math.min(newPos.x, ENVIRONMENT_WIDTH - 1));

        // Collision detection with terrain
        const playerBottom = Math.floor(newPos.y + PLAYER_HEIGHT / 2);
        const playerLeft = Math.floor(newPos.x - PLAYER_WIDTH / 2);
        const playerRight = Math.floor(newPos.x + PLAYER_WIDTH / 2);

        // Check if we hit ground
        let onGround = false;
        for (let x = playerLeft; x <= playerRight; x++) {
          if (getEnvironmentBit(environmentBitmask, x, playerBottom + 1)) {
            onGround = true;
            break;
          }
        }

        // If moving horizontally, check step height
        if (playerVelocity.x !== 0 && !onGround) {
          const stepCheckY = playerBottom + 1;
          const canStep = canStepOver(
            environmentBitmask,
            newPos.x,
            stepCheckY,
            PLAYER_MAX_STEP_OVER
          );

          if (!canStep) {
            newPos.x = prev.x; // Block horizontal movement
          }
        }

        // If on ground, stop vertical movement
        if (onGround) {
          newPos.y = playerBottom - PLAYER_HEIGHT / 2;
          setPlayerVelocity((vel) => ({ ...vel, y: 0 }));
        }

        return newPos;
      });

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [movingLeft, movingRight, playerVelocity, environmentBitmask]);

  // Calculate responsive scaling
  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // Convert player position to screen space
  const screenX = playerPos.x * blockSize;
  const screenY = playerPos.y * blockSize;

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
        width={windowSize.width}
        height={stageHeight}
        className="absolute top-1/2 left-0 transform -translate-y-1/2"
      >
        <Environment bitmask={environmentBitmask} blockSize={blockSize} />
        <Layer>
          <Player
            x={screenX}
            y={screenY}
            health={health}
            blockSize={blockSize}
          />
        </Layer>
      </Stage>

      <GameUI
        roomCode={roomCode}
        copied={copied}
        onCopy={copyRoomCode}
        onExit={handleExit}
      />
    </div>
  );
}
