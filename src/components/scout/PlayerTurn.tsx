import { useState, useEffect, useRef } from "react";
import type { ScoutGame, ScoutHand, ScoutCard, Room } from "../../types";
import {
  playScoutCards,
  scoutCard,
  scoutAndPlay,
  useAllScoutHandInfo,
} from "../../hooks/useScoutGame";
import { validatePlay, beatsCurrentPile, flipCard } from "../../utils/scoutDeck";
import HandDisplay from "./HandDisplay";
import CenterPile from "./CenterPile";
import ScoreBoard from "./ScoreBoard";

type ActionMode = "play" | "scout" | "scout+play";
type ScoutPlayStep = "scout" | "play";

interface PlayerTurnProps {
  roomCode: string;
  game: ScoutGame;
  hand: ScoutHand | null;
  uid: string;
  room: Room;
}

export default function PlayerTurn({
  roomCode,
  game,
  hand,
  uid,
  room,
}: PlayerTurnProps) {
  // Default mode is "play" — cards are always selectable on your turn
  const [mode, setMode] = useState<ActionMode>("play");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [acting, setActing] = useState(false);
  const prevIsMyTurn = useRef(false);

  // Snapshot of hand frozen at action time — prevents flicker from Firestore partial updates
  const [frozenHand, setFrozenHand] = useState<ScoutCard[] | null>(null);

  // Scout state
  const [scoutEnd, setScoutEnd] = useState<"left" | "right" | null>(null);
  const [scoutFlip, setScoutFlip] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  // Scout+Play state
  const [spStep, setSpStep] = useState<ScoutPlayStep>("scout");
  const [spScoutParams, setSpScoutParams] = useState<{
    fromEnd: "left" | "right";
    flipIt: boolean;
    insertAtIndex: number;
  } | null>(null);
  const [spSimulatedHand, setSpSimulatedHand] = useState<ScoutCard[] | null>(null);
  const [spSimulatedPile, setSpSimulatedPile] = useState<ScoutCard[] | null>(null);

  const handInfo = useAllScoutHandInfo(roomCode, game.turnOrder);

  const isMyTurn = game.turnOrder[game.currentTurn] === uid;
  const currentPlayerName =
    room.players[game.turnOrder[game.currentTurn]]?.name ?? "Unknown";
  const isCenterEmpty = !game.centerPile;
  const canScoutPlay = hand && !hand.hasUsedScoutPlay && !isCenterEmpty;

  const resetAllState = () => {
    setMode("play");
    setSelectedIndices(new Set());
    setActing(false);
    setFrozenHand(null);
    setScoutEnd(null);
    setScoutFlip(false);
    setInsertIndex(null);
    setSpStep("scout");
    setSpScoutParams(null);
    setSpSimulatedHand(null);
    setSpSimulatedPile(null);
  };

  // Reset all state when turn changes (covers both "my turn ended" and "my turn started again")
  useEffect(() => {
    if (prevIsMyTurn.current !== isMyTurn) {
      resetAllState();
      prevIsMyTurn.current = isMyTurn;
    }
  }, [isMyTurn]);

  // ---- Card selection (play mode) ----
  const toggleCard = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const getPlayValidation = () => {
    if (!hand) return null;
    const cardsToCheck =
      mode === "scout+play" && spStep === "play" && spSimulatedHand
        ? spSimulatedHand
        : hand.cards;
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return null;
    }
    const selected = sorted.map((i) => cardsToCheck[i]);
    if (selected.length === 0) return null;
    return validatePlay(selected);
  };

  const canPlayNow = () => {
    const v = getPlayValidation();
    if (!v || !v.valid) return false;
    if (mode === "scout+play" && spStep === "play") {
      if (game.centerPile) {
        const pileCards = [...game.centerPile.cards];
        if (spScoutParams) {
          if (spScoutParams.fromEnd === "left") pileCards.shift();
          else pileCards.pop();
        }
        if (pileCards.length > 0) {
          const incumbent = validatePlay(pileCards);
          if (incumbent.valid && !beatsCurrentPile(v, incumbent)) return false;
        }
      }
      return true;
    }
    if (game.centerPile) {
      const incumbent = validatePlay(game.centerPile.cards);
      if (!beatsCurrentPile(v, incumbent)) return false;
    }
    return true;
  };

  const handlePlay = async () => {
    if (!hand) return;
    setFrozenHand(hand.cards);
    setActing(true);
    try {
      await playScoutCards(roomCode, game, uid, [...selectedIndices]);
    } catch (err) {
      console.error("Play failed:", err);
      setActing(false);
      setFrozenHand(null);
    }
  };

  // ---- Scout mode ----
  const handleScoutEnd = (end: "left" | "right") => {
    setScoutEnd(end);
    setScoutFlip(false);
  };

  const handleScoutConfirm = async () => {
    if (scoutEnd === null || insertIndex === null || !hand) return;
    setFrozenHand(hand.cards);
    setActing(true);
    try {
      await scoutCard(roomCode, game, uid, scoutEnd, scoutFlip, insertIndex);
    } catch (err) {
      console.error("Scout failed:", err);
      setActing(false);
      setFrozenHand(null);
    }
  };

  // ---- Scout+Play mode ----
  const handleSpScoutEnd = (end: "left" | "right") => {
    setScoutEnd(end);
    setScoutFlip(false);
    setInsertIndex(null);
  };

  const handleSpScoutConfirm = () => {
    if (!hand || !game.centerPile || scoutEnd === null || insertIndex === null) return;

    const pileCards = [...game.centerPile.cards];
    const takenCard = scoutEnd === "left" ? pileCards.shift()! : pileCards.pop()!;
    const cardToInsert = scoutFlip ? flipCard(takenCard) : takenCard;

    const simHand = [...hand.cards];
    simHand.splice(insertIndex, 0, cardToInsert);

    setSpScoutParams({ fromEnd: scoutEnd, flipIt: scoutFlip, insertAtIndex: insertIndex });
    setSpSimulatedHand(simHand);
    setSpSimulatedPile(pileCards);
    setSpStep("play");
    setSelectedIndices(new Set());
  };

  const handleSpPlay = async () => {
    if (!spScoutParams || !spSimulatedHand) return;
    setFrozenHand(spSimulatedHand);
    setActing(true);
    try {
      await scoutAndPlay(roomCode, game, uid, spScoutParams, [...selectedIndices]);
    } catch (err) {
      console.error("Scout+Play failed:", err);
      setActing(false);
      setFrozenHand(null);
    }
  };

  const scoutedCardPreview = () => {
    if (!game.centerPile || scoutEnd === null) return null;
    const cards = game.centerPile.cards;
    const card = scoutEnd === "left" ? cards[0] : cards[cards.length - 1];
    return scoutFlip ? flipCard(card) : card;
  };

  if (!hand) return <p>Loading hand...</p>;

  const inScoutMode = mode === "scout" || (mode === "scout+play" && spStep === "scout");

  return (
    <div className="screen scout-screen">
      <h2>Round {game.roundNumber}</h2>

      {/* Last action */}
      {game.lastAction && (() => {
        const prevIndex = (game.currentTurn - 1 + game.turnOrder.length) % game.turnOrder.length;
        const prevName = room.players[game.turnOrder[prevIndex]]?.name ?? "Unknown";
        return (
          <p style={{ fontSize: "0.85rem", color: "var(--text-light)", margin: "0 0 0.5rem" }}>
            {prevName} {game.lastAction}
          </p>
        );
      })()}

      {/* Turn status */}
      <div className={`turn-status${isMyTurn ? " my-turn" : ""}`}>
        {isMyTurn ? "Your turn!" : `${currentPlayerName}'s turn`}
      </div>

      {/* Center pile — show reduced pile during S+S play step */}
      {game.centerPile ? (
        mode === "scout+play" && spStep === "play" && spSimulatedPile ? (
          spSimulatedPile.length > 0 ? (
            <CenterPile
              cards={spSimulatedPile}
              playedBy={game.centerPile.playedBy}
              playerName={room.players[game.centerPile.playedBy]?.name ?? "Unknown"}
            />
          ) : (
            <div className="center-pile">
              <p style={{ color: "var(--text-light)" }}>Pile cleared by scout — play any valid set.</p>
            </div>
          )
        ) : (
          <CenterPile
            cards={game.centerPile.cards}
            playedBy={game.centerPile.playedBy}
            playerName={room.players[game.centerPile.playedBy]?.name ?? "Unknown"}
            scouting={isMyTurn && inScoutMode}
            onScoutEnd={mode === "scout" ? handleScoutEnd : handleSpScoutEnd}
          />
        )
      ) : (
        <div className="center-pile">
          <p style={{ color: "var(--text-light)" }}>No cards played yet.</p>
        </div>
      )}

      {/* Scouted card preview */}
      {isMyTurn && inScoutMode && scoutEnd !== null && (
        <div style={{ margin: "0.75rem 0", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
            Scouted card ({scoutEnd} end):
          </p>
          {(() => {
            const card = scoutedCardPreview();
            if (!card) return null;
            return (
              <div className="scout-card" style={{ display: "inline-flex" }}>
                <span className="scout-card-top">{card.top}</span>
                <span className="scout-card-divider" />
                <span className="scout-card-bottom">{card.bottom}</span>
              </div>
            );
          })()}
          <div style={{ marginTop: "0.5rem" }}>
            <button
              className="btn-small btn-secondary"
              onClick={() => setScoutFlip(!scoutFlip)}
            >
              {scoutFlip ? "Unflip" : "Flip"}
            </button>
          </div>
          <p style={{ fontSize: "0.8rem", margin: "0.5rem 0 0", color: "var(--text-light)" }}>
            Tap a + slot in your hand to insert
          </p>
        </div>
      )}

      {/* Hand — frozen during acting to prevent flicker from partial Firestore updates */}
      {acting && frozenHand ? (
        <HandDisplay
          cards={frozenHand}
          selectedIndices={selectedIndices}
        />
      ) : mode === "scout+play" && spStep === "play" && spSimulatedHand ? (
        <>
          <p style={{ fontSize: "0.85rem", margin: "0.5rem 0" }}>
            Now select consecutive cards to play:
          </p>
          <HandDisplay
            cards={spSimulatedHand}
            selectedIndices={selectedIndices}
            onToggle={toggleCard}
          />
        </>
      ) : (
        <HandDisplay
          cards={hand.cards}
          selectedIndices={isMyTurn && mode === "play" ? selectedIndices : undefined}
          onToggle={isMyTurn && mode === "play" ? toggleCard : undefined}
          insertMode={isMyTurn && inScoutMode && scoutEnd !== null}
          onInsert={setInsertIndex}
          insertIndex={insertIndex}
        />
      )}

      {/* Action bar — Play button appears when cards are selected; Scout/S+P buttons always visible */}
      {isMyTurn && (
        <div className="scout-actions">
          {/* Play button (when in play mode and cards are selected) */}
          {mode === "play" && selectedIndices.size > 0 && (
            <button onClick={handlePlay} disabled={acting || !canPlayNow()}>
              {acting ? "Playing..." : "Play"}
            </button>
          )}

          {/* Scout + Play confirm buttons */}
          {mode === "scout" && scoutEnd !== null && insertIndex !== null && (
            <button onClick={handleScoutConfirm} disabled={acting}>
              {acting ? "Scouting..." : "Confirm Scout"}
            </button>
          )}
          {mode === "scout+play" && spStep === "scout" && scoutEnd !== null && insertIndex !== null && (
            <button onClick={handleSpScoutConfirm}>
              Next: Select Cards to Play
            </button>
          )}
          {mode === "scout+play" && spStep === "play" && (
            <button onClick={handleSpPlay} disabled={acting || !canPlayNow()}>
              {acting ? "Playing..." : "Confirm Scout + Show"}
            </button>
          )}

          {/* Mode switchers */}
          {!isCenterEmpty && mode === "play" && (
            <button className="btn-secondary" onClick={() => { setMode("scout"); setSelectedIndices(new Set()); if (game.centerPile?.cards.length === 1) setScoutEnd("left"); }}>
              Scout
            </button>
          )}
          {canScoutPlay && mode === "play" && (
            <button className="btn-secondary" onClick={() => { setMode("scout+play"); setSpStep("scout"); setSelectedIndices(new Set()); if (game.centerPile?.cards.length === 1) setScoutEnd("left"); }}>
              Scout + Show
            </button>
          )}

          {/* Cancel back to play mode */}
          {mode !== "play" && (
            <button className="btn-danger btn-small" onClick={resetAllState}>Cancel</button>
          )}
        </div>
      )}

      <ScoreBoard game={game} room={room} handInfo={handInfo} currentUid={uid} />
    </div>
  );
}
