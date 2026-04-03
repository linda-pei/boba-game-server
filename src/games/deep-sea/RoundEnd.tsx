import { useState } from "react";
import type { DeepSeaGame, DeepSeaHand, Room } from "../../types";
import { processRoundEnd } from "./useDeepSeaGame";
import AirGauge from "./AirGauge";

interface Props {
  roomCode: string;
  game: DeepSeaGame;
  hand: DeepSeaHand | null;
  uid: string;
  room: Room;
}

export default function RoundEnd({
  roomCode,
  game,
  hand,
  uid,
  room,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const isHost = room.host === uid;

  const returnedPlayers: string[] = [];
  const drownedPlayers: { uid: string; position: number }[] = [];

  for (const [pid, diver] of Object.entries(game.divers)) {
    if (diver.returned) {
      returnedPlayers.push(pid);
    } else if (diver.position >= 0) {
      drownedPlayers.push({ uid: pid, position: diver.position });
    }
  }

  drownedPlayers.sort((a, b) => a.position - b.position);

  const handleNextRound = async () => {
    setProcessing(true);
    try {
      await processRoundEnd(roomCode, game);
    } catch (err) {
      console.error("Failed to process round end:", err);
      setProcessing(false);
    }
  };

  return (
    <div className="screen deep-sea-screen" style={{ textAlign: "center" }}>
      <h2>Round {game.round} Complete!</h2>
      <AirGauge air={game.air} />

      {game.air <= 0 && (
        <p style={{ color: "var(--accent-danger)", fontWeight: 600, margin: "0.5rem 0" }}>
          The air ran out!
        </p>
      )}

      {/* Returned players */}
      {returnedPlayers.length > 0 && (
        <div className="ds-round-section">
          <h3>Made it back!</h3>
          {returnedPlayers.map((pid) => {
            // Show scored treasures (revealed for the first time!)
            const isMe = pid === uid;
            return (
              <div key={pid} className="ds-round-player ds-safe">
                <span className="ds-player-name">
                  {room.players[pid]?.name}
                </span>
                {isMe && hand && (
                  <div className="ds-revealed-treasures">
                    {hand.scored
                      .slice(-hand.scored.length) // show all scored this round
                      .map((chip, i) => (
                        <span key={i} className={`ds-chip-reveal ds-level-${chip.level}`}>
                          {chip.points}pts
                        </span>
                      ))}
                    {hand.scored.length === 0 && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No treasures scored yet
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drowned players */}
      {drownedPlayers.length > 0 && (
        <div className="ds-round-section">
          <h3>Lost at sea!</h3>
          {drownedPlayers.map(({ uid: pid }) => {
            const diver = game.divers[pid];
            return (
              <div key={pid} className="ds-round-player ds-drowned">
                <span className="ds-player-name">
                  {room.players[pid]?.name}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Lost {diver.carriedCount} treasure{diver.carriedCount !== 1 ? "s" : ""} — dropped to the deep
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isHost && (
        <button
          onClick={handleNextRound}
          disabled={processing}
          style={{ marginTop: "1.5rem" }}
        >
          {processing
            ? "Processing..."
            : game.round >= 3
              ? "See Final Scores"
              : `Start Round ${game.round + 1}`}
        </button>
      )}

      {!isHost && (
        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
          Waiting for host to continue...
        </p>
      )}
    </div>
  );
}
