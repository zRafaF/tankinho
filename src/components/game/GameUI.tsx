import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle, Zap } from "lucide-react";
import { SHOOTING_POWER_BARS } from "@/config/gameConfig";

interface GameUIProps {
  roomCode: string;
  copied: boolean;
  onCopy: () => void;
  onExit: () => void;
  powerBars: number;
  isCharging: boolean;
}

export function GameUI({
  roomCode,
  copied,
  onCopy,
  onExit,
  powerBars,
  isCharging,
}: GameUIProps) {
  // color from green → red
  const barColor = (i: number) => {
    if (i >= powerBars) return "#444";
    const t = i / (SHOOTING_POWER_BARS - 1);
    const hue = 120 * (1 - t);
    return `hsl(${hue},100%,50%)`;
  };

  return (
    <div className="absolute top-4 left-4 flex items-center gap-4">
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

      {/* Discrete power bars */}
      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-yellow-500/30">
        <Zap className="h-4 w-4 text-yellow-400" />
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
    </div>
  );
}
