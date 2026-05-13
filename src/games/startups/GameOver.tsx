import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useAuthContext } from "../../hooks/AuthContext";
import GameEndButtons from "../../components/shared/GameEndButtons";
import type { Room, StartupsGame } from "../../types";

interface Props {
  game: StartupsGame;
  room: Room;
}

export default function GameOver({ game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room.host === uid;

  const winnerName = game.winner
    ? room.players[game.winner]?.name ?? game.winner.slice(0, 6)
    : "Nobody";

  // Final standings depend on the variant:
  //  - Single game: rank by totalPoints from the most recent (only) round's breakdown.
  //  - 4-round mode: rank by round-chip score, using same tiebreakers as winner pick.
  const standings = game.roundsEnabled
    ? [...game.turnOrder].sort((a, b) => roundChipScore(game, b) - roundChipScore(game, a))
    : [...game.turnOrder].sort(
        (a, b) =>
          (game.scoreBreakdowns?.[b]?.totalPoints ?? 0) -
          (game.scoreBreakdowns?.[a]?.totalPoints ?? 0)
      );

  useEffect(() => {
    if (game.winner !== uid) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [game.winner, uid]);

  return (
    <div className="su-game-over">
      <h2>Game Over!</h2>
      <p className="su-winner-line">{winnerName} wins!</p>

      <div className="final-scores">
        <h3>Final Standings</h3>
        {standings.map((pid, i) => {
          const name = room.players[pid]?.name ?? pid.slice(0, 6);
          const chips = game.roundChips[pid] ?? { plus2: 0, plus1: 0, minus1: 0 };
          const roundScore = roundChipScore(game, pid);
          const singleScore =
            game.scoreBreakdowns?.[pid]?.totalPoints ?? 0;

          return (
            <div key={pid} className="final-score-row">
              <span className="final-score-rank">#{i + 1}</span>
              <span className="final-score-name">{name}</span>
              {game.roundsEnabled ? (
                <span className="final-score-value">
                  {roundScore} pts
                  <span className="su-round-chip-detail">
                    {" "}({chips.plus2}× +2, {chips.plus1}× +1, {chips.minus1}× −1)
                  </span>
                </span>
              ) : (
                <span className="final-score-value">{singleScore} pts</span>
              )}
            </div>
          );
        })}
      </div>

      <GameEndButtons isHost={isHost} />
    </div>
  );
}

function roundChipScore(game: StartupsGame, uid: string): number {
  const c = game.roundChips[uid];
  if (!c) return 0;
  return c.plus2 * 2 + c.plus1 - c.minus1;
}
