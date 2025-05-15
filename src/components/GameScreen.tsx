import { useState, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  BLOCK_SIZE,
  PLAYER_SPEED,
  INITIAL_PLAYER_POS,
} from "@/config/gameConfig";
import { createInitialBitmask } from "@/lib/environmentUtils";
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
  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();

  const [environmentBitmask] = useState<Uint8Array>(createInitialBitmask);

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

  // Game loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      setPlayerPos((prev) => {
        let newX = prev.x;
        if (movingLeft) newX -= PLAYER_SPEED * deltaTime;
        if (movingRight) newX += PLAYER_SPEED * deltaTime;

        newX = Math.max(0, Math.min(newX, ENVIRONMENT_WIDTH - 1));
        return { ...prev, x: newX };
      });

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [movingLeft, movingRight]);

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
