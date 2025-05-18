// components/HostWaitingScreen.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";

export default function HostWaitingScreen({ onExit }: { onExit: () => void }) {
  const [copied, setCopied] = useState(false);
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExit = () => {
    disconnectFromMatch();
    onExit();
  };

  return (
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
          Exit
        </Button>
      </div>
    </div>
  );
}
