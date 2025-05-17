import { useEffect } from "react";

export function useTurretAngle(
  stageRef: any,
  blockSize: number,
  playerPos: { x: number; y: number },
  roundState: string,
  setTurretAngle: (angle: number) => void
) {
  useEffect(() => {
    if (roundState !== "player") return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = stageRef.current?.container().getBoundingClientRect();
      const wx = (e.clientX - rect.left) / blockSize;
      const wy = (e.clientY - rect.top) / blockSize;
      const angle = Math.atan2(wy - playerPos.y, wx - playerPos.x);
      setTurretAngle(angle);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [roundState, stageRef, blockSize, playerPos, setTurretAngle]);
}
