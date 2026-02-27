import { useState } from "react";
import { submitKnowerSetup, discardKnowerCards } from "../../hooks/useGame";
import { getZones, findZone } from "../../utils/zones";
import { RING_COLORS, RING_CATEGORIES } from "../../utils/vennPaths";
import RingDisplay from "./RingDisplay";
import type { Game, Hand } from "../../types";

interface Props {
  roomCode: string;
  game: Game;
  hand: Hand;
  uid: string;
}

export default function KnowerSetup({ roomCode, game, hand, uid }: Props) {
  const [ringLabels, setRingLabels] = useState<string[]>(
    game.rings.map((r) => r.label)
  );
  const [assignments, setAssignments] = useState<Record<string, number[]>>({});
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const zones = getZones();
  const cards = hand.cards;
  const assignedCards = Object.keys(assignments);
  const needToAssign = game.numSetupCards;

  const handleAssign = (cardId: string, rings: number[]) => {
    setAssignments((prev) => ({ ...prev, [cardId]: rings }));
    setSelectedCard(null);
  };

  const handleRemoveAssignment = (cardId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleZoneClick = (rings: number[]) => {
    if (selectedCard) {
      handleAssign(selectedCard, rings);
    }
  };

  const allAssigned = assignedCards.length === needToAssign;
  const canSubmit =
    allAssigned && ringLabels.every((l) => l.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitKnowerSetup(roomCode, ringLabels, assignments);
      await discardKnowerCards(roomCode, uid, Object.keys(assignments), game.mode === "coop");
    } catch (err) {
      console.error("Failed to submit knower setup:", err);
      setSubmitting(false);
    }
  };

  // Build playedCards for the diagram from current assignments
  const diagramCards = Object.entries(assignments).map(([cardId, rings]) => ({
    cardId,
    rings,
  }));

  return (
    <div className="knower-setup screen">
      <h2>Knower Setup</h2>
      <p>Set a clue for each ring category, then assign your cards to zones on the diagram.</p>

      <div className="ring-labels">
        <h3>Ring Clues</h3>
        {ringLabels.map((label, i) => (
          <div key={i} className="ring-label-input">
            <span className="ring-dot" style={{ backgroundColor: RING_COLORS[i] }} />
            <span style={{ fontWeight: 600, minWidth: "5.5em" }}>{RING_CATEGORIES[i]}:</span>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                const next = [...ringLabels];
                next[i] = e.target.value;
                setRingLabels(next);
              }}
              placeholder={`Clue for ${RING_CATEGORIES[i].toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      <h3>
        Assign Cards ({assignedCards.length}/{needToAssign} required)
      </h3>

      {selectedCard && (
        <div className="turn-status my-turn">
          Placing <strong>{selectedCard}</strong> — click a zone on the diagram
        </div>
      )}

      <RingDisplay
        ringLabels={ringLabels}
        showClues
        playedCards={diagramCards}
        interactive={!!selectedCard}
        onZoneClick={handleZoneClick}
      />

      <div className="hand">
        {cards.map((card) => {
          const isAssigned = assignments[card] !== undefined;
          const isSelected = selectedCard === card;
          const zone = isAssigned ? findZone(zones, assignments[card]) : null;

          return (
            <div key={card} style={{ textAlign: "center" }}>
              <div
                className={`game-card${isSelected ? " selected" : ""}`}
                onClick={() => {
                  if (isAssigned) return;
                  if (!allAssigned) {
                    setSelectedCard(isSelected ? null : card);
                  }
                }}
                style={isAssigned ? { opacity: 0.5, cursor: "default" } : undefined}
              >
                {card}
              </div>
              {isAssigned && (
                <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  <span style={{ color: "var(--text-light)" }}>{zone?.label}</span>
                  <br />
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleRemoveAssignment(card)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{ marginTop: "1rem" }}
      >
        {submitting ? "Submitting..." : "Confirm Setup"}
      </button>
      {!canSubmit && (
        <p style={{ fontSize: "0.8rem" }}>
          Assign exactly {needToAssign} cards and fill in all ring clues
        </p>
      )}
    </div>
  );
}
