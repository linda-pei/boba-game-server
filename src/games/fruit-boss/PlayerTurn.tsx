import { useEffect, useState } from "react";
import type { FruitBossGame, FruitBossHand, Room } from "../../types";
import Marketplace from "./Marketplace";
import Collection from "./Collection";
import HandDisplay from "./HandDisplay";
import TurnStatus from "../../components/shared/TurnStatus";
import type { FruitSuit } from "../../types";
import {
  addToMarket,
  canCombine,
  canPlaceAt,
  canSlide,
  combineStacks,
  discardAndRedraw,
  endTurn,
  mergedStack,
  nextPromptForAdd,
  nextPromptForCombine,
  playCat,
  selectionForAdd,
  slideStack,
  useFruitBossHandCounts,
} from "./useFruitBossGame";
import { HAND_LIMIT, SUIT_LABEL } from "./deck";
import FruitIcon from "./FruitIcon";

interface Props {
  roomCode: string;
  game: FruitBossGame;
  hand: FruitBossHand | null;
  uid: string;
  room: Room;
}

type ActionMode = "add" | "combine" | "slide";

/**
 * What the current hand-card selection lets the player do.
 *  - "empty"     → nothing selected yet
 *  - "add"       → fruit/star (same suit). Click a stall to place.
 *  - "cat"       → exactly one cat card. Click a market card to eat it.
 *  - "invalid"   → mixed/incoherent (shouldn't normally happen since we
 *                  replace-on-incompatible, but kept as a guard).
 */
type AddIntent =
  | { kind: "empty" }
  | { kind: "add"; suit: FruitSuit | null }
  | { kind: "cat"; catCardId: string }
  | { kind: "invalid"; reason: string };

type AddOpts = { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit };

type PendingCtx =
  | { type: "add"; stallIdx: number; cardIds: string[]; opts: AddOpts }
  | { type: "combine"; sourceIdx: number; destIdx: number; opts: AddOpts };

type PendingChoice =
  | { kind: "topple"; choices: number[]; ctx: PendingCtx }
  | { kind: "collect-stall"; choices: number[]; ctx: PendingCtx }
  | { kind: "star-attach"; suits: FruitSuit[]; ctx: PendingCtx };

