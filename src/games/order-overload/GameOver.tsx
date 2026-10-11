import { useCelebration } from "../../hooks/useCelebration";
import { useAuthContext } from "../../hooks/useAuthContext";
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

  useCelebration(level !== 0);

  return (
    <div className="screen oo-screen" style={{ textAlign: "center" }}>
      <h2>Game Over!</h2>

      {level > 0 ? (
        <>
          <p style={{ fontSize: "1.2rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>
            You reached Level {level}!
          </p>
          {stars > 0 && (
            <p className="oo-stars-big">{"★".repeat(stars)}</p>
          )}
          {level >= 7 && (
            <p style={{ fontSize: "1rem", color: "var(--ink-soft)" }}>
              Perfect run! All 7 levels completed!
            </p>
          )}
        </>
      ) : (
        <p style={{ fontSize: "1.1rem", color: "var(--ink-soft)", margin: "1rem 0" }}>
          Better luck next time!
        </p>
      )}

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
