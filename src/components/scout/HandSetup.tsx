import { useState } from "react";
import type { ScoutGame, ScoutHand, ScoutCard, Room } from "../../types";
import { confirmHandOrientation } from "../../hooks/useScoutGame";
import { flipHand } from "../../utils/scoutDeck";
import HandDisplay from "./HandDisplay";

interface HandSetupProps {
  roomCode: string;
  game: ScoutGame;
  hand: ScoutHand | null;
  uid: string;
  room: Room;
}

export default function HandSetup({ roomCode, game, hand, uid, room }: HandSetupProps) {
  const [previewing, setPreviewing] = useState<"normal" | "flipped">("normal");
  const [confirming, setConfirming] = useState(false);
  const [frozenCards, setFrozenCards] = useState<ScoutCard[] | null>(null);

  const confirmed = game.setupConfirmed[uid];
  const waitingOn = game.turnOrder.filter((pid) => !game.setupConfirmed[pid]);

  if (confirmed) {
    return (
      <div className="screen scout-screen">
        <h2>Round {game.roundNumber}</h2>
        <p>Hand confirmed! Waiting for others...</p>
        {frozenCards && <HandDisplay cards={frozenCards} />}
        <div className="player-list-grid">
          {waitingOn.map((pid) => (
            <div key={pid} className="player-chip">
              {room.players[pid]?.name ?? pid}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hand) return <p>Loading hand...</p>;

  const displayCards =
    previewing === "flipped" ? flipHand(hand.cards) : hand.cards;

  const handleConfirm = async () => {
    setFrozenCards(displayCards);
    setConfirming(true);
    try {
      await confirmHandOrientation(roomCode, uid, previewing === "flipped");
    } catch (err) {
      console.error("Failed to confirm hand:", err);
      setConfirming(false);
      setFrozenCards(null);
    }
  };

  return (
    <div className="screen scout-screen">
      <h2>Round {game.roundNumber} — Choose Orientation</h2>
      <p>You may flip your entire hand (reverses order and swaps all numbers). Pick the orientation you want to keep.</p>
      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        {game.turnOrder[game.currentTurn] === uid
          ? "You're going first this round!"
          : `${room.players[game.turnOrder[game.currentTurn]]?.name ?? "Unknown"} goes first this round.`}
      </p>

      {confirming ? (
        <HandDisplay cards={frozenCards!} />
      ) : (
        <>
          <div className="mode-toggle" style={{ maxWidth: 300, margin: "1rem auto" }}>
            <button
              className={`mode-toggle-btn${previewing === "normal" ? " active" : ""}`}
              onClick={() => setPreviewing("normal")}
            >
              Normal
            </button>
            <button
              className={`mode-toggle-btn${previewing === "flipped" ? " active" : ""}`}
              onClick={() => setPreviewing("flipped")}
            >
              Flipped
            </button>
          </div>

          <HandDisplay cards={displayCards} />
        </>
      )}

      <button
        onClick={handleConfirm}
        disabled={confirming}
        style={{ marginTop: "1rem" }}
      >
        {confirming ? "Confirming..." : "Confirm Hand"}
      </button>
    </div>
  );
}
