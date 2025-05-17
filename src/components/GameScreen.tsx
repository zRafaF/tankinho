import { useState, useEffect, useRef } from "react";
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
  const [turretAngle, setTurretAngle] = useState(0);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const [environmentBitmask] = useState<Uint8Array>(createTerrain);
  const stageRef = useRef<any>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // Track mouse movement to aim turret
  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldX = pointer.x / blockSize;
    const worldY = pointer.y / blockSize;
    // compute angle from player center to mouse
    const angle = Math.atan2(worldY - playerPos.y, worldX - playerPos.x);
    setTurretAngle(angle);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleExit = () => {
    disconnectFromMatch();
    onExitGame();
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={stageHeight}
        onMouseMove={handleMouseMove}
        className="absolute top-1/2 left-0 transform -translate-y-1/2"
      >
        <Environment bitmask={environmentBitmask} blockSize={blockSize} />
        <Layer>
          <Player
            x={playerPos.x}
            y={playerPos.y}
            health={health}
            bitmask={environmentBitmask}
            blockSize={blockSize}
            turretAngle={turretAngle}
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
