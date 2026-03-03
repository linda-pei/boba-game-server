import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import type { OrderOverloadGame, Room } from "../../types";
import {
  continueToNextLevel,
  retryLevel,
  finishGame,
  getLevelStars,
} from "./useOrderOverloadGame";

interface Props {
  roomCode: string;
  game: OrderOverloadGame;
  room: Room;
  uid: string;
}

export default function LevelComplete({ roomCode, game, room, uid }: Props) {
  const [acting, setActing] = useState(false);
  const isHost = room.host === uid;
  const passed = game.levelResult === "pass";
  const stars = getLevelStars(game.level);
  const isMaxLevel = game.level >= 7;

  useEffect(() => {
    if (!passed) return;
    const duration = 1500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const handleContinue = async () => {
    setActing(true);
    try {
      await continueToNextLevel(roomCode, game);
    } catch (err) {
      console.error("Continue failed:", err);
    }
    setActing(false);
  };

  const handleRetry = async () => {
    setActing(true);
    try {
      await retryLevel(roomCode, game);
    } catch (err) {
      console.error("Retry failed:", err);
    }
    setActing(false);
  };

  const handleFinish = async () => {
    setActing(true);
    try {
      await finishGame(roomCode);
    } catch (err) {
      console.error("Finish failed:", err);
    }
    setActing(false);
  };

  return (
    <div className="screen" style={{ textAlign: "center" }}>
      <h2>Level {game.level} {passed ? "Passed!" : "Failed"}</h2>

      {stars > 0 && (
        <p style={{ fontSize: "1.5rem", margin: "0.5rem 0" }}>
          {"★".repeat(stars)}
        </p>
      )}

      {passed ? (
        <>
          <p style={{ fontSize: "1.1rem", color: "var(--text-light)", margin: "1rem 0" }}>
            {isMaxLevel
              ? "You completed all 7 levels! Amazing!"
              : `Ready for Level ${game.level + 1}?`}
          </p>

          {isHost && (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
              {!isMaxLevel && (
                <button onClick={handleContinue} disabled={acting}>
                  {acting ? "..." : `Continue to Level ${game.level + 1}`}
                </button>
              )}
              <button
                className={isMaxLevel ? "" : "btn-secondary"}
                onClick={handleFinish}
                disabled={acting}
              >
                {acting ? "..." : "End Game"}
              </button>
            </div>
          )}
          {!isHost && (
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>
              Waiting for host to continue...
            </p>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize: "1.1rem", color: "var(--text-light)", margin: "1rem 0" }}>
            All players were eliminated. Try again?
          </p>

          {isHost && (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
              <button onClick={handleRetry} disabled={acting}>
                {acting ? "..." : `Retry Level ${game.level}`}
              </button>
              <button className="btn-secondary" onClick={handleFinish} disabled={acting}>
                {acting ? "..." : "End Game"}
              </button>
            </div>
          )}
          {!isHost && (
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>
              Waiting for host...
            </p>
          )}
        </>
      )}
    </div>
  );
}
