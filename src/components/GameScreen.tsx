import { useState, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle } from "lucide-react";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  BLOCK_SIZE,
  PLAYER_SPEED,
  INITIAL_PLAYER_POS,
} from "@/config/gameConfig";
import {
  getEnvironmentBit,
  createInitialBitmask,
} from "@/lib/environmentUtils";

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

  // Responsive handling
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

  // Calculate responsive block size
  const scale = Math.min(
    windowSize.width / (ENVIRONMENT_WIDTH * BLOCK_SIZE),
    windowSize.height / (ENVIRONMENT_HEIGHT * BLOCK_SIZE)
  );
  const scaledBlockSize = BLOCK_SIZE * scale;

  // Convert player position to screen space
  const screenX = playerPos.x * scaledBlockSize;
  const screenY = playerPos.y * scaledBlockSize;

  // Generate environment blocks
  const environmentBlocks = [];
  for (let y = 0; y < ENVIRONMENT_HEIGHT; y++) {
    for (let x = 0; x < ENVIRONMENT_WIDTH; x++) {
      if (getEnvironmentBit(environmentBitmask, x, y)) {
        environmentBlocks.push(
          <Rect
            key={`${x}-${y}`}
            x={x * scaledBlockSize}
            y={y * scaledBlockSize}
            width={scaledBlockSize}
            height={scaledBlockSize}
            fill={x % 2 === 0 ? "#4a6b3f" : "#3a5530"}
            stroke="#2d3b27"
            strokeWidth={2 * scale}
          />
        );
      }
    }
  }

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
    <div className="relative w-full h-screen bg-gray-900">
      <Stage
        width={ENVIRONMENT_WIDTH * scaledBlockSize}
        height={ENVIRONMENT_HEIGHT * scaledBlockSize}
        className="absolute inset-0"
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {environmentBlocks}

          {/* Player */}
          <Group x={screenX} y={screenY}>
            {/* Health bar */}
            <Group x={-scaledBlockSize * 0.75} y={-scaledBlockSize * 1.5}>
              <Rect
                width={scaledBlockSize * 1.5}
                height={scaledBlockSize * 0.25}
                fill="#444"
                cornerRadius={3 * scale}
              />
              <Rect
                width={(health / 100) * scaledBlockSize * 1.5}
                height={scaledBlockSize * 0.25}
                fill={health > 50 ? "#4ade80" : "#f87171"}
                cornerRadius={3 * scale}
              />
              <Text
                text={`${health}%`}
                x={4 * scale}
                y={-2 * scale}
                fontSize={scaledBlockSize / 3}
                fill="white"
              />
            </Group>

            {/* Tank body */}
            <Rect
              x={-scaledBlockSize / 2}
              y={-scaledBlockSize / 2}
              width={scaledBlockSize}
              height={scaledBlockSize}
              fill="#555"
              cornerRadius={4 * scale}
            />
          </Group>
        </Layer>
      </Stage>

      {/* UI Elements */}
      <div className="absolute top-4 left-4 flex items-center gap-4">
        <Button
          onClick={handleExit}
          variant="outline"
          size="sm"
          className="bg-black/50 border-red-500/30 hover:bg-red-900/30 text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Exit
        </Button>

        <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-lg border border-purple-500/30">
          <span className="font-mono font-bold">{roomCode}</span>
          <button
            onClick={copyRoomCode}
            className="text-gray-300 hover:text-white"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
