import { useState } from "react";
import { submitMagicWord } from "./useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function WordSetup({ roomCode, game, hand, uid, room }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const isMayor = game.mayor === uid;
  const mayorName = room.players[game.mayor]?.name ?? "Mayor";

  const handlePickWord = async (word: string) => {
    setSubmitting(true);
    await submitMagicWord(roomCode, word);
  };

  if (!isMayor) {
    return (
      <div className="screen">
        <h2>Word Setup</h2>
        <RoleBanner hand={hand} game={game} uid={uid} />
        <div className="turn-status">
          <strong>{mayorName}</strong> (the Mayor) is choosing the magic word...
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Choose the Magic Word</h2>
      <RoleBanner hand={hand} game={game} uid={uid} />
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        As the Mayor, pick one of these words for the village to guess.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
        {game.wordChoices.map((word) => (
          <button
            key={word}
            onClick={() => handlePickWord(word)}
            disabled={submitting}
            style={{ minWidth: "200px", fontSize: "1.1rem", textTransform: "capitalize" }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
