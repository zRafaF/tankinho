import { useRef, useState } from "react";
import { Stage, Layer, Circle, Ellipse } from "react-konva";
import { useGameConnectionContext } from "@/contexts/GameConnectionContext";
import { Environment } from "@/components/game/Environment";
import { Player } from "@/components/game/Player";
import { GameUI } from "@/components/game/GameUI";
import { createTerrain } from "@/lib/environmentUtils";
import {
  ENVIRONMENT_WIDTH,
  ENVIRONMENT_HEIGHT,
  INITIAL_PLAYER_POS,
  EXPLOSION_RADIUS,
} from "@/config/gameConfig";

import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useTurretAngle } from "@/hooks/useTurretAngle";
import { useBulletPhysics } from "@/hooks/useBulletPhysics";
import { useExplosions } from "@/hooks/useExplosions";
import { useWindowResize } from "@/hooks/useWindowResize";
import { usePlayerShoot } from "@/hooks/usePlayerShoot";

type RoundState = "player" | "bullet" | "other";

export default function GameScreen({ onExitGame }: { onExitGame: () => void }) {
  const [bitmask, setBitmask] = useState(() => createTerrain());
  const [playerPos, setPlayerPos] = useState(INITIAL_PLAYER_POS);
  const [turretAngle, setTurretAngle] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>("player");
  const [health, setHealth] = useState(100);

  const stageRef = useRef<any>(null);
  const { windowSize } = useWindowResize();
  const blockSize = windowSize.width / ENVIRONMENT_WIDTH;
  const stageHeight = blockSize * ENVIRONMENT_HEIGHT;

  const { roomCode, disconnectFromMatch } = useGameConnectionContext();
  const { turnTime } = useTurnTimer(roundState, setRoundState);
  const { bullets, powerBars, isCharging } = usePlayerShoot(
    roundState,
    setRoundState,
    () => turretAngle,
    playerPos
  );
  const { updatedBullets, handleBulletExplosion } = useBulletPhysics(
    roundState,
    bullets,
    bitmask,
    setRoundState
  );
  const { explosions, triggerExplosion } = useExplosions(
    bitmask,
    setBitmask,
    playerPos,
    setHealth
  );

  useTurretAngle(stageRef, blockSize, playerPos, roundState, setTurretAngle);
  // process any collisions on each render
  handleBulletExplosion(triggerExplosion);

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
            isTurnActive={roundState === "player"}
            onPositionChange={setPlayerPos}
          />
          {updatedBullets.map((b) => (
            <Circle
              key={b.id}
              x={b.x * blockSize}
              y={b.y * blockSize}
              radius={blockSize * 0.2}
              fill="yellow"
            />
          ))}
          {explosions.map((e) => (
            <Ellipse
              key={e.id}
              x={e.x * blockSize}
              y={e.y * blockSize}
              radiusX={EXPLOSION_RADIUS * blockSize}
              radiusY={EXPLOSION_RADIUS * blockSize}
              fill="rgba(255,165,0,0.5)"
            />
          ))}
        </Layer>
      </Stage>
      <GameUI
        roomCode={roomCode}
        onExit={handleExit}
        roundState={roundState}
        turnTime={turnTime}
        powerBars={powerBars}
        isCharging={isCharging}
      />
    </div>
  );
}
