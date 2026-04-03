import { useEffect } from "react";
import { useAuthContext } from "../../hooks/AuthContext";
import confetti from "canvas-confetti";
import GameEndButtons from "../../components/shared/GameEndButtons";
import type { DeepSeaGame, Room } from "../../types";
import { useDeepSeaHand } from "./useDeepSeaGame";

interface Props {
  roomCode: string;
  game: DeepSeaGame;
  room: Room;
}

const LEVEL_LABELS = ["L1 △", "L2 □", "L3 ⬠", "L4 ⬡"];

export default function GameOver({ roomCode, game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room.host === uid;
  const hand = useDeepSeaHand(roomCode, uid);

  const isWinner = game.winner === uid;

  useEffect(() => {
    if (!isWinner) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [isWinner]);

  if (!game.finalScores) return null;

  // Sort players by score (descending)
  const sorted = [...game.turnOrder].sort(
    (a, b) => game.finalScores![b] - game.finalScores![a]
  );

  return (
    <div className="screen deep-sea-screen" style={{ textAlign: "center" }}>
      <h2>Game Over!</h2>

      <p style={{ fontSize: "1.2rem", fontWeight: 600, margin: "1rem 0" }}>
        🏆 {room.players[game.winner!]?.name ?? "???"} wins!
      </p>

      <table className="ds-score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
            <th>Chips by Level</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pid, rank) => {
            const tb = game.tiebreaker?.[pid] ?? [0, 0, 0, 0];
            return (
              <tr
                key={pid}
                className={pid === game.winner ? "ds-winner-row" : ""}
              >
                <td>
                  {rank === 0 && "🏆 "}
                  {room.players[pid]?.name}
                  {pid === uid && " (you)"}
                </td>
                <td style={{ fontWeight: 600 }}>{game.finalScores![pid]}</td>
                <td className="ds-level-breakdown">
                  {tb.map((count, i) => (
                    <span key={i} className="ds-level-count">
                      {LEVEL_LABELS[i]}: {count}
                    </span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Show your scored treasures */}
      {hand && hand.scored.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Your Treasures</h3>
          <div className="ds-treasure-reveal-grid">
            {hand.scored.map((chip, i) => (
              <span key={i} className={`ds-chip-reveal ds-level-${chip.level}`}>
                {chip.points}pts
              </span>
            ))}
          </div>
        </div>
      )}

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
