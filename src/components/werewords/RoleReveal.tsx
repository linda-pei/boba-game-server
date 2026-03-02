import { confirmRoleReveal } from "../../hooks/useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

const ROLE_LABELS: Record<string, string> = {
  mayor: "Mayor",
  seer: "Seer",
  werewolf: "Werewolf",
  villager: "Villager",
};

const ROLE_COLORS: Record<string, string> = {
  mayor: "var(--accent-primary)",
  seer: "var(--accent-primary)",
  werewolf: "var(--accent-danger)",
  villager: "var(--accent-secondary)",
};

export default function RoleReveal({ roomCode, game, hand, uid, room }: Props) {
  const hasConfirmed = game.roleRevealed[uid];

  const handleConfirm = async () => {
    await confirmRoleReveal(roomCode, uid);
  };

  const waitingFor = game.turnOrder.filter((pid) => !game.roleRevealed[pid]);

  return (
    <div className="screen">
      <h2>Role Reveal</h2>

      {hand && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="ww-role-card" style={{ borderColor: ROLE_COLORS[hand.role] }}>
            <div className="ww-role-label" style={{ color: ROLE_COLORS[hand.role] }}>
              {ROLE_LABELS[hand.role]}
            </div>
            {hand.fellowWerewolves.length > 0 && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                Fellow werewolves:{" "}
                {hand.fellowWerewolves
                  .map((w) => room.players[w]?.name ?? w)
                  .join(", ")}
              </div>
            )}
          </div>

          {!hasConfirmed && (
            <button onClick={handleConfirm} style={{ marginTop: "1rem" }}>
              I've Seen My Role
            </button>
          )}
        </div>
      )}

      {hasConfirmed && waitingFor.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "var(--text-light)" }}>Waiting for others...</p>
          <div className="player-list-grid" style={{ marginTop: "0.75rem" }}>
            {waitingFor.map((pid) => (
              <div key={pid} className="player-chip">
                {room.players[pid]?.name ?? pid}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