export default function PlayerTurn({ roomCode, game, hand, uid, room }: Props) {
  const isMyTurn = game.turnOrder[game.currentTurn] === uid;
  const currentUid = game.turnOrder[game.currentTurn];
  const currentName = room.players[currentUid]?.name ?? "?";
  const myName = room.players[uid]?.name ?? "Player";
  const opponentUids = game.turnOrder.filter((id) => id !== uid);
  const handCounts = useFruitBossHandCounts(roomCode, opponentUids);

  const [mode, setMode] = useState<ActionMode>("add");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourceStall, setSourceStall] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [pending, setPending] = useState<PendingChoice | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmingRedraw, setConfirmingRedraw] = useState(false);

  // Reset transient state when turn changes
  useEffect(() => {
    setMode("add");
    setSelectedIds(new Set());
    setSourceStall(null);
    setPending(null);
    setErrorMsg(null);
  }, [game.currentTurn]);

  const switchMode = (next: ActionMode) => {
    setMode(next);
    setSelectedIds(new Set());
    setSourceStall(null);
    setErrorMsg(null);
  };

  const handCards = hand?.cards ?? [];

  // Single helper that decides "what does this selection let me do?"
  const intent: AddIntent = (() => {
    if (selectedIds.size === 0) return { kind: "empty" };
    const selected = handCards.filter((c) => selectedIds.has(c.id));
    const cats = selected.filter((c) => c.kind === "cat");
    const nonCats = selected.filter((c) => c.kind !== "cat");
    if (cats.length > 0 && nonCats.length > 0) {
      return { kind: "invalid", reason: "Cats can't be combined with fruit/star." };
    }
    if (cats.length > 0) {
      if (cats.length > 1) return { kind: "invalid", reason: "Only one cat at a time." };
      return { kind: "cat", catCardId: cats[0].id };
    }
    const fruitSel = selectionForAdd(handCards, selectedIds);
    if (!fruitSel.valid) return { kind: "invalid", reason: fruitSel.reason };
    return { kind: "add", suit: fruitSel.suit };
  })();

  // ---- Mode validation: which stalls / cards are currently legal targets? ----

  // Add mode covers both placing fruit/star AND playing a cat. Which stalls
  // are valid depends on the current intent.
  const addValidStalls = new Set<number>();
  if (mode === "add" && isMyTurn && game.actionsLeft > 0) {
    if (intent.kind === "add") {
      for (let i = 0; i < game.market.length; i++) {
        if (canPlaceAt(game.market, i, intent)) addValidStalls.add(i);
      }
    } else if (intent.kind === "cat") {
      for (let i = 0; i < game.market.length; i++) if (game.market[i]) addValidStalls.add(i);
    }
  }

  // Combine mode: depends on whether source is picked
  const combineValidStalls = new Set<number>();
  if (mode === "combine" && isMyTurn && game.actionsLeft > 0) {
    if (sourceStall === null) {
      for (let i = 0; i < game.market.length; i++) if (game.market[i]) combineValidStalls.add(i);
    } else {
      for (let i = 0; i < game.market.length; i++) {
        if (canCombine(game.market, sourceStall, i)) combineValidStalls.add(i);
      }
    }
  }

  // Slide mode
  const slideValidStalls = new Set<number>();
  if (mode === "slide" && isMyTurn && game.actionsLeft > 0) {
    if (sourceStall === null) {
      for (let i = 0; i < game.market.length; i++) if (game.market[i]) slideValidStalls.add(i);
    } else {
      for (let i = 0; i < game.market.length; i++) {
        if (canSlide(game.market, sourceStall, i)) slideValidStalls.add(i);
      }
    }
  }

  // While a stall-choice (collect or topple) is pending, override the marketplace
  // highlight so the player can simply click one of the two adjacent stalls.
  const stallChoicePending =
    pending && (pending.kind === "collect-stall" || pending.kind === "topple")
      ? pending
      : null;

  const validStalls = stallChoicePending
    ? new Set(stallChoicePending.choices)
    : mode === "add" ? addValidStalls
    : mode === "combine" ? combineValidStalls
    : mode === "slide" ? slideValidStalls
    : new Set<number>();

  // While a stall-choice is pending, simulate the placement client-side so the
  // player can see the new stack already sitting in the destination stall.
  let displayMarket = game.market;
  let pendingDestStallIdx: number | null = null;
  let pendingHiddenCardIds: Set<string> = new Set();
  if (stallChoicePending) {
    const ctx = stallChoicePending.ctx;
    if (ctx.type === "add") {
      pendingDestStallIdx = ctx.stallIdx;
      const cards = handCards.filter((c) => ctx.cardIds.includes(c.id));
      pendingHiddenCardIds = new Set(ctx.cardIds);
      displayMarket = game.market.map((s, i) =>
        i === ctx.stallIdx ? mergedStack(s, cards, ctx.stallIdx, "preview") : s
      );
    } else {
      pendingDestStallIdx = ctx.destIdx;
      const src = game.market[ctx.sourceIdx]!;
      displayMarket = game.market.map((s, i) => {
        if (i === ctx.sourceIdx) return null;
        if (i === ctx.destIdx) return mergedStack(s, src.cards, ctx.destIdx, "preview");
        return s;
      });
    }
  }

  // ---- Action submitters ----

  const submitAdd = async (
    stallIdx: number,
    cardIds: string[],
    opts?: { toppleInto?: number; collectFrom?: number }
  ) => {
    setActing(true);
    setErrorMsg(null);
    try {
      await addToMarket(roomCode, uid, myName, cardIds, stallIdx, opts);
      setSelectedIds(new Set());
      setPending(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const submitCombine = async (
    sourceIdx: number,
    destIdx: number,
    opts?: { toppleInto?: number; collectFrom?: number }
  ) => {
    setActing(true);
    setErrorMsg(null);
    try {
      await combineStacks(roomCode, uid, myName, sourceIdx, destIdx, opts);
      setSourceStall(null);
      setPending(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const submitSlide = async (sourceIdx: number, destIdx: number) => {
    setActing(true);
    setErrorMsg(null);
    try {
      await slideStack(roomCode, uid, myName, sourceIdx, destIdx);
      setSourceStall(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const submitCat = async (catId: string, stallIdx: number, cardId: string) => {
    setActing(true);
    setErrorMsg(null);
    try {
      await playCat(roomCode, uid, myName, catId, stallIdx, cardId);
      setSelectedIds(new Set());
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  // ---- Prompt-loop driver: keep prompting / submitting until the action resolves ----

  const advanceCtx = (ctx: PendingCtx) => {
    if (!hand) return;
    const prompt =
      ctx.type === "add"
        ? nextPromptForAdd(game, hand, uid, ctx.cardIds, ctx.stallIdx, ctx.opts)
        : nextPromptForCombine(game, uid, ctx.sourceIdx, ctx.destIdx, ctx.opts);
    if (prompt.kind === "submit") {
      if (ctx.type === "add") submitAdd(ctx.stallIdx, ctx.cardIds, ctx.opts);
      else submitCombine(ctx.sourceIdx, ctx.destIdx, ctx.opts);
      return;
    }
    if (prompt.kind === "topple") setPending({ kind: "topple", choices: prompt.choices, ctx });
    else if (prompt.kind === "collect-stall") setPending({ kind: "collect-stall", choices: prompt.choices, ctx });
    else setPending({ kind: "star-attach", suits: prompt.suits, ctx });
  };

  // ---- Click handlers ----

  const handleStallClick = (stallIdx: number) => {
    if (!isMyTurn || acting || game.actionsLeft <= 0) return;

    // If a collect-stall / topple choice is pending, this click resolves it.
    if (stallChoicePending) {
      if (!stallChoicePending.choices.includes(stallIdx)) return;
      resolvePromptStall(stallIdx);
      return;
    }

    if (mode === "add") {
      if (intent.kind !== "add") return;
      const cardIds = [...selectedIds];
      advanceCtx({ type: "add", stallIdx, cardIds, opts: {} });
      return;
    }

    if (mode === "combine") {
      if (sourceStall === null) {
        if (!game.market[stallIdx]) return;
        setSourceStall(stallIdx);
        return;
      }
      if (sourceStall === stallIdx) {
        setSourceStall(null);
        return;
      }
      advanceCtx({ type: "combine", sourceIdx: sourceStall, destIdx: stallIdx, opts: {} });
      return;
    }

    if (mode === "slide") {
      if (sourceStall === null) {
        if (!game.market[stallIdx]) return;
        setSourceStall(stallIdx);
        return;
      }
      submitSlide(sourceStall, stallIdx);
      return;
    }
  };

  const handleCardClickInStall = (stallIdx: number, cardId: string) => {
    if (mode !== "add" || intent.kind !== "cat") return;
    if (!isMyTurn || acting || game.actionsLeft <= 0) return;
    submitCat(intent.catCardId, stallIdx, cardId);
  };

  const handleEndTurn = async () => {
    if (!isMyTurn || acting) return;
    setActing(true);
    setErrorMsg(null);
    try {
      await endTurn(roomCode, uid, myName);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handleDiscardAndRedraw = async () => {
    if (!isMyTurn || acting) return;
    setConfirmingRedraw(false);
    setActing(true);
    setErrorMsg(null);
    try {
      await discardAndRedraw(roomCode, uid, myName);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const toggleCard = (id: string) => {
    if (!isMyTurn || acting) return;
    setErrorMsg(null);
    setSelectedIds((prev) => {
      // Clicking an already-selected card → deselect.
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      const clicked = handCards.find((c) => c.id === id);
      if (!clicked) return prev;
      const current = handCards.filter((c) => prev.has(c.id));
      const hasCat = current.some((c) => c.kind === "cat");
      const currentSuit = current
        .map((c) => (c.kind === "fruit" ? c.suit : undefined))
        .find((s) => s !== undefined);
      // Cats are always solo. Clicking a cat replaces the selection.
      if (clicked.kind === "cat") return new Set([id]);
      // Click on fruit/star while a cat is selected → switch focus.
      if (hasCat) return new Set([id]);
      // Same-suit (or star — wild): extend the selection.
      const compatible =
        clicked.kind === "star" ||
        !currentSuit ||
        (clicked.kind === "fruit" && clicked.suit === currentSuit);
      if (compatible) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      // Different fruit suit → switch focus to the new card.
      return new Set([id]);
    });
  };

  const resolvePromptStall = (idx: number) => {
    if (!pending || pending.kind === "star-attach") return;
    const ctx = pending.ctx;
    const nextOpts: AddOpts = { ...ctx.opts };
    if (pending.kind === "topple") nextOpts.toppleInto = idx;
    else nextOpts.collectFrom = idx;
    setPending(null);
    advanceCtx({ ...ctx, opts: nextOpts });
  };

  const resolvePromptStar = (suit: FruitSuit) => {
    if (!pending || pending.kind !== "star-attach") return;
    const ctx = pending.ctx;
    const nextOpts: AddOpts = { ...ctx.opts, starAttachTo: suit };
    setPending(null);
    advanceCtx({ ...ctx, opts: nextOpts });
  };

  // ---- Render ----

  const actionHint = (() => {
    if (!isMyTurn) return null;
    if (stallChoicePending) {
      const opts = stallChoicePending.choices.map((i) => `stall ${i + 1}`).join(" or ");
      return stallChoicePending.kind === "collect-stall"
        ? `Click ${opts} to collect that stack into your collection.`
        : `Click ${opts} to topple it along with your overflow.`;
    }
    if (game.actionsLeft <= 0) return "Out of actions — end your turn to draw.";
    if (mode === "add") {
      if (intent.kind === "empty")
        return "Pick same-suit cards (stars wild) to add, or a cat to eat a market card.";
      if (intent.kind === "invalid") return intent.reason;
      if (intent.kind === "cat")
        return "Click a card in any market stall — your cat will eat it.";
      // intent.kind === "add"
      if (validStalls.size === 0) return "No legal stalls for this selection.";
      return `Click a green stall to place these ${selectedIds.size} card(s).`;
    }
    if (mode === "combine") {
      if (sourceStall === null) return "COMBINE: pick a source stack first.";
      if (validStalls.size === 0) return "No same-suit destination available. Pick a different source.";
      return `Click a destination stack to merge stall ${sourceStall + 1} into it.`;
    }
    if (mode === "slide") {
      if (sourceStall === null) return "SLIDE: pick a stack to move.";
      if (validStalls.size === 0) return "No reachable empty stall. Pick a different source.";
      return `Click an empty stall to slide stall ${sourceStall + 1} into.`;
    }
    return null;
  })();

  return (
    <div className="fb-play">
      <TurnStatus mood={isMyTurn ? "mine" : "waiting"}>
        {isMyTurn
          ? `Your turn — ${game.actionsLeft} action${game.actionsLeft === 1 ? "" : "s"} left`
          : `Waiting for ${currentName}…`}
      </TurnStatus>

      {game.fireSale && (
        <div className="fb-firesale-banner">
          <div>🔥 Fire Sale — deck is empty. Single-card stacks are now collectible.</div>
          {game.fireSaleEnder && (
            <div className="fb-firesale-ender">
              <strong>{room.players[game.fireSaleEnder]?.name ?? "Someone"}</strong>
              {" "}ran out — everyone else gets one final turn.
            </div>
          )}
        </div>
      )}

      {isMyTurn && (
        <div className="fb-action-bar">
          {(["add", "combine", "slide"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`fb-mode-btn${mode === m ? " is-active" : ""}`}
              onClick={() => switchMode(m)}
              disabled={acting || game.actionsLeft <= 0 || !!stallChoicePending}
            >
              {m.toUpperCase()}
            </button>
          ))}
          {stallChoicePending && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPending(null)}
              disabled={acting}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <section className="fb-section">
        <h4 className="fb-section-title">Market</h4>
        <Marketplace
          market={displayMarket}
          deckSize={game.deck.length}
          discard={game.discard}
          onStallClick={
            // In add mode with a cat selected, the click target is a specific
            // CARD inside a stall, not the stall itself — so disable stall click
            // when the intent is "cat".
            isMyTurn && !(mode === "add" && intent.kind === "cat")
              ? handleStallClick
              : undefined
          }
          onCardClick={
            isMyTurn && mode === "add" && intent.kind === "cat"
              ? handleCardClickInStall
              : undefined
          }
          validStalls={validStalls}
          selectedStallIdx={
            pendingDestStallIdx !== null
              ? pendingDestStallIdx
              : mode === "combine" || mode === "slide"
                ? sourceStall
                : null
          }
          justPlacedStallIdx={pendingDestStallIdx}
        />
      </section>

      <section className="fb-section">
        <h4 className="fb-section-title">
          Your collection
          {(game.collections[uid]?.length ?? 0) > 3 && (
            <span className="fb-section-hint">  (4th+ scores negative)</span>
          )}
        </h4>
        <Collection
          stacks={game.collections[uid] ?? []}
          pendingStars={game.pendingStars?.[uid] ?? []}
          mode="full"
        />
      </section>

      <section className="fb-section">
        <div className="fb-hand-header">
          <h4 className="fb-section-title">Your hand</h4>
          {(selectedIds.size > 0 || stallChoicePending) && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setSelectedIds(new Set());
                setSourceStall(null);
                setPending(null);
              }}
              disabled={acting}
            >
              Clear selection
            </button>
          )}
        </div>
        <HandDisplay
          cards={
            // Hide the just-placed cards while the player is picking their
            // collect/topple target — they're visually now sitting in the
            // destination stall, not in hand.
            pendingHiddenCardIds.size > 0
              ? handCards.filter((c) => !pendingHiddenCardIds.has(c.id))
              : handCards
          }
          selectedIds={selectedIds}
          onToggle={isMyTurn && !acting && mode === "add" ? toggleCard : undefined}
        />
        {actionHint && <div className="fb-action-hint">{actionHint}</div>}
        {errorMsg && <div className="fb-error">{errorMsg}</div>}
      </section>

      <div className="fb-turn-actions">
        {/* Per the rules, a player must take at least one action per turn —
            except during fire sale, where wind-down requires turns to keep
            moving even with nothing playable. */}
        <button
          className="btn btn--primary"
          onClick={handleEndTurn}
          disabled={
            !isMyTurn ||
            acting ||
            (game.actionsLeft === 2 && !game.fireSale)
          }
          title={
            game.actionsLeft === 2 && !game.fireSale
              ? "You must take at least one action this turn."
              : undefined
          }
        >
          End Turn
        </button>
        {isMyTurn && game.actionsLeft === 2 && !game.fireSale && (
          <button
            className="btn btn--danger"
            onClick={() => setConfirmingRedraw(true)}
            disabled={acting}
          >
            Stuck — discard &amp; redraw
          </button>
        )}
      </div>

      {game.lastAction && (
        <p className="fb-last-action">Last action: {game.lastAction}</p>
      )}

      {opponentUids.map((pid) => {
        const oppStacks = game.collections[pid] ?? [];
        const oppPending = game.pendingStars?.[pid] ?? [];
        const name = room.players[pid]?.name ?? pid;
        const oppHandCount = handCounts[pid] ?? 0;
        const isOppTurn = pid === currentUid;
        return (
          <section
            key={pid}
            className={`fb-section fb-opp-section${isOppTurn ? " is-active-turn" : ""}`}
          >
            <h4 className="fb-section-title">
              {name}'s collection
              <span className="fb-section-hint">
                {"  "}· {oppHandCount} card{oppHandCount === 1 ? "" : "s"} in hand
                {isOppTurn ? " · their turn" : ""}
              </span>
            </h4>
            <Collection stacks={oppStacks} pendingStars={oppPending} mode="full" />
          </section>
        );
      })}

      {pending && pending.kind === "star-attach" && (
        <StarAttachModal
          suits={pending.suits}
          onPick={resolvePromptStar}
          onCancel={() => setPending(null)}
        />
      )}

      {confirmingRedraw && (
        <div className="fb-modal-backdrop" onClick={() => setConfirmingRedraw(false)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="fb-modal-title">No playable actions?</h3>
            <p className="fb-modal-body">
              Confirm that none of your hand cards can be added, combined,
              slid, or used as a cat. Your entire hand will be discarded and
              you'll draw a fresh hand of {HAND_LIMIT}. Your turn ends.
            </p>
            <div className="fb-modal-buttons">
              <button
                className="btn btn--danger"
                onClick={handleDiscardAndRedraw}
                disabled={acting}
              >
                Yes — discard &amp; redraw
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => setConfirmingRedraw(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StarAttachModal({
  suits,
  onPick,
  onCancel,
}: {
  suits: FruitSuit[];
  onPick: (suit: FruitSuit) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fb-modal-backdrop" onClick={onCancel}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="fb-modal-title">Attach the stars to which suit?</h3>
        <p className="fb-modal-body">
          You collected a pure-star stack. Stars count as the suit you attach them to.
        </p>
        <div className="fb-modal-buttons">
          {suits.map((suit) => (
            <button
              key={suit}
              className="btn btn--primary"
              onClick={() => onPick(suit)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FruitIcon suit={suit} size={18} />
              {SUIT_LABEL[suit]}
            </button>
          ))}
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
