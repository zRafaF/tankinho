import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, type FunctionComponent } from "react";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";

const ConnectionScreen: FunctionComponent = () => {
  const [localCode, setLocalCode] = useState("");
  const { error, createMatch, joinMatch, roomCode, isConnected, isConnecting } =
    useGameConnectionContext();

  const isCodeValid = /^\d{4}$/.test(localCode);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 4) setLocalCode(value);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-black/40 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 shadow-xl"
      >
        <h1 className="text-4xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          TANKINHO
        </h1>

        {(isConnecting || !isConnected) && (
          <div className="text-center text-purple-300 mb-4">
            {isConnecting
              ? "Connecting to server..."
              : "Connection lost. Trying to reconnect..."}
          </div>
        )}

        {error && <div className="text-center text-red-400 mb-4">{error}</div>}

        <div className="space-y-6">
          <Button
            onClick={createMatch}
            disabled={!isConnected}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-2 border-purple-400/30 shadow-lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {roomCode ? `Room Code: ${roomCode}` : "Create New Game"}
          </Button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-400/30" />
            <span className="mx-4 text-gray-300">OR</span>
            <div className="flex-grow border-t border-gray-400/30" />
          </div>

          <div className="space-y-4">
            <Input
              value={localCode}
              onChange={handleInputChange}
              placeholder="ROOM CODE"
              className="h-14 text-center text-2xl font-mono bg-gray-900/60 border-2 border-purple-500/30 focus:border-purple-500"
              maxLength={4}
              disabled={!isConnected}
            />

            <Button
              onClick={() => joinMatch(localCode)}
              disabled={!isCodeValid || !isConnected}
              className="w-full h-12 text-lg font-bold bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
            >
              Join Game
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConnectionScreen;
