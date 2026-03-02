import { useState } from "react";
import { submitVote } from "../../hooks/useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function VotePhase({ roomCode, game, hand, uid, room }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const isMayor = uid === game.mayor;
  const hasVoted = !!game.votes[uid];
  const nonMayorPlayers = game.turnOrder.filter((pid) => pid !== game.mayor);
  const voterCount = nonMayorPlayers.length;
  const voteCount = Object.keys(game.votes).length;

  const handleVote = async (voteFor: string) => {
    setSubmitting(true);
    await submitVote(roomCode, game, uid, voteFor);
  };

  return (
    <div className="screen">
      <h2>Vote</h2>
      <RoleBanner hand={hand} />
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Nobody guessed the word! Vote for who you think is a werewolf.
      </p>

      <div className="turn-status">
        Votes: {voteCount} / {voterCount}
      </div>

      {isMayor && (
        <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
          As Mayor, you don't vote — wait for the village to decide.
        </p>
      )}

      {!isMayor && !hasVoted && (
        <div className="ww-vote-grid" style={{ marginTop: "1rem" }}>
          {game.turnOrder
            .filter((pid) => pid !== uid)
            .map((pid) => (
              <button
                key={pid}
                className="player-chip"
                onClick={() => handleVote(pid)}
                disabled={submitting}
                style={{ cursor: submitting ? "default" : "pointer" }}
              >
                {room.players[pid]?.name ?? pid}
                {pid === game.mayor && (
                  <span className="badge badge-host">Mayor</span>
                )}
              </button>
            ))}
        </div>
      )}

      {!isMayor && hasVoted && (
        <p style={{ marginTop: "1rem", color: "var(--text-light)" }}>
          Vote submitted! Waiting for others...
        </p>
      )}
    </div>
  );
}
