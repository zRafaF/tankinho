import { useState } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useGameConnection } from "@/hooks/useGameConnection";

interface GameScreenProps {
  roomCode: string;
  isHost: boolean;
  gameStarted: boolean;
  onExitGame: () => void;
}

export default function GameScreen({
  roomCode,
  isHost,
  gameStarted,
  onExitGame,
}: GameScreenProps) {
  const [health] = useState(100);
  const [copied, setCopied] = useState(false);
  const [playerPos] = useState({ x: 100, y: 300 });
  const { disconnectFromMatch } = useGameConnection({});

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  // Terrain generation
  const generateTerrain = () => {
    const terrain = [];
    const groundLevel = 300;

    // Flat ground
    for (let x = 0; x < 700; x += 40) {
      terrain.push({
        x,
        y: groundLevel,
        width: 40,
        height: 40,
        color: x % 80 === 0 ? "#4a6b3f" : "#3a5530",
      });
    }

    // Random hill
    for (let x = 300; x < 500; x += 40) {
      const height = 300 - Math.sin((x - 300) * 0.05) * 40;
      terrain.push({
        x,
        y: height,
        width: 40,
        height: 40,
        color: "#3a5530",
      });
    }

    return terrain;
  };

  const handleExit = () => {
    console.log("Exiting game...");

    disconnectFromMatch();
    onExitGame();
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Waiting Overlay */}
      {!gameStarted && isHost && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-800/90 rounded-xl border border-purple-500/30">
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Waiting for Player</h2>
            <p className="text-gray-300 mb-4">Share this room code:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-3xl font-bold bg-gray-900 px-4 py-2 rounded-lg">
                {roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Copy className="h-6 w-6 text-gray-300" />
                )}
              </button>
            </div>
            <Button
              onClick={handleExit}
              variant="outline"
              size="sm"
              className="mt-4 bg-black/50 border-red-500/30 hover:bg-red-900/30 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0"
      >
        <Layer>
          {/* Terrain */}
          {generateTerrain().map((block, i) => (
            <Rect
              key={i}
              x={block.x}
              y={block.y}
              width={block.width}
              height={block.height}
              fill={block.color}
              stroke="#2d3b27"
              strokeWidth={2}
            />
          ))}

          {/* Player */}
          <Group x={playerPos.x} y={playerPos.y}>
            <Group x={-30} y={-40}>
              <Rect width={60} height={10} fill="#444" cornerRadius={3} />
              <Rect
                width={health * 0.6}
                height={10}
                fill={health > 50 ? "#4ade80" : "#f87171"}
                cornerRadius={3}
              />
              <Text
                text={`${health}%`}
                x={2}
                y={-2}
                fontSize={12}
                fill="white"
              />
            </Group>

            <Rect
              x={-20}
              y={-10}
              width={40}
              height={20}
              fill="#555"
              cornerRadius={4}
            />
            <Rect
              x={-15}
              y={-15}
              width={30}
              height={10}
              fill="#666"
              cornerRadius={3}
            />
          </Group>
        </Layer>
      </Stage>

      {/* UI Controls */}
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

        {gameStarted && (
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
        )}
      </div>
    </div>
  );
}
