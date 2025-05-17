import { useEffect, useState } from "react";
import { TURN_TIME_SEC, TURN_DELAY_MS } from "@/config/gameConfig";

export function useTurnTimer(
  roundState: string,
  setRoundState: (s: any) => void
) {
  const [turnTime, setTurnTime] = useState(TURN_TIME_SEC);

  useEffect(() => {
    if (roundState !== "player") return;
    setTurnTime(TURN_TIME_SEC);
    const interval = setInterval(() => {
      setTurnTime((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setRoundState("other");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundState]);

  useEffect(() => {
    if (roundState !== "other") return;
    const timeout = setTimeout(() => setRoundState("player"), TURN_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [roundState]);

  return { turnTime };
}
