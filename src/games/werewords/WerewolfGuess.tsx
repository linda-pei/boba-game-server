import { useState } from "react";
import { submitWerewolfGuess } from "./useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";
import PlayerGuessBoard from "./PlayerGuessBoard";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function WerewolfGuess({ roomCode, game, hand, uid, room }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const isWerewolf = hand?.role === "werewolf";

  const handleGuess = async (guessUid: string) => {
    setSubmitting(true);
    await submitWerewolfGuess(roomCode, game, guessUid);
  };

  const guessCandidates = game.turnOrder.filter((pid) => pid !== uid);

  if (!isWerewolf) {
    return (
      <div className="screen">
        <h2>Werewolf Guess</h2>
        <RoleBanner hand={hand} game={game} uid={uid} />
        <div className="turn-status">
          The word was guessed correctly!
          <br />
          The werewolf is now trying to identify the Seer...
        </div>
        <PlayerGuessBoard game={game} room={room} />
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Werewolf Guess</h2>
      <RoleBanner hand={hand} game={game} uid={uid} />
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        The village guessed the word! But you can still win —
        <br />
        identify the <strong>Seer</strong> to steal the victory!
      </p>

      <div className="ww-vote-grid" style={{ marginTop: "1rem" }}>
        {guessCandidates.map((pid) => (
          <button
            key={pid}
            className="player-chip"
            onClick={() => handleGuess(pid)}
            disabled={submitting}
            style={{ cursor: submitting ? "default" : "pointer" }}
          >
            {room.players[pid]?.name ?? pid}
          </button>
        ))}
      </div>

      <PlayerGuessBoard game={game} room={room} />
    </div>
  );
}
