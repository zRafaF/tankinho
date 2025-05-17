import { useState, useEffect, useRef } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  SHOOTING_POWER_BARS,
  SHOOTING_POWER_INTERVAL_MS,
  TURN_TIME_SEC,
  TURN_DELAY_MS,
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

  // — Shooting state —
  const [isCharging, setIsCharging] = useState(false);
  const [powerBars, setPowerBars] = useState(1);

  // — Turn state —
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);
  const [isTurnActive, setIsTurnActive] = useState(false);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const [environmentBitmask] = useState<Uint8Array>(createTerrain);
  const stageRef = useRef<any>(null);

  // — Start the first turn on mount —
  useEffect(() => {
    const startTurn = () => {
      console.log("➡️ New turn started");
      setIsTurnActive(true);
      setTurnTime(TURN_TIME_SEC);
    };
    startTurn();
  }, []);

  // — Handle the countdown while turn is active —
  useEffect(() => {
    if (!isTurnActive) return;
    const timer = window.setInterval(() => {
      setTurnTime((t) => {
        if (t <= 1) {
          clearInterval(timer);
          console.log("⏹ End of turn");
          setIsTurnActive(false);
          // after delay, start next turn
          setTimeout(() => {
            console.log("🔁 Preparing next turn...");
            setIsTurnActive(true);
            setTurnTime(TURN_TIME_SEC);
          }, TURN_DELAY_MS);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTurnActive]);

  // — Handle resize —
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  // — Global mouse → turret (only on-turn) —
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTurnActive) return;
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
  }, [blockSize, playerPos, isTurnActive]);

  // — Start/stop charging on Space (only on-turn) —
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isCharging && isTurnActive) {
        setIsCharging(true);
        setPowerBars(1);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isCharging && isTurnActive) {
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
  }, [isCharging, powerBars, isTurnActive]);

  // — Increment a bar every INTERVAL ms while charging —
  useEffect(() => {
    if (!isCharging || !isTurnActive) return;
    const id = window.setInterval(() => {
      setPowerBars((bars) => Math.min(bars + 1, SHOOTING_POWER_BARS));
    }, SHOOTING_POWER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isCharging, isTurnActive]);

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
            isTurnActive={isTurnActive}
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
        turnTime={turnTime}
        isTurnActive={isTurnActive}
      />
    </div>
  );
}
