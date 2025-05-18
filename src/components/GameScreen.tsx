import { useRef } from "react";
import { Stage, Layer } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import { useGameMechanics } from "@/hooks/useGameMechanics";
import { useWindowResize } from "@/hooks/useWindowResize";
import { useAiming } from "@/hooks/useAiming";
import { useShooting } from "@/hooks/useShooting";
import { useBulletPhysics } from "@/hooks/useBulletPhysics";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";
import { BulletsLayer } from "@/components/game/BulletsLayer";
import { ExplosionsLayer } from "@/components/game/ExplosionsLayer";
import { ENVIRONMENT_WIDTH, ENVIRONMENT_HEIGHT } from "@/config/gameConfig";

type RoundState = "player" | "bullet" | "other";

interface GameScreenProps {
  onExitGame: () => void;
  gameStarted: boolean;
}

export default function GameScreen({
  onExitGame,
  gameStarted,
}: GameScreenProps) {
  const {
    roomCode,
    disconnectFromMatch,
    latestOpponentState,
    isHost,
    bitmask,
    setBitmask,
    sendTurnUpdate,
  } = useGameConnectionContext();

  const {
    health,
    setHealth,
    playerPos,
    setPlayerPos,
    opponentPos,
    opponentHealth,
    opponentAngle,
    roundState,
    setRoundState,
    turnTime,
    setTurnTime,
    isMyTurn,
  } = useGameMechanics({
    isHost,
    gameStarted,
    latestOpponentState,
    sendTurnUpdate,
    setBitmask,
  });

  const { windowSize, blockSize, stageHeight } = useWindowResize();
  const stageRef = useRef<any>(null);

  const { turretAngle, setTurretAngle } = useAiming({
    stageRef,
    blockSize,
    playerPos,
    isMyTurn,
    roundState,
  });

  const { powerBars, isCharging, bullets, setBullets, nextBulletId } =
    useShooting({
      isMyTurn,
      roundState,
      playerPos,
      turretAngle,
      setRoundState,
    });

  const { explosions, triggerExplosion } = useBulletPhysics({
    bullets,
    setBullets,
    bitmask,
    setBitmask,
    health,
    setHealth,
    playerPos,
    roundState,
    isHost,
    sendTurnUpdate,
    setCurrentTurn: () => setRoundState("other"),
  });

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
        <Environment bitmask={bitmask} blockSize={blockSize} />
        <Layer>
          <Player
            x={playerPos.x}
            y={playerPos.y}
            health={health}
            bitmask={bitmask}
            blockSize={blockSize}
            turretAngle={turretAngle}
            isTurnActive={roundState === "player" && isMyTurn}
            isLocalPlayer={true}
            onPositionChange={setPlayerPos}
          />
          <Player
            x={opponentPos.x}
            y={opponentPos.y}
            health={opponentHealth}
            bitmask={bitmask}
            blockSize={blockSize}
            turretAngle={opponentAngle}
            isTurnActive={false}
            isLocalPlayer={false}
          />
          <BulletsLayer bullets={bullets} blockSize={blockSize} />
          <ExplosionsLayer explosions={explosions} blockSize={blockSize} />
        </Layer>
      </Stage>
      <GameUI
        roomCode={roomCode}
        onExit={handleExit}
        roundState={roundState}
        turnTime={turnTime}
        powerBars={powerBars}
        isCharging={isCharging}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
