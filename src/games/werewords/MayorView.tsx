import { useState, useEffect, useRef } from "react";
import {
  addGuessResponse,
  markCorrect,
  markNoGuess,
  toggleWayOff,
  countTokensUsed,
  TOKEN_LIMITS,
} from "./useWerewordsGame";
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MayorView({ roomCode, game, hand, uid, room }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerFiredRef = useRef(false);

  useEffect(() => {
    if (!game.timerStartedAt) return;
    timerFiredRef.current = false;

    const update = () => {
      const elapsed = (Date.now() - game.timerStartedAt!) / 1000;
      const remaining = Math.max(0, game.timerMinutes * 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0 && !timerFiredRef.current) {
        timerFiredRef.current = true;
        markNoGuess(roomCode);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [game.timerStartedAt, game.timerMinutes, roomCode]);

  const tokensUsed = game.limitedTokens ? countTokensUsed(game.guesses) : null;
  const yesNoLeft = tokensUsed ? TOKEN_LIMITS.yesNo - tokensUsed.yesNo : Infinity;
  const maybeLeft = tokensUsed ? TOKEN_LIMITS.maybe - tokensUsed.maybe : Infinity;

  const handleResponse = async (
    playerUid: string,
    response: "yes" | "no" | "maybe" | "so-close"
  ) => {
    await addGuessResponse(roomCode, game, playerUid, response);
  };

  const handleCorrect = async (guesserUid: string) => {
    await markCorrect(roomCode, game, guesserUid);
  };

  const handleNoGuess = async () => {
    await markNoGuess(roomCode);
  };

  return (
    <div className="screen">
      <h2>Mayor's View</h2>

      <RoleBanner hand={hand} game={game} uid={uid} />

      <div className="turn-status">
        Magic word: <strong>{game.magicWord}</strong>
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

      {game.limitedTokens && (
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", margin: "0.5rem 0", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--ww-yes)" }}>Yes/No: {yesNoLeft}</span>
          <span style={{ color: "var(--ww-maybe)" }}>Maybe: {maybeLeft}</span>
        </div>
      )}

      <PlayerGuessBoard
        game={game}
        room={room}
        renderActions={(pid) => (
          <div className="ww-mayor-actions">
            <button
              className="ww-btn-sm ww-btn-yes"
              onClick={() => handleResponse(pid, "yes")}
              disabled={yesNoLeft <= 0}
            >
              Yes
            </button>
            <button
              className="ww-btn-sm ww-btn-no"
              onClick={() => handleResponse(pid, "no")}
              disabled={yesNoLeft <= 0}
            >
              No
            </button>
            <button
              className="ww-btn-sm ww-btn-maybe"
              onClick={() => handleResponse(pid, "maybe")}
              disabled={maybeLeft <= 0}
            >
              Maybe
            </button>
            <button
              className="ww-btn-sm ww-btn-so-close"
              onClick={() => handleResponse(pid, "so-close")}
              disabled={game.soCloseUsed}
            >
              So Close
            </button>
            <button
              className="ww-btn-sm"
              onClick={() => handleCorrect(pid)}
            >
              Correct!
            </button>
          </div>
        )}
      />

      <div className="ww-response-buttons" style={{ marginTop: "1rem" }}>
        <button
          className={game.wayOff ? "btn-danger" : "btn-secondary"}
          onClick={() => toggleWayOff(roomCode, game.wayOff)}
        >
          {game.wayOff ? "Remove Way Off" : "Way Off"}
        </button>
        <button className="btn-danger" onClick={handleNoGuess}>
          Nobody Got It
        </button>
      </div>
    </div>
  );
}
