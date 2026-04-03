import { useEffect } from "react";
import { useAuthContext } from "../../hooks/AuthContext";
import confetti from "canvas-confetti";
import GameEndButtons from "../../components/shared/GameEndButtons";
import type { DeepSeaGame, Room } from "../../types";
import { LEVEL_SHAPES, LEVEL_CLASSES } from "./constants";

interface Props {
  roomCode: string;
  game: DeepSeaGame;
  room: Room;
}

export default function GameOver({ roomCode, game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room.host === uid;

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
            <th>Treasures</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pid, rank) => {
            const treasures = game.finalTreasures?.[pid] ?? [];
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
                <td>
                  <div className="ds-revealed-treasures">
                    {treasures.map((chip, i) => (
                      <span key={i} className={`ds-chip-reveal ${LEVEL_CLASSES[chip.level]}`}>
                        <span className="ds-chip-shape">{LEVEL_SHAPES[chip.level]}</span>
                        {chip.points}
                      </span>
                    ))}
                    {treasures.length === 0 && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
