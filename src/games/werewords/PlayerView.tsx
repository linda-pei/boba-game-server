import { useState, useEffect } from "react";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import { countTokensUsed, TOKEN_LIMITS } from "./useWerewordsGame";
import RoleBanner from "./RoleBanner";
import PlayerGuessBoard from "./PlayerGuessBoard";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerView({ game, hand, uid, room }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const mayorName = room.players[game.mayor]?.name ?? "Mayor";

  useEffect(() => {
    if (!game.timerStartedAt) return;

    const update = () => {
      const elapsed = (Date.now() - game.timerStartedAt!) / 1000;
      const remaining = Math.max(0, game.timerMinutes * 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [game.timerStartedAt, game.timerMinutes]);

  // Seer and werewolves can see the magic word
  const canSeeWord =
    hand?.role === "seer" ||
    hand?.role === "werewolf";

  return (
    <div className="screen">
      <h2>Werewords</h2>

      <RoleBanner hand={hand} game={game} uid={uid} />

      <div className="turn-status">
        <strong>{mayorName}</strong> is answering your questions.
        {canSeeWord && (
          <div style={{ marginTop: "0.5rem" }}>
            Magic word: <strong>{game.magicWord}</strong>
          </div>
        )}
        {timeLeft !== null && (
          <div style={{ marginTop: "0.5rem", fontSize: "1.2rem", color: timeLeft <= 30 ? "var(--accent-danger)" : "var(--text-muted)" }}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {game.wayOff && (
        <div className="ww-way-off-banner">
          WAY OFF — The guesses are going in the wrong direction!
        </div>
      )}

      {game.limitedTokens && (() => {
        const used = countTokensUsed(game.guesses);
        return (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", margin: "0.5rem 0", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--ww-yes)" }}>Yes/No: {TOKEN_LIMITS.yesNo - used.yesNo}</span>
            <span style={{ color: "var(--ww-maybe)" }}>Maybe: {TOKEN_LIMITS.maybe - used.maybe}</span>
          </div>
        );
      })()}

      <PlayerGuessBoard game={game} room={room} />

      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
        Ask yes-or-no questions out loud to guess the magic word!
      </p>
    </div>
  );
}
