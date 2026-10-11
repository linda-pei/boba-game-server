import { useState } from "react";
import { useAuthContext } from "../../hooks/useAuthContext";
import { useRoom } from "../../hooks/useRoom";
import type { CloverClueZone, CloverPlacement, CloverRotation, CloverSlot } from "../../types";
import ConfirmButton from "../../components/shared/ConfirmButton";
import GameBanner from "../../components/shared/GameBanner";
import GameEndButtons from "../../components/shared/GameEndButtons";
import { PlayerScoreRow, PlayerScores } from "../../components/shared/PlayerScores";
import ResignButton from "../../components/shared/ResignButton";
import TurnStatus from "../../components/shared/TurnStatus";
import { getCardIdAtSlot, getCloverClueWarning, getCloverRank, getOuterKeywordPairs, isCompleteCloverPlacement, rotateCloverWords } from "./engine";
import {
  advanceCloverRound,
  lockCloverGuess,
  placeCloverGuessCard,
  submitCloverClues,
  useCloverGame,
  useCloverPrivateBoard,
  verifyCloverGuess,
} from "./useCloverGame";
import "./clover.css";

const SLOTS: Array<{ id: CloverSlot; label: string }> = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

const CLUE_ZONES: Array<{ id: CloverClueZone; label: string }> = [
  { id: "top", label: "Top clue" },
  { id: "right", label: "Right clue" },
  { id: "bottom", label: "Bottom clue" },
  { id: "left", label: "Left clue" },
];

const EMPTY_CLUES: Record<CloverClueZone, string> = { top: "", right: "", bottom: "", left: "" };

type PlacementMap = Record<string, CloverPlacement>;

function nextPlacement(map: PlacementMap, cardId: string, slot: CloverSlot): PlacementMap {
  const placement = map[cardId];
  const result = { ...map };
  delete result[cardId];

  Object.entries(result).forEach(([placedCardId, placed]) => {
    if (placed.slot === slot) delete result[placedCardId];
  });

  result[cardId] = { slot, rotation: placement?.rotation ?? 0 };
  return result;
}

function rotatePlacement(map: PlacementMap, cardId: string): CloverPlacement | null {
  const placement = map[cardId];
  if (!placement) return null;
  return { ...placement, rotation: ((placement.rotation + 90) % 360) as CloverPlacement["rotation"] };
}

