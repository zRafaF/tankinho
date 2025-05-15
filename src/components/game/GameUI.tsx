import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle } from "lucide-react";

interface GameUIProps {
  roomCode: string;
  copied: boolean;
  onCopy: () => void;
  onExit: () => void;
}

export function GameUI({ roomCode, copied, onCopy, onExit }: GameUIProps) {
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
    </div>
  );
}
