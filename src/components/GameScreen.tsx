import { useState, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle } from "lucide-react";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  TERRAIN_BLOCK_SIDE,
  TERRAIN_WIDTH,
  TERRAIN_HEIGHT,
  PLAYER_SPEED,
  INITIAL_PLAYER_POS,
} from "@/config/gameConfig";

interface GameScreenProps {
  onExitGame: () => void;
}

export default function GameScreen({ onExitGame }: GameScreenProps) {
  const [health] = useState(100);
  const [copied, setCopied] = useState(false);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);
  const { roomCode, disconnectFromMatch, isHost } = useGameConnectionContext();

  // Initialize terrain bitmask (bottom 3 rows filled)
  const [terrainBitmask] = useState(() =>
    Array.from({ length: TERRAIN_HEIGHT }, (_, y) =>
      Array.from({ length: TERRAIN_WIDTH }, (_, x) =>
        y >= TERRAIN_HEIGHT - 3 ? 1 : 0
      )
    )
  );

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

  // Game loop for player movement
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = (time - lastTime) / 1000; // Convert to seconds
      lastTime = time;

      setPlayerPos((prev) => {
        let newX = prev.x;
        if (movingLeft) newX -= PLAYER_SPEED * deltaTime;
        if (movingRight) newX += PLAYER_SPEED * deltaTime;

        // Keep player within terrain bounds
        newX = Math.max(0, Math.min(newX, TERRAIN_WIDTH - 1));
        return { ...prev, x: newX };
      });

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [movingLeft, movingRight]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExit = () => {
    disconnectFromMatch();
    onExitGame();
  };

  // Convert player position to screen space
  const screenX = playerPos.x * TERRAIN_BLOCK_SIDE;
  const screenY = playerPos.y * TERRAIN_BLOCK_SIDE;

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0"
      >
        <Layer>
          {/* Render terrain */}
          {terrainBitmask.flatMap((row, y) =>
            row.map((cell, x) =>
              cell === 1 ? (
                <Rect
                  key={`${x}-${y}`}
                  x={x * TERRAIN_BLOCK_SIDE}
                  y={y * TERRAIN_BLOCK_SIDE}
                  width={TERRAIN_BLOCK_SIDE}
                  height={TERRAIN_BLOCK_SIDE}
                  fill={x % 2 === 0 ? "#4a6b3f" : "#3a5530"}
                  stroke="#2d3b27"
                  strokeWidth={2}
                />
              ) : null
            )
          )}

          {/* Player */}
          <Group x={screenX} y={screenY}>
            <Group x={-TERRAIN_BLOCK_SIDE / 2} y={-TERRAIN_BLOCK_SIDE * 1.5}>
              <Rect
                width={TERRAIN_BLOCK_SIDE}
                height={TERRAIN_BLOCK_SIDE / 4}
                fill="#444"
                cornerRadius={3}
              />
              <Rect
                width={(health / 100) * TERRAIN_BLOCK_SIDE}
                height={TERRAIN_BLOCK_SIDE / 4}
                fill={health > 50 ? "#4ade80" : "#f87171"}
                cornerRadius={3}
              />
              <Text
                text={`${health}%`}
                x={4}
                y={-2}
                fontSize={TERRAIN_BLOCK_SIDE / 3}
                fill="white"
              />
            </Group>

            <Rect
              x={-TERRAIN_BLOCK_SIDE / 2}
              y={-TERRAIN_BLOCK_SIDE / 2}
              width={TERRAIN_BLOCK_SIDE}
              height={TERRAIN_BLOCK_SIDE}
              fill="#555"
              cornerRadius={4}
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
