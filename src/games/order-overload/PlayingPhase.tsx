import { useState, useEffect, useRef } from "react";
import type { OrderOverloadGame, OrderOverloadHand, Room } from "../../types";
import {
  submitGuess,
  respondToGuess,
  useAbilityDiscard,
  useAbilityLetters,
  useAllOrderOverloadHandCounts,
  getLevelStars,
} from "./useOrderOverloadGame";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";
import GameCard from "../../components/shared/GameCard";

interface Props {
  roomCode: string;
  game: OrderOverloadGame;
  hand: OrderOverloadHand | null;
  uid: string;
  room: Room;
}

const ABILITY_LABELS: Record<string, string> = {
  discard: "Discard a Card (cannot be used if only 1 card)",
  "first-letter": "Reveal First Letters",
  "last-letter": "Reveal Last Letters",
};

export default function PlayingPhase({ roomCode, game, hand, uid, room }: Props) {
  const [guessText, setGuessText] = useState("");
  const [acting, setActing] = useState(false);
  const [showAbility, setShowAbility] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmDontHave, setConfirmDontHave] = useState(false);
  const prevTurn = useRef(game.currentTurn);

  const handCounts = useAllOrderOverloadHandCounts(roomCode, game.turnOrder);

  const isMyTurn = game.turnOrder[game.currentTurn] === uid;
  const currentPlayerUid = game.turnOrder[game.currentTurn];
  const currentPlayerName = room.players[currentPlayerUid]?.name ?? "Unknown";
  const stars = getLevelStars(game.level);

  const isResponding = game.currentGuess !== null;
  const myAbility = game.abilities[uid];
  const abilityUsed = game.abilitiesUsed[uid];

  // Determine if it's my turn to respond
  const currentResponder = isResponding
    ? game.respondingOrder[game.respondingIndex]
    : null;
  const isMyResponse = currentResponder === uid;

  // Reset state when turn changes
  useEffect(() => {
    if (prevTurn.current !== game.currentTurn) {
      setGuessText("");
      setActing(false);
      setShowAbility(false);
      setSelectedCardIndex(null);
      setSelectedTarget(null);
      setConfirmDontHave(false);
      prevTurn.current = game.currentTurn;
    }
  }, [game.currentTurn]);

  // Reset state when a new guess comes in (or resolves)
  useEffect(() => {
    setSelectedCardIndex(null);
    setConfirmDontHave(false);
    if (game.currentGuess === null) {
      setGuessText("");
    }
  }, [game.currentGuess]);

  const handleSubmitGuess = async () => {
    if (!guessText.trim()) return;
    setActing(true);
    try {
      await submitGuess(roomCode, game, uid, guessText);
    } catch (err) {
      console.error("Submit guess failed:", err);
    }
    setActing(false);
  };

  const handleRespond = async (hasIt: boolean, cardIdx?: number) => {
    setActing(true);
    try {
      await respondToGuess(roomCode, game, uid, hasIt, cardIdx);
    } catch (err) {
      console.error("Respond failed:", err);
    }
    setActing(false);
  };

  const handleDiscard = async (cardIdx: number) => {
    setActing(true);
    try {
      await useAbilityDiscard(roomCode, game, uid, cardIdx);
      setShowAbility(false);
      setSelectedCardIndex(null);
    } catch (err) {
      console.error("Discard failed:", err);
    }
    setActing(false);
  };

  const handleLetterAbility = async (targetUid: string) => {
    setActing(true);
    try {
      await useAbilityLetters(roomCode, game, uid, targetUid);
      setShowAbility(false);
      setSelectedTarget(null);
    } catch (err) {
      console.error("Letter ability failed:", err);
    }
    setActing(false);
  };

  if (!hand) return <p>Loading hand...</p>;

  return (
    <div className="screen oo-screen">
      <h2>
        Level {game.level}
        {stars > 0 && <span className="oo-stars">{" "}{"★".repeat(stars)}</span>}
      </h2>

      {/* Turn status — right under level */}
      {isMyTurn && !isResponding && (
        <div className="turn-status turn-status--mine">
          Your turn!
        </div>
      )}
      {!isMyTurn && !isResponding && (
        <div className="turn-status turn-status--waiting">
          {currentPlayerName}'s turn to guess
        </div>
      )}

      {/* Last action */}
      {game.lastAction && (
        <p style={{ fontSize: "0.85rem", color: "var(--ink-mute)", margin: "0.5rem 0" }}>
          {(() => {
            const action = game.lastAction;
            let display = action;
            for (const pid of game.turnOrder) {
              const name = room.players[pid]?.name ?? pid;
              display = display.replaceAll(pid, name);
            }
            return display;
          })()}
        </p>
      )}

      {/* Ability reveals (persistent through level) */}
      {game.abilityReveals.length > 0 && (
        <div className="oo-hints">
          <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Hints:</p>
          {game.abilityReveals.map((reveal, i) => {
            const targetName = room.players[reveal.targetUid]?.name ?? "Unknown";
            const label = reveal.type === "first-letter" ? "First letters" : "Last letters";
            return (
              <p key={i} style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>
                {targetName}'s {label.toLowerCase()}: {reveal.letters.join(", ")}
              </p>
            );
          })}
        </div>
      )}

      {/* Responding phase */}
      {isResponding && (
        <div className="oo-guess-panel">
          <p style={{ fontSize: "0.9rem", margin: "0 0 0.5rem", color: "var(--ink-mute)" }}>
            {room.players[game.guessingPlayer!]?.name ?? "Unknown"} guessed:
          </p>
          <p className="oo-guess-word">
            "{game.currentGuess}"
          </p>

          {isMyResponse ? (
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
                Do you have this order?
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-mute)", margin: "0 0 0.75rem" }}>
                Your hand: {hand.cards.join(", ") || "(empty)"}
              </p>
              {selectedCardIndex !== null ? (
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                  <button className="btn btn--primary" onClick={() => handleRespond(true, selectedCardIndex)} disabled={acting}>
                    {acting ? "..." : `Reveal "${hand.cards[selectedCardIndex]}"`}
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => setSelectedCardIndex(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {hand.cards.length > 0 && (
                    <>
                      <p style={{ width: "100%", fontSize: "0.85rem", margin: "0 0 0.25rem" }}>
                        Tap a card to select it:
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                        {hand.cards.map((card, i) => (
                          <GameCard
                            key={i}
                            selected={selectedCardIndex === i}
                            onClick={() => setSelectedCardIndex(selectedCardIndex === i ? null : i)}
                          >
                            {card}
                          </GameCard>
                        ))}
                      </div>
                      <div style={{ width: "100%", marginTop: "0.5rem" }}>
                        {confirmDontHave ? (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button className="btn btn--danger" onClick={() => handleRespond(false)} disabled={acting}>
                              {acting ? "..." : "Yes, I don't have it"}
                            </button>
                            <button className="btn btn--secondary btn--sm" onClick={() => setConfirmDontHave(false)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn--danger" onClick={() => setConfirmDontHave(true)}>
                            I don't have it
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {hand.cards.length === 0 && (
                    confirmDontHave ? (
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                        <button className="btn btn--danger" onClick={() => handleRespond(false)} disabled={acting}>
                          {acting ? "..." : "Yes, I don't have it"}
                        </button>
                        <button className="btn btn--secondary btn--sm" onClick={() => setConfirmDontHave(false)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn--danger" onClick={() => setConfirmDontHave(true)}>
                        I don't have it
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--ink-mute)", fontSize: "0.9rem" }}>
              Waiting for {room.players[currentResponder!]?.name ?? "Unknown"} to respond...
            </p>
          )}
        </div>
      )}

      {/* Turn actions (only when it's my turn and no active guess) */}
      {isMyTurn && !isResponding && (
        <div style={{ marginTop: "1rem" }}>
          {/* Ability section */}
          {!abilityUsed && !showAbility && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowAbility(true)}
              disabled={myAbility === "discard" && hand.cards.length <= 1}
              style={{ marginBottom: "0.75rem" }}
            >
              Use Ability: {ABILITY_LABELS[myAbility]}
            </button>
          )}

          {showAbility && myAbility === "discard" && (
            <div className="oo-ability-panel">
              <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                Tap a card in your hand to discard it
              </p>
              {selectedCardIndex !== null && (
                <button className="btn btn--secondary btn--sm" onClick={() => handleDiscard(selectedCardIndex)} disabled={acting}>
                  {acting ? "..." : `Discard "${hand.cards[selectedCardIndex]}"`}
                </button>
              )}
              <button className="btn btn--danger btn--sm" onClick={() => { setShowAbility(false); setSelectedCardIndex(null); }} style={{ marginLeft: "0.5rem" }}>
                Cancel
              </button>
            </div>
          )}

          {showAbility && (myAbility === "first-letter" || myAbility === "last-letter") && (
            <div className="oo-ability-panel">
              <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                Choose a player to reveal their {myAbility === "first-letter" ? "first" : "last"} letters:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                {game.turnOrder
                  .filter((pid) => pid !== uid)
                  .map((pid) => (
                    <button
                      key={pid}
                      className={selectedTarget === pid ? "btn btn--primary btn--sm" : "btn btn--secondary btn--sm"}
                      onClick={() => {
                        if (selectedTarget === pid) {
                          handleLetterAbility(pid);
                        } else {
                          setSelectedTarget(pid);
                        }
                      }}
                      disabled={acting}
                    >
                      {selectedTarget === pid
                        ? acting ? "..." : `Confirm ${room.players[pid]?.name ?? "Unknown"}`
                        : room.players[pid]?.name ?? "Unknown"}
                    </button>
                  ))}
              </div>
              <button className="btn btn--danger btn--sm" onClick={() => { setShowAbility(false); setSelectedTarget(null); }} style={{ marginTop: "0.5rem" }}>
                Cancel
              </button>
            </div>
          )}

          {/* Guess input */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <input
              type="text"
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guessText.trim()) handleSubmitGuess();
              }}
              placeholder="Type an order..."
              disabled={acting}
              className="oo-guess-input"
            />
            <button className="btn btn--primary" onClick={handleSubmitGuess} disabled={acting || !guessText.trim()}>
              {acting ? "..." : "Guess"}
            </button>
          </div>
        </div>
      )}

      {/* Your hand (at bottom) */}
      <div style={{ margin: "1rem 0" }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Your hand:</p>
        {hand.cards.length > 0 ? (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {hand.cards.map((card, i) => (
              <div
                key={i}
                className={`oo-hand-chip${showAbility && myAbility === "discard" ? " discardable" : ""}${selectedCardIndex === i ? " chip-selected" : ""}`}
                onClick={() => {
                  if (showAbility && myAbility === "discard") {
                    setSelectedCardIndex(i);
                  }
                }}
              >
                {card}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--ink-mute)", fontSize: "0.85rem" }}>Hand empty!</p>
        )}
      </div>

      {/* Player board (at bottom) */}
      <PlayerScores>
        {game.turnOrder.map((pid) => {
          const name = room.players[pid]?.name ?? "Unknown";
          const isEliminated = game.eliminatedPlayers.includes(pid);
          const isEmptied = game.emptiedPlayers.includes(pid);
          const isCurrent = game.turnOrder[game.currentTurn] === pid;
          const isGuessing = (isResponding && game.guessingPlayer === pid) || (isCurrent && !isResponding);
          const isJudging = isResponding && currentResponder === pid;
          const cardCount = handCounts[pid] ?? 0;
          const isMe = pid === uid;
          const revealed = game.revealedCards?.[pid] ?? [];

          return (
            <PlayerScoreRow
              key={pid}
              name={name}
              isYou={isMe}
              isActive={isCurrent && !isResponding}
              className={isEliminated ? "oo-row-eliminated" : undefined}
            >
              <span className="oo-row-emoji">{isEliminated ? "x_x" : ":)"}</span>
              <span className="score-cards">
                {isEmptied ? "✓ done" : `${cardCount} cards`}
              </span>
              <span className="oo-row-action">
                {isGuessing && "Guessing..."}
                {isJudging && "Judging..."}
              </span>
              {revealed.length > 0 && (
                <span className="oo-row-revealed">Revealed: {revealed.join(", ")}</span>
              )}
            </PlayerScoreRow>
          );
        })}
      </PlayerScores>
    </div>
  );
}
