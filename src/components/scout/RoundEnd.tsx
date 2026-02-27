import { useState } from "react";
import type { ScoutGame, Room } from "../../types";
import { finalizeRound, startNextRound, useAllScoutHandInfo } from "../../hooks/useScoutGame";
import { useAuthContext } from "../../hooks/AuthContext";

interface RoundEndProps {
  roomCode: string;
  game: ScoutGame;
  room: Room;
}

export default function RoundEnd({ roomCode, game, room }: RoundEndProps) {
  const { uid } = useAuthContext();
  const [advancing, setAdvancing] = useState(false);
  const isHost = room.host === uid;
  const totalRounds = game.turnOrder.length;
  const isLastRound = game.roundNumber >= totalRounds;
  const handInfo = useAllScoutHandInfo(roomCode, game.turnOrder);

  const reasonText =
    game.roundEndReason === "hand-emptied"
      ? `${room.players[game.roundEndPlayer!]?.name ?? "A player"} emptied their hand!`
      : `${room.players[game.roundEndPlayer!]?.name ?? "A player"}'s play went uncontested!`;

  // Pre-compute per-player round breakdown
  const playerBreakdowns = game.turnOrder.map((pid) => {
    const s = game.scores[pid];
    const hi = handInfo[pid];
    const isUncontestedOwner =
      game.roundEndReason === "uncontested" && game.roundEndPlayer === pid;
    const handPenalty = isUncontestedOwner ? 0 : (hi?.cardCount ?? 0);
    const roundScore = (s?.capturedCount ?? 0) + (s?.dollarTokens ?? 0) - handPenalty;
    const projectedCumulative = (game.cumulativeScores[pid] ?? 0) + roundScore;

    return {
      pid,
      name: room.players[pid]?.name ?? pid,
      captured: s?.capturedCount ?? 0,
      tokens: s?.dollarTokens ?? 0,
      isUncontestedOwner,
      handPenalty,
      roundScore,
      projectedCumulative,
    };
  });

  const handleNextRound = async () => {
    setAdvancing(true);
    try {
      await finalizeRound(roomCode, game);
      if (!isLastRound) {
        await startNextRound(roomCode, game);
      }
    } catch (err) {
      console.error("Advance failed:", err);
      setAdvancing(false);
    }
  };

  return (
    <div className="screen">
      <h2>Round {game.roundNumber} Complete</h2>
      <p>{reasonText}</p>

      <div className="score-board">
        <h4>Round Scores</h4>
        <div className="score-grid">
          {playerBreakdowns.map((p) => (
            <div key={p.pid} className="score-row">
              <span className="score-name">
                {p.name}
                {p.pid === uid && <span className="score-you"> (you)</span>}
              </span>
              <span className="score-detail">
                +{p.captured} captured, +{p.tokens} tokens,{" "}
                {p.isUncontestedOwner ? (
                  <span style={{ color: "var(--accent-secondary)" }}>0 hand (uncontested)</span>
                ) : (
                  <span style={{ color: "var(--accent-danger)" }}>-{p.handPenalty} hand</span>
                )}
              </span>
              <span className="score-round">
                = {p.roundScore}
              </span>
              <span className="score-cumulative">
                Total: {p.projectedCumulative}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <button onClick={handleNextRound} disabled={advancing} style={{ marginTop: "1rem" }}>
          {advancing
            ? "Starting..."
            : isLastRound
              ? "See Final Scores"
              : "Next Round"}
        </button>
      )}

      {!isHost && (
        <p style={{ fontSize: "0.85rem", marginTop: "1rem", color: "var(--text-light)" }}>
          Waiting for host to continue...
        </p>
      )}
    </div>
  );
}
