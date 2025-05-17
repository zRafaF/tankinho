import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle, Zap, Clock } from "lucide-react";
import { SHOOTING_POWER_BARS } from "@/config/gameConfig";

interface GameUIProps {
  roomCode: string;
  copied: boolean;
  onCopy: () => void;
  onExit: () => void;
  powerBars: number;
  isCharging: boolean;
  turnTime: number;
  isTurnActive: boolean;
}

export function GameUI({
  roomCode,
  copied,
  onCopy,
  onExit,
  powerBars,
  turnTime,
  isTurnActive,
}: GameUIProps) {
  const barColor = (i: number) => {
    if (!isTurnActive || i >= powerBars) return "#444";
    const t = i / (SHOOTING_POWER_BARS - 1);
    return `hsl(${120 * (1 - t)},100%,50%)`;
  };

  return (
    <div className="absolute top-4 left-4 flex items-center gap-4">
      {/* Exit & room code */}
      <Button
        onClick={onExit}
        variant="outline"
        size="sm"
        className="bg-black/50 border-red-500/30 hover:bg-red-900/30 text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Exit
      </Button>
      <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-lg border border-purple-500/30">
        <span className="font-mono font-bold">{roomCode}</span>
        <button onClick={onCopy} className="text-gray-300 hover:text-white">
          {copied ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Power bars */}
      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-yellow-500/30">
        <Zap
          className={`h-4 w-4 ${
            isTurnActive ? "text-yellow-400" : "text-gray-600"
          }`}
        />
        <div className="flex space-x-0.5">
          {Array.from({ length: SHOOTING_POWER_BARS }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-1 rounded-sm"
              style={{ backgroundColor: barColor(i) }}
            />
          ))}
        </div>
      </div>

      {/* Turn timer */}
      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-blue-500/30">
        <Clock className="h-4 w-4 text-blue-300" />
        <span className="text-white font-mono">
          {isTurnActive ? `${turnTime}s` : "Waiting..."}
        </span>
      </div>

      {/* Controls legend with icons */}
      <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded-lg border border-gray-600">
        <kbd className="px-1 bg-gray-800 text-white rounded">A</kbd>
        <span className="text-gray-300">Move Left</span>
        <kbd className="px-1 bg-gray-800 text-white rounded">D</kbd>
        <span className="text-gray-300">Move Right</span>
        <kbd className="px-3 bg-gray-800 text-white rounded">␣</kbd>
        <span className="text-gray-300">Charge & Shoot</span>
      </div>
    </div>
  );
}
