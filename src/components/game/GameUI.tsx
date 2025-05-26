import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  Zap,
  Clock,
  SkipForward,
} from "lucide-react";
import { SHOOTING_POWER_BARS, TURN_DELAY_MS } from "@/config/gameConfig";

type RoundState = "player" | "bullet" | "other";

interface GameUIProps {
  roomCode: string;
  onExit: () => void;
  onSkipTurn: () => void; // <- NEW PROP
  roundState: RoundState;
  turnTime: number;
  powerBars: number;
  isCharging: boolean;
  isMyTurn: boolean;
}

export function GameUI({
  roomCode,
  onExit,
  onSkipTurn,
  roundState,
  turnTime,
  powerBars,
  isCharging,
  isMyTurn,
}: GameUIProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const barColor = (i: number) => {
    if (roundState !== "player" || i >= powerBars) return "#444";
    const t = i / (SHOOTING_POWER_BARS - 1);
    return `hsl(${120 * (1 - t)},100%,50%)`;
  };

  return (
    <div className="absolute top-4 left-4 flex items-center gap-4">
      {/* Exit */}
      <Button
        onClick={onExit}
        variant="outline"
        size="sm"
        className="bg-black/50 border-red-500/30 hover:bg-red-900/30 text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Exit
      </Button>

      {/* Room Code */}
      <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-lg border border-purple-500/30">
        <span className="font-mono font-bold">{roomCode}</span>
        <button onClick={handleCopy} className="text-gray-300 hover:text-white">
          {copied ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Power Bars */}
      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-yellow-500/30">
        <Zap
          className={`h-4 w-4 ${
            roundState === "player" ? "text-yellow-400" : "text-gray-600"
          }`}
        />
        <div
          key={`${powerBars}-${isCharging}`} // force rerender on state change
          className="flex space-x-0.5"
        >
          {Array.from({ length: SHOOTING_POWER_BARS }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-1 rounded-sm"
              style={{ backgroundColor: barColor(i) }}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-blue-500/30">
        <Clock className="h-4 w-4 text-blue-300" />
        <span className="text-white font-mono">
          {roundState === "player"
            ? `${turnTime}s`
            : roundState === "bullet"
            ? "Bullet flying"
            : `Waiting ${TURN_DELAY_MS / 1000}s`}
        </span>
      </div>

      {/* Controls Legend & Skip Button */}
      {roundState === "player" && (
        <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded-lg text-xs text-gray-300 border border-gray-600">
          <kbd className="px-1 bg-gray-800 text-white rounded">A</kbd>
          <span>Left</span>
          <kbd className="px-1 bg-gray-800 text-white rounded">D</kbd>
          <span>Right</span>
          <kbd className="px-3 bg-gray-800 text-white rounded">␣</kbd>
          <span>Charge & Shoot</span>

          {isMyTurn && (
            <Button
              onClick={onSkipTurn}
              size="sm"
              variant="ghost"
              className="text-xs text-red-300 hover:text-red-500 ml-2"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Turn
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
