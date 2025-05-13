import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConnectionScreenProps {
  onCreateGame: () => void;
  onJoinGame: (code: string) => void;
}

export default function ConnectionScreen({
  onCreateGame,
  onJoinGame,
}: ConnectionScreenProps) {
  const [roomCode, setRoomCode] = useState("");
  const [isCodeValid, setIsCodeValid] = useState(false);

  useEffect(() => {
    setIsCodeValid(/^\d{4}$/.test(roomCode));
  }, [roomCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 4 && /^[0-9]*$/.test(value)) {
      setRoomCode(value);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-black/40 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 shadow-xl"
      >
        <h1 className="text-4xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          TANK BATTLE
        </h1>

        <div className="space-y-6">
          <Button
            onClick={onCreateGame}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-2 border-purple-400/30 shadow-lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Create New Game
          </Button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-400/30" />
            <span className="mx-4 text-gray-300">OR</span>
            <div className="flex-grow border-t border-gray-400/30" />
          </div>

          <div className="space-y-4">
            <Input
              value={roomCode}
              onChange={handleInputChange}
              placeholder="ROOM CODE"
              className="h-14 text-center text-2xl font-mono bg-gray-900/60 border-2 border-purple-500/30 focus:border-purple-500"
              maxLength={4}
            />

            <Button
              onClick={() => isCodeValid && onJoinGame(roomCode)}
              disabled={!isCodeValid}
              className="w-full h-12 text-lg font-bold bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
            >
              Join Game
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
