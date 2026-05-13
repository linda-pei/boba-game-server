import { useState } from "react";
import { submitVote } from "./useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";
import PlayerGuessBoard from "./PlayerGuessBoard";
import TurnStatus from "../../components/shared/TurnStatus";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function VotePhase({ roomCode, game, hand, uid, room }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const hasVoted = !!game.votes[uid];
  const voterCount = game.turnOrder.length;
  const voteCount = Object.keys(game.votes).length;

  const handleVote = async (voteFor: string) => {
    setSubmitting(true);
    await submitVote(roomCode, game, uid, voteFor);
  };

  return (
    <div className="screen ww-screen">
      <h2>Vote</h2>
      <RoleBanner hand={hand} game={game} uid={uid} />
      <p style={{ marginTop: "0.5rem" }}>
        The magic word was: <strong style={{ textTransform: "capitalize" }}>{game.magicWord}</strong>
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
        Nobody guessed the word! Vote for who you think is a werewolf.
      </p>

      <TurnStatus>Votes: {voteCount} / {voterCount}</TurnStatus>

      {!hasVoted && (
        <div className="ww-vote-grid" style={{ marginTop: "1rem" }}>
          {game.turnOrder
            .filter((pid) => pid !== uid)
            .map((pid) => (
              <button
                key={pid}
                className="btn btn--primary"
                onClick={() => handleVote(pid)}
                disabled={submitting}
              >
                {room.players[pid]?.name ?? pid}
                {pid === game.mayor && (
                  <span className="badge badge-host">Mayor</span>
                )}
              </button>
            ))}
        </div>
      )}

      {hasVoted && (
        <p style={{ marginTop: "1rem", color: "var(--ink-mute)" }}>
          Vote submitted! Waiting for others...
        </p>
      )}

      <PlayerGuessBoard game={game} room={room} />
    </div>
  );
}