function CloverCardFace({
  card,
  placement,
  trayRotation = 0,
  selected = false,
  locked = false,
  onSelect,
  onRotate,
  onDragStart,
  onDragEnd,
}: {
  card: { id: string; words: [string, string, string, string] };
  placement?: CloverPlacement;
  trayRotation?: CloverRotation;
  selected?: boolean;
  locked?: boolean;
  onSelect?: () => void;
  onRotate?: () => void;
  onDragStart?: (cardId: string) => void;
  onDragEnd?: () => void;
}) {
  const words = rotateCloverWords(card.words, placement?.rotation ?? trayRotation);
  const disabled = !onSelect && !locked;

  return (
    <div
      className={`game-card clover-card${selected ? " selected" : ""}${locked ? " clover-card--locked" : ""}${disabled ? " disabled" : ""}`}
      role={onSelect ? "button" : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={onSelect ? 0 : undefined}
      draggable={Boolean(onDragStart)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(event) => {
        if (onSelect && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
      onDragStart={(event) => {
        if (!onDragStart) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-clover-card", card.id);
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
    >
      <span className="clover-card__word clover-card__word--top">{words[0]}</span>
      <span className="clover-card__word clover-card__word--right">{words[1]}</span>
      <span className="clover-card__word clover-card__word--bottom">{words[2]}</span>
      <span className="clover-card__word clover-card__word--left">{words[3]}</span>
      {onRotate && !locked && (
        <button
          type="button"
          className="clover-card__rotate btn btn--secondary btn--sm"
          onClick={(event) => {
            event.stopPropagation();
            onRotate();
          }}
        >
          Rotate
        </button>
      )}
      {locked && <span className="clover-card__locked-label">Correct</span>}
    </div>
  );
}

function CloverGrid({
  cards,
  placement,
  selectedCardId,
  isDraggingCard,
  lockedCardIds = [],
  editable,
  onSlotClick,
  onCardSelect,
  onRotate,
  onCardDrop,
  onCardDragStart,
  onCardDragEnd,
}: {
  cards: { id: string; words: [string, string, string, string] }[];
  placement: PlacementMap;
  selectedCardId: string | null;
  isDraggingCard: boolean;
  lockedCardIds?: string[];
  editable: boolean;
  onSlotClick: (slot: CloverSlot) => void;
  onCardSelect: (cardId: string) => void;
  onRotate: (cardId: string) => void;
  onCardDrop: (cardId: string, slot: CloverSlot) => void;
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
}) {
  const [dropTargetSlot, setDropTargetSlot] = useState<CloverSlot | null>(null);
  // Clear a stale highlight when a drag ends outside any slot.
  if (!isDraggingCard && dropTargetSlot) setDropTargetSlot(null);

  return (
    <div className="clover-grid" aria-label="Clover board">
      {SLOTS.map(({ id, label }) => {
        const cardId = getCardIdAtSlot(placement, id);
        const card = cardId ? cards.find((item) => item.id === cardId) : null;
        const locked = cardId ? lockedCardIds.includes(cardId) : false;
        const canDrop = editable && !locked;

        return (
          <div
            key={id}
            className={`clover-slot${selectedCardId ? " clover-slot--ready" : ""}${canDrop && isDraggingCard ? " clover-slot--drop-ready" : ""}${dropTargetSlot === id ? " clover-slot--drop-target" : ""}`}
            role={canDrop ? "button" : undefined}
            tabIndex={canDrop ? 0 : undefined}
            onClick={() => {
              if (canDrop) onSlotClick(id);
            }}
            onKeyDown={(event) => {
              if (canDrop && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSlotClick(id);
              }
            }}
            onDragOver={(event) => {
              if (!canDrop) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetSlot(id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTargetSlot((current) => current === id ? null : current);
              }
            }}
            onDrop={(event) => {
              if (!canDrop) return;
              event.preventDefault();
              setDropTargetSlot(null);
              const droppedCardId = event.dataTransfer.getData("application/x-clover-card");
              if (cards.some((item) => item.id === droppedCardId)) onCardDrop(droppedCardId, id);
            }}
            aria-label={`${label} slot`}
          >
            {card && cardId ? (
              <CloverCardFace
                card={card}
                placement={placement[cardId]}
                selected={selectedCardId === cardId}
                locked={locked}
                onSelect={editable && !locked ? () => onCardSelect(cardId) : undefined}
                onRotate={editable && !locked ? () => onRotate(cardId) : undefined}
                onDragStart={editable && !locked ? onCardDragStart : undefined}
                onDragEnd={onCardDragEnd}
              />
            ) : (
              <span className="clover-slot__empty">{selectedCardId && editable ? "Place here" : label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CloverGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useCloverGame(roomCode);
  const privateBoard = useCloverPrivateBoard(roomCode, uid);
  const [draftPlacement, setDraftPlacement] = useState<PlacementMap>({});
  const [draftClues, setDraftClues] = useState<Record<CloverClueZone, string>>(EMPTY_CLUES);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading || !room) return <p>Loading Clover…</p>;
  if (!game || !uid) return <p>Clover game not found.</p>;

  const myName = room.players[uid]?.name ?? "You";
  const activeRound = game.activeRound;
  const isSpectator = game.activeSpectatorUid === uid;
  const isDecisionMaker = game.activeDecisionMakerUid === uid;
  const hasSubmittedClues = game.submittedClueUids.includes(uid);
  const cluePairs = privateBoard ? getOuterKeywordPairs(privateBoard.sourceCards, draftPlacement) : null;
  const clueWarnings = Object.fromEntries(
    CLUE_ZONES.map(({ id }) => [id, getCloverClueWarning(draftClues[id], cluePairs?.[id])]),
  ) as Record<CloverClueZone, string | null>;
  const hasMultiWordClue = CLUE_ZONES.some(({ id }) => clueWarnings[id] === "One word only");

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      setSelectedCardId(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const placeDraftCard = (slot: CloverSlot) => {
    if (!selectedCardId) return;
    setDraftPlacement((current) => nextPlacement(current, selectedCardId, slot));
  };

  const dropDraftCard = (cardId: string, slot: CloverSlot) => {
    setSelectedCardId(cardId);
    setIsDraggingCard(false);
    setDraftPlacement((current) => nextPlacement(current, cardId, slot));
  };

  const guessRotation = (cardId: string): CloverRotation =>
    activeRound?.sharedPlacement[cardId]?.rotation ?? activeRound?.trayRotations?.[cardId] ?? 0;

  const placeGuessCard = (slot: CloverSlot) => {
    if (!selectedCardId || !activeRound || !isDecisionMaker) return;
    void run(() => placeCloverGuessCard(roomCode, uid, selectedCardId, {
      slot,
      rotation: guessRotation(selectedCardId),
    }));
  };

  const dropGuessCard = (cardId: string, slot: CloverSlot) => {
    if (!activeRound || !isDecisionMaker) return;
    setSelectedCardId(cardId);
    setIsDraggingCard(false);
    void run(() => placeCloverGuessCard(roomCode, uid, cardId, {
      slot,
      rotation: guessRotation(cardId),
    }));
  };

  const startDraggingCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsDraggingCard(true);
  };

  const phaseSubtitle: Record<typeof game.phase, string> = {
    "clue-writing": "create clues",
    "waiting-for-clues": "waiting",
    "solving-first": "first attempt",
    "solving-final": "final attempt",
    "board-result": "board resolved",
    finished: "team results",
  };

  return (
    <div className="game-screen-wrap clover-wrap">
      <GameBanner game="clover" subtitle={phaseSubtitle[game.phase]} actions={<ResignButton />} />
      <main className="screen clover-screen">
        <div className="clover-scorebar">
          <span>Team score <strong>{game.teamScore}</strong></span>
          <span>{game.completedSpectatorUids.length}/{game.playerOrder.length} Clovers resolved</span>
        </div>

        {(game.phase === "solving-first" || game.phase === "solving-final") && activeRound?.isLockedForVerification && (
          <TurnStatus mood={isSpectator ? "mine" : "waiting"}>
            {isSpectator
              ? "The team submitted its guess. Reveal how they did!"
              : `Guess submitted. Waiting for ${room.players[activeRound.spectatorUid]?.name ?? "the spectator"} to reveal it.`}
          </TurnStatus>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}

        {game.phase === "clue-writing" && privateBoard && !hasSubmittedClues && (
          <section className="clover-panel">
            <div className="clover-panel__heading">
              <div>
                <h3>Create your Clover</h3>
              </div>
              <p>Place all four cards, then write one clue for each outer pair.</p>
            </div>

            <div className="clover-board-layout">
              <div className="clover-clues clover-clues--editing">
                {CLUE_ZONES.map(({ id, label }) => {
                  const warning = clueWarnings[id];
                  return (
                    <label key={id} className={`clover-clue clover-clue--${id}`}>
                      <span>{label}</span>
                      {cluePairs && <small>{cluePairs[id].join(" + ")}</small>}
                      <input
                        value={draftClues[id]}
                        onChange={(event) => setDraftClues((current) => ({ ...current, [id]: event.target.value }))}
                        maxLength={40}
                        placeholder="One word"
                        aria-invalid={warning ? true : undefined}
                        className={warning ? "clover-clue__input--invalid" : undefined}
                      />
                      {warning && <em className="clover-clue__warning" role="alert">{warning}</em>}
                    </label>
                  );
                })}
              </div>
              <CloverGrid
                cards={privateBoard.sourceCards}
                placement={draftPlacement}
                selectedCardId={selectedCardId}
                isDraggingCard={isDraggingCard}
                editable
                onSlotClick={placeDraftCard}
                onCardSelect={setSelectedCardId}
                onRotate={(cardId) => setDraftPlacement((current) => {
                  const rotated = rotatePlacement(current, cardId);
                  return rotated ? { ...current, [cardId]: rotated } : current;
                })}
                onCardDrop={dropDraftCard}
                onCardDragStart={startDraggingCard}
                onCardDragEnd={() => setIsDraggingCard(false)}
              />
            </div>

            <div className="clover-tray">
              <h4>Choose or drag a card into a Clover slot</h4>
              <div className="clover-tray__cards">
                {privateBoard.sourceCards.filter((card) => !draftPlacement[card.id]).map((card) => (
                  <CloverCardFace
                    key={card.id}
                    card={card}
                    placement={draftPlacement[card.id]}
                    selected={selectedCardId === card.id}
                    onSelect={() => setSelectedCardId((current) => current === card.id ? null : card.id)}
                    onDragStart={startDraggingCard}
                    onDragEnd={() => setIsDraggingCard(false)}
                  />
                ))}
              </div>
            </div>

            <ConfirmButton
              label="Lock clues"
              confirmLabel="Lock my Clover?"
              busyLabel="Locking…"
              variant="primary"
              className="clover-lock-clues"
              disabled={busy || hasMultiWordClue}
              onConfirm={() => run(() => submitCloverClues(roomCode, uid, draftPlacement, draftClues))}
            />
          </section>
        )}

        {game.phase === "clue-writing" && hasSubmittedClues && (
          <section className="clover-panel clover-waiting">
            <p className="eyebrow">Clues locked</p>
            <h3>Nice work, {myName}.</h3>
            <p>Waiting for the other players to finish their secret Clovers.</p>
            <div className="clover-progress"><span style={{ width: `${(game.submittedClueUids.length / game.playerOrder.length) * 100}%` }} /></div>
            <p>{game.submittedClueUids.length} of {game.playerOrder.length} players are ready.</p>
          </section>
        )}

        {(game.phase === "solving-first" || game.phase === "solving-final") && activeRound && (
          <section className="clover-panel">
            <div className="clover-panel__heading">
              <div>
                <p className="eyebrow">{game.phase === "solving-final" ? "Final attempt" : "First attempt"}</p>
                <h3>{room.players[activeRound.spectatorUid]?.name ?? "A player"}&apos;s Clover</h3>
              </div>
              <p>{isSpectator ? "You are the spectator. Stay silent while the team solves your Clover." : isDecisionMaker ? "You're making the final placements." : `${room.players[game.activeDecisionMakerUid ?? ""]?.name ?? "The decision-maker"} controls the shared board - work together to figure it out!`}</p>
            </div>

            <div className="clover-board-layout clover-board-layout--solving">
              <div className="clover-clues">
                {CLUE_ZONES.map(({ id, label }) => (
                  <div key={id} className={`clover-clue clover-clue--${id}`}>
                    <span>{label}</span>
                    <strong>{activeRound.clues[id]}</strong>
                  </div>
                ))}
              </div>
              <CloverGrid
                cards={activeRound.candidateCards}
                placement={activeRound.sharedPlacement}
                selectedCardId={selectedCardId}
                isDraggingCard={isDraggingCard}
                lockedCardIds={activeRound.lockedCorrectCardIds}
                editable={isDecisionMaker && !activeRound.isLockedForVerification && !busy}
                onSlotClick={placeGuessCard}
                onCardSelect={(cardId) => isDecisionMaker && setSelectedCardId((current) => current === cardId ? null : cardId)}
                onRotate={(cardId) => {
                  const rotated = rotatePlacement(activeRound.sharedPlacement, cardId);
                  if (rotated) void run(() => placeCloverGuessCard(roomCode, uid, cardId, rotated));
                }}
                onCardDrop={dropGuessCard}
                onCardDragStart={startDraggingCard}
                onCardDragEnd={() => setIsDraggingCard(false)}
              />
            </div>

            <div className="clover-tray">
              <h4>
                {isSpectator
                  ? "Your cards are locked while the team guesses your Clover"
                  : isDecisionMaker ? "Choose or drag a candidate into a slot" : "Candidate cards"}
              </h4>
              <div className="clover-tray__cards">
                {activeRound.candidateCards.filter((card) => !activeRound.sharedPlacement[card.id]).map((card) => (
                  <CloverCardFace
                    key={card.id}
                    card={card}
                    placement={activeRound.sharedPlacement[card.id]}
                    trayRotation={activeRound.trayRotations?.[card.id]}
                    selected={selectedCardId === card.id}
                    locked={activeRound.lockedCorrectCardIds.includes(card.id)}
                    onSelect={isDecisionMaker && !activeRound.isLockedForVerification && !activeRound.lockedCorrectCardIds.includes(card.id)
                      ? () => setSelectedCardId((current) => current === card.id ? null : card.id)
                      : undefined}
                    onDragStart={isDecisionMaker && !activeRound.isLockedForVerification && !activeRound.lockedCorrectCardIds.includes(card.id)
                      ? startDraggingCard
                      : undefined}
                    onDragEnd={() => setIsDraggingCard(false)}
                  />
                ))}
              </div>
            </div>

            {isDecisionMaker && !activeRound.isLockedForVerification && (
              <div className="clover-actions">
                {selectedCardId && !activeRound.lockedCorrectCardIds.includes(selectedCardId) && activeRound.sharedPlacement[selectedCardId] && (
                  <button className="btn btn--danger" type="button" onClick={() => void run(() => placeCloverGuessCard(roomCode, uid, selectedCardId, null))} disabled={busy}>Return selected card</button>
                )}
                <button
                  className="btn"
                  type="button"
                  disabled={busy || !isCompleteCloverPlacement(activeRound.sharedPlacement, activeRound.candidateCards)}
                  onClick={() => void run(() => lockCloverGuess(roomCode, uid))}
                >
                  Submit guess
                </button>
              </div>
            )}

            {activeRound.isLockedForVerification && isSpectator && (
              <div className="clover-actions">
                <button className="btn" type="button" disabled={busy} onClick={() => void run(() => verifyCloverGuess(roomCode, uid))}>
                  {busy ? "Revealing…" : "Reveal the guess"}
                </button>
              </div>
            )}

          </section>
        )}

        {game.phase === "board-result" && game.activeSpectatorUid && (
          <section className="clover-panel clover-result">
            <p className="eyebrow">Board resolved</p>
            <h3>{game.lastAction}</h3>
            <p>Team score: <strong>{game.teamScore}</strong></p>
            {isDecisionMaker && (
              <button className="btn" type="button" disabled={busy} onClick={() => void run(() => advanceCloverRound(roomCode, uid))}>
                Continue to the next Clover
              </button>
            )}
          </section>
        )}

        {game.phase === "finished" && (
          <section className="clover-panel clover-result">
            <p className="eyebrow">Game complete</p>
            <h3>Final team score: {game.teamScore}</h3>
            {(() => {
              const rank = getCloverRank(game.teamScore, game.playerOrder.length);
              return (
                <div className="clover-rank">
                  <strong>{rank.name}</strong>
                  <span>{rank.description}</span>
                </div>
              );
            })()}
            <PlayerScores title="Clover Results" className="clover-results">
              {[...game.playerOrder]
                .sort((a, b) => (game.boardResults[b]?.score ?? 0) - (game.boardResults[a]?.score ?? 0))
                .map((playerUid) => {
                  const result = game.boardResults[playerUid];
                  return (
                    <PlayerScoreRow
                      key={playerUid}
                      name={`${room.players[playerUid]?.name ?? "Player"}'s Clover`}
                      isYou={playerUid === uid}
                      isActive={result?.firstAttemptPerfect}
                    >
                      <span className="score-detail">
                        {result?.firstAttemptPerfect
                          ? "Perfect first try"
                          : `${result?.correctCardIds.length ?? 0}/4 cards correct`}
                      </span>
                      <span className="score-cumulative">{result?.score ?? 0} pts</span>
                    </PlayerScoreRow>
                  );
                })}
            </PlayerScores>
            <GameEndButtons isHost={room.host === uid} />
          </section>
        )}
      </main>
    </div>
  );
}
