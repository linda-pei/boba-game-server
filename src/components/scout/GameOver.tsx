import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../hooks/AuthContext";
import type { ScoutGame, Room } from "../../types";

interface GameOverProps {
  game: ScoutGame;
  room: Room;
}

export default function GameOver({ game, room }: GameOverProps) {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid } = useAuthContext();
  const isHost = room.host === uid;

  const sorted = [...game.turnOrder].sort(
    (a, b) => (game.cumulativeScores[b] ?? 0) - (game.cumulativeScores[a] ?? 0)
  );

  const winnerName = game.winner
    ? room.players[game.winner]?.name ?? "Unknown"
    : "Unknown";

  const handleBackToLobby = async () => {
    if (!roomCode) return;
    await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div className="screen">
      <h2>Game Over!</h2>
      <p style={{ fontSize: "1.2rem", fontWeight: 600 }}>
        {winnerName} wins!
      </p>

      <div className="final-scores">
        <h3>Final Standings</h3>
        {sorted.map((pid, i) => {
          const name = room.players[pid]?.name ?? pid;
          const score = game.cumulativeScores[pid] ?? 0;
          return (
            <div key={pid} className="final-score-row">
              <span className="final-score-rank">#{i + 1}</span>
              <span className="final-score-name">{name}</span>
              <span className="final-score-value">{score} pts</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
        {isHost && (
          <button onClick={handleBackToLobby}>
            Back to Lobby
          </button>
        )}
        <button onClick={() => navigate("/")} className={isHost ? "btn-secondary" : ""}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
