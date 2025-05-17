import { useState, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
} from "@/config/gameConfig";
import { createTerrain } from "@/lib/environmentUtils";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";

interface GameScreenProps {
  onExitGame: () => void;
}

export default function GameScreen({ onExitGame }: GameScreenProps) {
  const [health] = useState(100);
  const [copied, setCopied] = useState(false);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();

  const [environmentBitmask, setEnvironmentBitmask] =
    useState<Uint8Array>(createTerrain);

  // Full-width responsive scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate responsive scaling
  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExit = () => {
    disconnectFromMatch();
    onExitGame();
  };

  // // runs every second
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // sets a random bitmask to 0
  //     const random = Math.floor(Math.random() * environmentBitmask.length);
  //     const newBitmask = new Uint8Array(environmentBitmask);
  //     newBitmask[random] = 0;
  //     setEnvironmentBitmask(newBitmask);
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <Stage
        width={windowSize.width}
        height={stageHeight}
        className="absolute top-1/2 left-0 transform -translate-y-1/2"
      >
        <Environment bitmask={environmentBitmask} blockSize={blockSize} />
        <Layer>
          <Player
            x={playerPos.x}
            y={playerPos.y}
            health={health}
            blockSize={blockSize}
            bitmask={environmentBitmask}
            onPositionChange={setPlayerPos}
          />
        </Layer>
      </Stage>

      <GameUI
        roomCode={roomCode}
        copied={copied}
        onCopy={copyRoomCode}
        onExit={handleExit}
      />
    </div>
  );
}
