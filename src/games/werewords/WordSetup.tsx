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
  const [word, setWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isMayor = game.mayor === uid;
  const mayorName = room.players[game.mayor]?.name ?? "Mayor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
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
        As the Mayor, pick a word the village will try to guess.
        <br />
        Choose something that's possible but not too easy!
      </p>
      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter the magic word..."
          autoFocus
          style={{ fontSize: "1.1rem", textAlign: "center", maxWidth: "300px" }}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <button type="submit" disabled={!word.trim() || submitting}>
            {submitting ? "Setting..." : "Set Magic Word"}
          </button>
        </div>
      </form>
    </div>
  );
}
