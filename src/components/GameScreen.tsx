import { useState, useEffect, useRef } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  SHOOTING_POWER_BARS,
} from "@/config/gameConfig";
import { createTerrain } from "@/lib/environmentUtils";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  const [health] = useState(100);
  const [copied, setCopied] = useState(false);
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);

  // —— Charging state ——
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const [environmentBitmask] = useState<Uint8Array>(createTerrain);
  const stageRef = useRef<any>(null);

  // Resize
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // Global mouse → turret
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = mx / blockSize;
      const worldY = my / blockSize;
      setTurretAngle(Math.atan2(worldY - playerPos.y, worldX - playerPos.x));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [blockSize, playerPos]);

  // Start/stop charging on Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isCharging) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isCharging) {
        setIsCharging(false);
        console.log(
          `🔫 Shot fired with power bars: ${powerBars}/${SHOOTING_POWER_BARS}`
        );
        setPowerBars(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isCharging, powerBars]);

  // Increment a bar every 200 ms while charging
  useEffect(() => {
    if (!isCharging) return;
    const id = window.setInterval(() => {
      setPowerBars((bars) => Math.min(bars + 1, SHOOTING_POWER_BARS));
    }, 200);
    return () => clearInterval(id);
  }, [isCharging]);

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
        powerBars={powerBars}
        isCharging={isCharging}
      />
    </div>
  );
}
