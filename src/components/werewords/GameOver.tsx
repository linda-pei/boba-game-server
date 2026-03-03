import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../hooks/AuthContext";
import confetti from "canvas-confetti";
import type { WerewordsGame, Room, WerewordsRole } from "../../types";

interface Props {
  game: WerewordsGame;
  room: Room;
}

const ROLE_LABELS: Record<WerewordsRole, string> = {
  seer: "Seer",
  werewolf: "Werewolf",
  villager: "Villager",
};

const ROLE_COLORS: Record<WerewordsRole, string> = {
  seer: "var(--accent-primary)",
  werewolf: "var(--accent-danger)",
  villager: "var(--accent-secondary)",
};

function getPlayerTeam(role: WerewordsRole): "villagers" | "werewolves" {
  return role === "werewolf" ? "werewolves" : "villagers";
}

export default function GameOver({ game, room }: Props) {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid } = useAuthContext();
  const isHost = room.host === uid;

  const playerTeam =
    uid && game.revealedRoles?.[uid]
      ? getPlayerTeam(game.revealedRoles[uid])
      : null;
  const isWinner = playerTeam === game.winner;

  useEffect(() => {
    if (!isWinner) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const handleBackToLobby = async () => {
    if (!roomCode) return;
    await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div className="screen">
      <h2>Game Over!</h2>
      <p style={{ fontSize: "1.2rem", fontWeight: 600 }}>
        {game.winner === "villagers" ? "Villagers" : "Werewolves"} win!
      </p>
      {game.winReason && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {game.winReason}
        </p>
      )}
      {game.magicWord && (
        <p style={{ marginTop: "0.5rem" }}>
          The magic word was: <strong>{game.magicWord}</strong>
        </p>
      )}

      {game.revealedRoles && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Roles</h3>
          <div className="player-list-grid">
            {game.turnOrder.map((pid) => {
              const role = game.revealedRoles![pid];
              if (!role) return null;
              const isMayor = pid === game.mayor;
              const team = getPlayerTeam(role);
              return (
                <div key={pid} className="player-chip">
                  {room.players[pid]?.name ?? pid}
                  <span
                    className="badge"
                    style={{ background: ROLE_COLORS[role] }}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                  {isMayor && (
                    <span className="badge badge-host">Mayor</span>
                  )}
                  {team === game.winner && (
                    <span style={{ fontSize: "0.8rem" }}>🎉</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(game.votes).length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Votes</h3>
          <div className="ww-player-board">
            {game.turnOrder.map((pid) => {
              const votedFor = game.votes[pid];
              if (!votedFor) return null;
              const voterName = room.players[pid]?.name ?? pid;
              const targetName = room.players[votedFor]?.name ?? votedFor;
              return (
                <div key={pid} className="ww-player-row">
                  <span className="ww-player-row-name">{voterName}</span>
                  <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
                    voted for
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {targetName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
