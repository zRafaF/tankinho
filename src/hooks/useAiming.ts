import { useEffect, useState } from "react";

interface UseAimingProps {
  stageRef: React.RefObject<any>;
  blockSize: number;
  playerPos: { x: number; y: number };
  isMyTurn: boolean;
  roundState: "player" | "bullet" | "other";
}

export const useAiming = ({
  stageRef,
  blockSize,
  playerPos,
  isMyTurn,
  roundState,
}: UseAimingProps) => {
  const [turretAngle, setTurretAngle] = useState(0);

  useEffect(() => {
    if (roundState !== "player" || !isMyTurn) return;

    const onMove = (e: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      setTurretAngle(Math.atan2(wy - playerPos.y, wx - playerPos.x));
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [roundState, playerPos, blockSize, isMyTurn, stageRef]);

  return { turretAngle, setTurretAngle };
};
