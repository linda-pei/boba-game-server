import { useEffect } from "react";
import { useAuthContext } from "../../hooks/AuthContext";
import confetti from "canvas-confetti";
import GameEndButtons from "../../components/shared/GameEndButtons";
import type { OrderOverloadGame, Room } from "../../types";
import { getLevelStars } from "./useOrderOverloadGame";

interface Props {
  game: OrderOverloadGame;
  room: Room;
}

export default function GameOver({ game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room.host === uid;
  const level = game.highestLevelPassed;
  const stars = getLevelStars(level);

  useEffect(() => {
    if (level === 0) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="screen" style={{ textAlign: "center" }}>
      <h2>Game Over!</h2>

      {level > 0 ? (
        <>
          <p style={{ fontSize: "1.2rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>
            You reached Level {level}!
          </p>
          {stars > 0 && (
            <p style={{ fontSize: "2rem", margin: "0.5rem 0" }}>
              {"★".repeat(stars)}
            </p>
          )}
          {level >= 7 && (
            <p style={{ fontSize: "1rem", color: "var(--text-light)" }}>
              Perfect run! All 7 levels completed!
            </p>
          )}
        </>
      ) : (
        <p style={{ fontSize: "1.1rem", color: "var(--text-light)", margin: "1rem 0" }}>
          Better luck next time!
        </p>
      )}

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
