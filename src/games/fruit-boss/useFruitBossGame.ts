import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  Room,
  FruitBossGame,
  FruitBossHand,
  FruitCard,
  FruitStack,
  FruitSuit,
} from "../../types";
import {
  buildDeck,
  shuffle,
  HAND_LIMIT,
  MARKET_STALLS,
  TOPPLE_AT,
} from "./deck";

// ---- Hooks ----

export function useFruitBossGame(roomCode: string | undefined) {
  const [game, setGame] = useState<FruitBossGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = onSnapshot(doc(db, "games", roomCode), (snap) => {
      setGame(snap.exists() ? (snap.data() as FruitBossGame) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useFruitBossHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<FruitBossHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snap) => {
        if (snap.exists()) setHand(snap.data() as FruitBossHand);
      }
    );
    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

/** Public per-player hand-size subscription so the OpponentBar can show "X cards". */
export function useFruitBossHandCounts(
  roomCode: string | undefined,
  uids: string[]
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!roomCode || uids.length === 0) return;
    const unsubs = uids.map((uid) =>
      onSnapshot(doc(db, "games", roomCode, "hands", uid), (snap) => {
        if (snap.exists()) {
          const h = snap.data() as FruitBossHand;
          setCounts((prev) => ({ ...prev, [uid]: h.cards.length }));
        }
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, uids.join(",")]);

  return counts;
}

// ---- Game start ----

export async function startFruitBossGame(roomCode: string, room: Room): Promise<void> {
  const playerUids = Object.keys(room.players);
  const playerCount = playerUids.length;
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`Fruit Boss requires 2–4 players (got ${playerCount}).`);
  }

  const turnOrder = shuffle(playerUids);
  const deck = shuffle(buildDeck(playerCount));

  // Deal HAND_LIMIT cards to each player
  const hands: Record<string, FruitBossHand> = {};
  let cursor = 0;
  for (const uid of turnOrder) {
    hands[uid] = { cards: deck.slice(cursor, cursor + HAND_LIMIT) };
    cursor += HAND_LIMIT;
  }

  // Lay MARKET_STALLS face-up cards in the market, each as its own single-card stack
  const initialMarket = deck.slice(cursor, cursor + MARKET_STALLS);
  cursor += MARKET_STALLS;
  const market: FruitBossGame["market"] = initialMarket.map((card, i) => ({
    id: `stack-init-${i}`,
    cards: [card],
    // For star/cat single-card "stacks", suit is null until they merge with fruit.
    suit: card.kind === "fruit" ? card.suit ?? null : null,
  }));

  const remainingDeck: FruitCard[] = deck.slice(cursor);

  const collections: Record<string, ReturnType<typeof emptyCollection>> = {};
  const pendingStars: Record<string, FruitCard[]> = {};
  const fireSaleFinalTurnTaken: Record<string, boolean> = {};
  for (const uid of turnOrder) {
    collections[uid] = emptyCollection();
    pendingStars[uid] = [];
    fireSaleFinalTurnTaken[uid] = false;
  }

  const gameData: FruitBossGame = {
    gameType: "fruit-boss",
    status: "playing",
    turnOrder,
    currentTurn: 0,
    actionsLeft: 2,
    market,
    collections,
    pendingStars,
    deck: remainingDeck,
    discard: [],
    fireSale: false,
    fireSaleEnder: null,
    fireSaleFinalTurnTaken,
    scores: null,
    scoringBreakdowns: null,
    winner: null,
    lastAction: null,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "games", roomCode), gameData);
  for (const uid of turnOrder) {
    batch.set(doc(db, "games", roomCode, "hands", uid), hands[uid]);
  }
  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

function emptyCollection(): FruitBossGame["collections"][string] {
  return [];
}

// ---- Helpers for UI (read-only) ----

/**
 * End-of-round SCORING value: top card value × card count. This is the formula
 * used at game end to score collected stacks (positive or negative).
 */
export function stackScoreValue(stack: { cards: FruitCard[] }): number {
  if (stack.cards.length === 0) return 0;
  return stackTopValue(stack) * stack.cards.length;
}

/**
 * In-PLAY value: simple sum of card values. This is what the collect-rule
 * compares ("if the sum of the stack you added to EXCEEDS that of an adjacent
 * stack…"). Stars count as 1, cats as 0. Used for collect-eligibility,
 * NOT for end-of-round scoring.
 */
export function stackPlayValue(stack: { cards: FruitCard[] }): number {
  return stack.cards.reduce((sum, c) => sum + c.value, 0);
}

/** Highest card value in a stack. Stars count as 1, cats as 0. */
export function stackTopValue(stack: { cards: FruitCard[] }): number {
  let max = 0;
  for (const c of stack.cards) if (c.value > max) max = c.value;
  return max;
}

/** Sort collection stacks by score-value descending — used in display. */
export function sortedCollection<T extends { cards: FruitCard[] }>(stacks: T[]): T[] {
  return [...stacks].sort((a, b) => stackScoreValue(b) - stackScoreValue(a));
}

// ============================================================================
// ADD-TO-MARKET — validation helpers + action handler
// ============================================================================

/**
 * Validate a hand-card selection for the Add action.
 *
 * Rules:
 *  - Selection must be non-empty.
 *  - No cat cards may be in the selection (Add is fruit/star-only).
 *  - All non-star cards must share a single fruit suit.
 *
 * Returns the inferred suit ("star" = pure stars, with no fruit), or null
 * with a reason if the selection is invalid.
 */
export type AddSelection =
  | { valid: true; suit: FruitSuit | null /* null when all stars */ }
  | { valid: false; reason: string };

export function selectionForAdd(hand: FruitCard[], selectedIds: Set<string>): AddSelection {
  if (selectedIds.size === 0) return { valid: false, reason: "Pick at least one card." };
  const cards = hand.filter((c) => selectedIds.has(c.id));
  if (cards.length !== selectedIds.size) return { valid: false, reason: "Selection out of sync." };
  if (cards.some((c) => c.kind === "cat")) {
    return { valid: false, reason: "Cats can't be added to the market." };
  }
  const suits = new Set(cards.filter((c) => c.kind === "fruit").map((c) => c.suit as FruitSuit));
  if (suits.size > 1) return { valid: false, reason: "Cards must all be the same suit." };
  const suit = suits.size === 1 ? [...suits][0] : null; // null = pure stars
  return { valid: true, suit };
}

/**
 * Can the selection be placed in the given stall?
 *
 *  - Empty stall: yes (any fruit, or pure stars).
 *  - Occupied stall: yes if the stall has no suit yet (pure-star pile) OR the
 *    selection's suit matches the stall's suit. Pure-star selections always
 *    fit (they're wild).
 */
export function canPlaceAt(market: (FruitStack | null)[], stallIdx: number, sel: { suit: FruitSuit | null }): boolean {
  const stall = market[stallIdx];
  if (!stall) return true;
  if (sel.suit === null) return true;        // pure stars — wild
  if (stall.suit === null) return true;      // star-only stall absorbs any suit
  return stall.suit === sel.suit;
}

/** Get adjacent non-empty stall indices for a given stall. */
function adjacentNonEmpty(market: (FruitStack | null)[], stallIdx: number): number[] {
  const result: number[] = [];
  if (stallIdx > 0 && market[stallIdx - 1]) result.push(stallIdx - 1);
  if (stallIdx < market.length - 1 && market[stallIdx + 1]) result.push(stallIdx + 1);
  return result;
}

/**
 * In-play stack value used for collect-eligibility comparisons. Aliased to
 * `stackPlayValue` (sum of card values) so all collect checks agree.
 */
function stackTotal(stack: FruitStack): number {
  return stackPlayValue(stack);
}

/** Result of merging the new cards into the existing stall. Returns the new stack. */
export function mergedStack(existing: FruitStack | null, cards: FruitCard[], stallIdx: number, action: string): FruitStack {
  const all = existing ? [...existing.cards, ...cards] : [...cards];
  // Compute resulting suit: first fruit card wins; null if all stars.
  let suit: FruitSuit | null = existing?.suit ?? null;
  for (const c of all) {
    if (c.kind === "fruit" && c.suit) {
      suit = c.suit;
      break;
    }
  }
  return {
    id: existing?.id ?? `stack-${stallIdx}-${action}-${Date.now()}`,
    cards: all,
    suit,
  };
}

/**
 * Preview what happens after a (validated) Add placement.
 *
 *  - "place"   = vanilla placement; no choice required
 *  - "topple"  = stack reaches 5+, will topple; lists adjacent non-empty stalls
 *                (0, 1, or 2). 2 → player must choose.
 *  - "collect" = adjacent stalls with size ≥ 2 whose total is less than the new
 *                stack's total. 1 → auto-collect. 2 → player must choose.
 *
 * Per rules: a placement that topples cannot collect.
 */
export type AddPreview =
  | { kind: "place" }
  | { kind: "topple"; choices: number[] }
  | { kind: "collect"; choices: number[] };

export function previewAdd(
  market: (FruitStack | null)[],
  stallIdx: number,
  cards: FruitCard[]
): AddPreview {
  const merged = mergedStack(market[stallIdx], cards, stallIdx, "preview");
  if (merged.cards.length >= TOPPLE_AT) {
    return { kind: "topple", choices: adjacentNonEmpty(market, stallIdx) };
  }
  const newTotal = stackTotal(merged);
  const collectChoices = adjacentNonEmpty(market, stallIdx).filter((idx) => {
    const adj = market[idx]!;
    return adj.cards.length >= 2 && stackTotal(adj) < newTotal;
  });
  if (collectChoices.length === 0) return { kind: "place" };
  return { kind: "collect", choices: collectChoices };
}

/** Apply market refills: while market has ≤1 occupied stall, refill all empty stalls from the deck. */
function refillMarket(
  market: (FruitStack | null)[],
  deck: FruitCard[],
  stallCounter: { n: number }
): { market: (FruitStack | null)[]; deck: FruitCard[] } {
  let m = [...market];
  let d = [...deck];
  while (m.filter(Boolean).length <= 1 && d.length > 0) {
    for (let i = 0; i < m.length; i++) {
      if (!m[i] && d.length > 0) {
        const card = d.shift()!;
        m[i] = {
          id: `stack-refill-${stallCounter.n++}`,
          cards: [card],
          suit: card.kind === "fruit" ? card.suit ?? null : null,
        };
      }
    }
    // After one pass through, if we still have ≤1 occupied (only true when
    // deck dried up mid-refill), break to avoid infinite loop.
    if (d.length === 0) break;
  }
  return { market: m, deck: d };
}

/**
 * Apply the Add action to a game state, returning the next game state.
 * Throws if validation fails or required choices are missing.
 */
export function applyAdd(
  game: FruitBossGame,
  hand: FruitBossHand,
  uid: string,
  cardIds: string[],
  stallIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit } = {}
): { game: FruitBossGame; hand: FruitBossHand } {
  if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");
  if (game.actionsLeft <= 0) throw new Error("No actions left this turn.");
  if (stallIdx < 0 || stallIdx >= game.market.length) throw new Error("Invalid stall.");

  const idSet = new Set(cardIds);
  const sel = selectionForAdd(hand.cards, idSet);
  if (!sel.valid) throw new Error(sel.reason);
  if (!canPlaceAt(game.market, stallIdx, sel)) {
    throw new Error("Cards don't match the suit of this stall.");
  }

  const cards = hand.cards.filter((c) => idSet.has(c.id));
  const handAfter: FruitBossHand = {
    cards: hand.cards.filter((c) => !idSet.has(c.id)),
  };

  // Build the merged stack
  const merged = mergedStack(game.market[stallIdx], cards, stallIdx, "add");

  // Working copies
  let market: (FruitStack | null)[] = [...game.market];
  market[stallIdx] = merged;
  let discard: FruitCard[] = [...game.discard];
  const collections = {
    ...game.collections,
    [uid]: [...(game.collections[uid] ?? [])],
  };
  const pendingStars = { ...game.pendingStars };

  const state = {
    market,
    discard,
    collections,
    pendingStars,
    handAfter,
    fireSale: game.fireSale,
  };
  const lastSuffix = resolveTopplyOrCollect(state, stallIdx, uid, opts);
  market = state.market;
  discard = state.discard;

  const lastAction = `Added ${cards.length} ${sel.suit ?? "star"} to stall ${stallIdx + 1}${lastSuffix}`;

  // ---- Refill market ----
  const stallCounter = { n: 0 };
  let deck = [...game.deck];
  const refilled = refillMarket(market, deck, stallCounter);
  market = refilled.market;
  deck = refilled.deck;

  const nextGame: FruitBossGame = {
    ...game,
    market,
    discard,
    deck,
    collections,
    pendingStars,
    actionsLeft: (game.actionsLeft - 1) as 0 | 1 | 2,
    lastAction,
  };
  return { game: nextGame, hand: handAfter };
}

// ---- Action handler (transactional) ----

export async function addToMarket(
  roomCode: string,
  uid: string,
  displayName: string,
  cardIds: string[],
  stallIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit } = {}
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Game or hand missing.");
    const game = gameSnap.data() as FruitBossGame;
    const hand = handSnap.data() as FruitBossHand;
    const next = applyAdd(game, hand, uid, cardIds, stallIdx, opts);
    tx.update(gameRef, {
      market: next.game.market,
      discard: next.game.discard,
      deck: next.game.deck,
      collections: next.game.collections,
      pendingStars: next.game.pendingStars,
      actionsLeft: next.game.actionsLeft,
      lastAction: `${displayName}: ${next.game.lastAction}`,
    });
    tx.update(handRef, { cards: next.hand.cards });
  });
}

// ============================================================================
// END TURN — draw to HAND_LIMIT, pass turn
// ============================================================================

// ============================================================================
// COMBINE — merge two same-suit market stacks; same collect/topple rules apply
// ============================================================================

/** Can stacks at sourceIdx + destIdx be combined? Same-suit (stars wild). */
export function canCombine(market: (FruitStack | null)[], sourceIdx: number, destIdx: number): boolean {
  if (sourceIdx === destIdx) return false;
  const src = market[sourceIdx];
  const dst = market[destIdx];
  if (!src || !dst) return false;
  if (src.suit === null || dst.suit === null) return true; // pure-star stacks are wild
  return src.suit === dst.suit;
}

export function previewCombine(
  market: (FruitStack | null)[],
  sourceIdx: number,
  destIdx: number
): AddPreview {
  // Simulate move: source cards merged into destination
  const src = market[sourceIdx]!;
  const dst = market[destIdx]!;
  const sim = mergedStack(dst, src.cards, destIdx, "preview");
  if (sim.cards.length >= TOPPLE_AT) {
    // adjacent excludes the now-empty source
    const adj = adjacentNonEmpty(market.map((s, i) => (i === sourceIdx ? null : s)), destIdx);
    return { kind: "topple", choices: adj };
  }
  const newTotal = stackTotal(sim);
  const collectChoices = adjacentNonEmpty(market.map((s, i) => (i === sourceIdx ? null : s)), destIdx).filter(
    (idx) => {
      const adj = market[idx]!;
      return adj.cards.length >= 2 && stackTotal(adj) < newTotal;
    }
  );
  if (collectChoices.length === 0) return { kind: "place" };
  return { kind: "collect", choices: collectChoices };
}

/**
 * Compute the next user-facing prompt for an Add or Combine action, given the
 * choices already accumulated in opts. Returns "submit" once nothing more is
 * required, or one of the three modal kinds.
 */
export type AddOrCombinePrompt =
  | { kind: "submit" }
  | { kind: "topple"; choices: number[] }
  | { kind: "collect-stall"; choices: number[] }
  | { kind: "star-attach"; suits: FruitSuit[]; collectFrom: number };

function nextPromptCore(
  game: FruitBossGame,
  uid: string,
  destStallIdx: number,
  /** Simulated market AFTER the place/merge but before topple/collect. */
  simMarket: (FruitStack | null)[],
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit }
): AddOrCombinePrompt {
  const dest = simMarket[destStallIdx]!;
  if (dest.cards.length >= TOPPLE_AT) {
    const choices = adjacentNonEmpty(simMarket, destStallIdx);
    if (choices.length <= 1) return { kind: "submit" };
    if (opts.toppleInto !== undefined && choices.includes(opts.toppleInto)) {
      return { kind: "submit" };
    }
    return { kind: "topple", choices };
  }
  const newTotal = stackTotal(dest);
  // During fire sale, single-card stacks are also collectible.
  const collectMinSize = game.fireSale ? 1 : 2;
  const collectChoices = adjacentNonEmpty(simMarket, destStallIdx).filter((idx) => {
    const adj = simMarket[idx]!;
    return adj.cards.length >= collectMinSize && stackTotal(adj) < newTotal;
  });
  if (collectChoices.length === 0) return { kind: "submit" };
  let collectFrom = opts.collectFrom;
  if (collectFrom === undefined) {
    if (collectChoices.length === 1) collectFrom = collectChoices[0];
    else return { kind: "collect-stall", choices: collectChoices };
  }
  if (!collectChoices.includes(collectFrom)) return { kind: "collect-stall", choices: collectChoices };
  // Star-attach check: only matters when the collected stack is pure-star AND
  // the player has at least one existing collected fruit suit.
  const collected = simMarket[collectFrom]!;
  if (collected.suit !== null) return { kind: "submit" };
  const playerStacks = game.collections[uid] ?? [];
  const suitsOwned = playerStacks.filter((s) => s.suit !== null).map((s) => s.suit as FruitSuit);
  if (suitsOwned.length === 0) return { kind: "submit" };
  if (opts.starAttachTo && suitsOwned.includes(opts.starAttachTo)) return { kind: "submit" };
  return { kind: "star-attach", suits: suitsOwned, collectFrom };
}

export function nextPromptForAdd(
  game: FruitBossGame,
  hand: FruitBossHand,
  uid: string,
  cardIds: string[],
  stallIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit }
): AddOrCombinePrompt {
  const cards = hand.cards.filter((c) => cardIds.includes(c.id));
  const merged = mergedStack(game.market[stallIdx], cards, stallIdx, "preview");
  const simMarket = game.market.map((s, i) => (i === stallIdx ? merged : s));
  return nextPromptCore(game, uid, stallIdx, simMarket, opts);
}

export function nextPromptForCombine(
  game: FruitBossGame,
  uid: string,
  sourceIdx: number,
  destIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit }
): AddOrCombinePrompt {
  const src = game.market[sourceIdx]!;
  const sim = mergedStack(game.market[destIdx], src.cards, destIdx, "preview");
  const simMarket = game.market.map((s, i) =>
    i === sourceIdx ? null : i === destIdx ? sim : s
  );
  return nextPromptCore(game, uid, destIdx, simMarket, opts);
}

/** Shared helper: resolve topple/collect for a stack at destIdx in the given working state. */
function resolveTopplyOrCollect(
  state: {
    market: (FruitStack | null)[];
    discard: FruitCard[];
    collections: Record<string, FruitStack[]>;
    pendingStars: Record<string, FruitCard[]>;
    handAfter: FruitBossHand;
    fireSale: boolean;
  },
  destIdx: number,
  uid: string,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit }
): string /* lastAction suffix */ {
  const merged = state.market[destIdx]!;
  if (merged.cards.length >= TOPPLE_AT) {
    const choices = adjacentNonEmpty(state.market, destIdx);
    let toppleInto: number | undefined;
    if (choices.length === 0) toppleInto = undefined;
    else if (choices.length === 1) toppleInto = choices[0];
    else {
      if (opts.toppleInto === undefined || !choices.includes(opts.toppleInto)) {
        throw new Error("Topple choice required.");
      }
      toppleInto = opts.toppleInto;
    }
    for (const c of state.market[destIdx]!.cards) state.discard.push(c);
    state.market[destIdx] = null;
    if (toppleInto !== undefined) {
      for (const c of state.market[toppleInto]!.cards) state.discard.push(c);
      state.market[toppleInto] = null;
    }
    return ` — TOPPLED`;
  }

  // Collect — fire sale relaxes the ≥2 threshold to ≥1.
  const newTotal = stackTotal(merged);
  const collectMinSize = state.fireSale ? 1 : 2;
  const collectChoices = adjacentNonEmpty(state.market, destIdx).filter((idx) => {
    const adj = state.market[idx]!;
    return adj.cards.length >= collectMinSize && stackTotal(adj) < newTotal;
  });
  let collectFrom: number | undefined;
  if (collectChoices.length === 1) collectFrom = collectChoices[0];
  else if (collectChoices.length === 2) {
    if (opts.collectFrom === undefined || !collectChoices.includes(opts.collectFrom)) {
      throw new Error("Collect choice required.");
    }
    collectFrom = opts.collectFrom;
  }
  if (collectFrom === undefined) return "";

  const collected = state.market[collectFrom]!;
  state.market[collectFrom] = null;

  // Cat single-card stack returns to hand
  if (collected.cards.length === 1 && collected.cards[0].kind === "cat") {
    state.handAfter.cards = [...state.handAfter.cards, collected.cards[0]];
    return ` — captured a cat (returned to hand)`;
  }

  // Pure-star stack: per the rules, if the player has any existing collected suit,
  // the stars MUST be attached to one of those (the player's choice). If the player
  // has no suits yet, the stars go to pendingStars and auto-attach to the first
  // future collected suit.
  if (collected.suit === null) {
    const playerStacks = state.collections[uid];
    const suitsOwned = playerStacks.filter((s) => s.suit !== null).map((s) => s.suit as FruitSuit);
    if (suitsOwned.length === 0) {
      state.pendingStars[uid] = [...(state.pendingStars[uid] ?? []), ...collected.cards];
      return ` — collected ${collected.cards.length} star(s) (pending)`;
    }
    if (!opts.starAttachTo || !suitsOwned.includes(opts.starAttachTo)) {
      throw new Error("Star attach choice required.");
    }
    const targetIdx = playerStacks.findIndex((s) => s.suit === opts.starAttachTo);
    playerStacks[targetIdx] = {
      ...playerStacks[targetIdx],
      cards: [...playerStacks[targetIdx].cards, ...collected.cards],
    };
    return ` — attached ${collected.cards.length} star(s) to ${opts.starAttachTo}`;
  }

  // Normal collect — merge into existing suit stack or add new
  const playerStacks = state.collections[uid];
  const existingIdx = playerStacks.findIndex((s) => s.suit === collected.suit);
  if (existingIdx >= 0) {
    playerStacks[existingIdx] = {
      ...playerStacks[existingIdx],
      cards: [...playerStacks[existingIdx].cards, ...collected.cards],
    };
  } else {
    playerStacks.push({
      id: `col-${uid}-${collected.suit}-${Date.now()}`,
      cards: collected.cards,
      suit: collected.suit,
    });
    // Resolve any pending stars by attaching them to this newly opened suit
    const pending = state.pendingStars[uid] ?? [];
    if (pending.length > 0) {
      playerStacks[playerStacks.length - 1].cards.push(...pending);
      state.pendingStars[uid] = [];
    }
  }
  return ` — collected ${collected.cards.length} ${collected.suit}`;
}

export function applyCombine(
  game: FruitBossGame,
  hand: FruitBossHand,
  uid: string,
  sourceIdx: number,
  destIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit } = {}
): { game: FruitBossGame; hand: FruitBossHand } {
  if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");
  if (game.actionsLeft <= 0) throw new Error("No actions left this turn.");
  if (!canCombine(game.market, sourceIdx, destIdx)) {
    throw new Error("Stacks must be the same suit (stars are wild).");
  }
  const src = game.market[sourceIdx]!;

  let market: (FruitStack | null)[] = [...game.market];
  market[destIdx] = mergedStack(market[destIdx], src.cards, destIdx, "combine");
  market[sourceIdx] = null;

  const state = {
    market,
    discard: [...game.discard],
    collections: {
      ...game.collections,
      [uid]: [...(game.collections[uid] ?? [])],
    },
    pendingStars: { ...game.pendingStars },
    handAfter: { cards: [...hand.cards] },
    fireSale: game.fireSale,
  };
  const lastSuffix = resolveTopplyOrCollect(state, destIdx, uid, opts);

  // Refill
  const stallCounter = { n: 0 };
  let deck = [...game.deck];
  const refilled = refillMarket(state.market, deck, stallCounter);
  market = refilled.market;
  deck = refilled.deck;

  const baseLog = `Combined stall ${sourceIdx + 1} into stall ${destIdx + 1}`;
  const nextGame: FruitBossGame = {
    ...game,
    market,
    discard: state.discard,
    deck,
    collections: state.collections,
    pendingStars: state.pendingStars,
    actionsLeft: (game.actionsLeft - 1) as 0 | 1 | 2,
    lastAction: `${baseLog}${lastSuffix}`,
  };
  return { game: nextGame, hand: state.handAfter };
}

export async function combineStacks(
  roomCode: string,
  uid: string,
  displayName: string,
  sourceIdx: number,
  destIdx: number,
  opts: { toppleInto?: number; collectFrom?: number; starAttachTo?: FruitSuit } = {}
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Game or hand missing.");
    const game = gameSnap.data() as FruitBossGame;
    const hand = handSnap.data() as FruitBossHand;
    const next = applyCombine(game, hand, uid, sourceIdx, destIdx, opts);
    tx.update(gameRef, {
      market: next.game.market,
      discard: next.game.discard,
      deck: next.game.deck,
      collections: next.game.collections,
      pendingStars: next.game.pendingStars,
      actionsLeft: next.game.actionsLeft,
      lastAction: `${displayName}: ${next.game.lastAction}`,
    });
    tx.update(handRef, { cards: next.hand.cards });
  });
}

// ============================================================================
// SLIDE — move a stack across empty stalls. No collect, no topple.
// ============================================================================

export function canSlide(market: (FruitStack | null)[], sourceIdx: number, destIdx: number): boolean {
  if (sourceIdx === destIdx) return false;
  if (!market[sourceIdx]) return false;
  if (market[destIdx]) return false;
  const lo = Math.min(sourceIdx, destIdx);
  const hi = Math.max(sourceIdx, destIdx);
  for (let i = lo; i <= hi; i++) {
    if (i === sourceIdx) continue;
    if (market[i]) return false;
  }
  return true;
}

export async function slideStack(
  roomCode: string,
  uid: string,
  displayName: string,
  sourceIdx: number,
  destIdx: number
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("Game missing.");
    const game = gameSnap.data() as FruitBossGame;
    if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");
    if (game.actionsLeft <= 0) throw new Error("No actions left this turn.");
    if (!canSlide(game.market, sourceIdx, destIdx)) {
      throw new Error("Slide path is blocked or invalid.");
    }
    const market = [...game.market];
    market[destIdx] = market[sourceIdx];
    market[sourceIdx] = null;

    // Refill if needed
    const stallCounter = { n: 0 };
    const refilled = refillMarket(market, [...game.deck], stallCounter);

    tx.update(gameRef, {
      market: refilled.market,
      deck: refilled.deck,
      actionsLeft: (game.actionsLeft - 1) as 0 | 1 | 2,
      lastAction: `${displayName}: Slid stall ${sourceIdx + 1} → ${destIdx + 1}`,
    });
  });
}

// ============================================================================
// CAT — play a maneki-neko from hand to eat one market card
// ============================================================================

export async function playCat(
  roomCode: string,
  uid: string,
  displayName: string,
  catCardId: string,
  targetStallIdx: number,
  targetCardId: string
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Game or hand missing.");
    const game = gameSnap.data() as FruitBossGame;
    const hand = handSnap.data() as FruitBossHand;
    if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");
    if (game.actionsLeft <= 0) throw new Error("No actions left this turn.");
    const catCard = hand.cards.find((c) => c.id === catCardId && c.kind === "cat");
    if (!catCard) throw new Error("Cat card not in hand.");
    const stall = game.market[targetStallIdx];
    if (!stall) throw new Error("Empty stall.");
    const target = stall.cards.find((c) => c.id === targetCardId);
    if (!target) throw new Error("Card not in that stall.");

    const newHandCards = hand.cards.filter((c) => c.id !== catCardId);
    const newStallCards = stall.cards.filter((c) => c.id !== targetCardId);
    const market = [...game.market];
    if (newStallCards.length === 0) {
      market[targetStallIdx] = null;
    } else {
      // Recompute suit (eaten card may have been the only fruit)
      let suit: FruitSuit | null = null;
      for (const c of newStallCards) {
        if (c.kind === "fruit" && c.suit) {
          suit = c.suit;
          break;
        }
      }
      market[targetStallIdx] = { ...stall, cards: newStallCards, suit };
    }

    // Refill if needed
    const stallCounter = { n: 0 };
    const refilled = refillMarket(market, [...game.deck], stallCounter);

    tx.update(gameRef, {
      market: refilled.market,
      deck: refilled.deck,
      discard: [...game.discard, catCard, target],
      actionsLeft: (game.actionsLeft - 1) as 0 | 1 | 2,
      lastAction: `${displayName}: Cat ate a card at stall ${targetStallIdx + 1}`,
    });
    tx.update(handRef, { cards: newHandCards });
  });
}

/**
 * Compute final scores for all players. Single-round game, so this also
 * determines the winner. Stars adopt the suit they were attached to during play;
 * any still-pending stars score nothing.
 */
export function computeScores(
  game: FruitBossGame,
  handsByUid: Record<string, FruitBossHand>
): {
  scores: Record<string, number>;
  breakdowns: Record<string, FruitScoreBreakdown>;
  winner: string | null;
} {
  const scores: Record<string, number> = {};
  const breakdowns: Record<string, FruitScoreBreakdown> = {};

  for (const uid of game.turnOrder) {
    const stacks = game.collections[uid] ?? [];
    const sorted = sortedCollection(stacks);
    const positives = sorted.slice(0, 3);
    const negatives = sorted.slice(3);

    const scoreOf = (stack: FruitStack) => ({
      stackId: stack.id,
      suit: stack.suit as FruitSuit,
      cardCount: stack.cards.length,
      topValue: stackTopValue(stack),
      points: stackScoreValue(stack),
    });

    const positive = positives
      .filter((s) => s.suit !== null) // pending-star-only stacks would have suit=null; we already exclude those from collections
      .map(scoreOf);
    const negative = negatives.filter((s) => s.suit !== null).map(scoreOf);

    // Hand penalty — cats eat the highest-value remaining card before counting.
    const hand = handsByUid[uid]?.cards ?? [];
    const remaining = [...hand].filter((c) => c.kind !== "cat");
    const cats = hand.filter((c) => c.kind === "cat").length;
    remaining.sort((a, b) => b.value - a.value);
    let catEatenValue = 0;
    for (let i = 0; i < cats && remaining.length > 0; i++) {
      catEatenValue += remaining.shift()!.value;
    }
    const handPenalty = remaining.reduce((sum, c) => sum + c.value, 0);

    const positiveSum = positive.reduce((s, p) => s + p.points, 0);
    const negativeSum = negative.reduce((s, n) => s + n.points, 0);
    const total = positiveSum - negativeSum - handPenalty;

    breakdowns[uid] = { positive, negative, handPenalty, catEatenValue, total };
    scores[uid] = total;
  }

  // Winner = top score. Ties → first uid in turnOrder with that score (no tiebreaker spec).
  let winner: string | null = null;
  let best = -Infinity;
  for (const uid of game.turnOrder) {
    if (scores[uid] > best) {
      best = scores[uid];
      winner = uid;
    }
  }
  return { scores, breakdowns, winner };
}

/**
 * The "I'm stuck" escape valve: when a player can't legally take any action,
 * they discard their entire hand to the discard pile and draw a fresh hand
 * from the deck. Counts as their turn — turn passes to the next player.
 * Only valid outside fire sale (no deck to redraw from once it's dry).
 */
export async function discardAndRedraw(
  roomCode: string,
  uid: string,
  displayName: string
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Game or hand missing.");
    const game = gameSnap.data() as FruitBossGame;
    const hand = handSnap.data() as FruitBossHand;
    if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");
    if (game.actionsLeft !== 2) throw new Error("You've already acted this turn.");
    if (game.fireSale) throw new Error("Can't discard-redraw during the fire sale.");

    const discard = [...game.discard, ...hand.cards];
    const deck = [...game.deck];
    const newCards: FruitCard[] = [];
    while (newCards.length < HAND_LIMIT && deck.length > 0) {
      newCards.push(deck.shift()!);
    }

    const nextTurn = (game.currentTurn + 1) % game.turnOrder.length;

    tx.update(gameRef, {
      deck,
      discard,
      currentTurn: nextTurn,
      actionsLeft: 2,
      lastAction: `${displayName} was stuck — discarded hand and redrew`,
    });
    tx.update(handRef, { cards: newCards });
  });
}

/**
 * End the active player's turn. Handles fire-sale activation, the
 * "one-more-turn" countdown, and the final transition to scoring.
 */
export async function endTurn(roomCode: string, uid: string, displayName: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Game or hand missing.");
    const game = gameSnap.data() as FruitBossGame;
    const hand = handSnap.data() as FruitBossHand;
    if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn.");

    // Draw up to HAND_LIMIT
    const deck = [...game.deck];
    const cards = [...hand.cards];
    while (cards.length < HAND_LIMIT && deck.length > 0) {
      cards.push(deck.shift()!);
    }

    // Fire sale becomes active the moment the deck dries up.
    const fireSaleNowActive = game.fireSale || deck.length === 0;
    const fireSaleFinalTurnTaken = { ...game.fireSaleFinalTurnTaken };

    // If we're already in fire-sale wind-down, mark THIS player's final turn done
    // (unless they're the original ender — they don't take more turns).
    let fireSaleEnder = game.fireSaleEnder;
    if (fireSaleEnder && uid !== fireSaleEnder) {
      fireSaleFinalTurnTaken[uid] = true;
    }

    // If this player just emptied their hand during fire sale, and nobody else
    // has triggered the round-end yet, mark them as the ender.
    if (fireSaleNowActive && cards.length === 0 && !fireSaleEnder) {
      fireSaleEnder = uid;
    }

    // Determine if the round should end now: everyone except the ender has
    // taken their final turn.
    const everyoneDone =
      fireSaleEnder !== null &&
      game.turnOrder.every((pid) => pid === fireSaleEnder || fireSaleFinalTurnTaken[pid]);

    if (everyoneDone) {
      // Collect all hands for scoring (we already have ours; read the rest).
      const handsByUid: Record<string, FruitBossHand> = { [uid]: { cards } };
      for (const pid of game.turnOrder) {
        if (pid === uid) continue;
        const snap = await tx.get(doc(db, "games", roomCode, "hands", pid));
        if (snap.exists()) handsByUid[pid] = snap.data() as FruitBossHand;
        else handsByUid[pid] = { cards: [] };
      }
      const finalGame: FruitBossGame = {
        ...game,
        deck,
        fireSale: fireSaleNowActive,
        fireSaleEnder,
        fireSaleFinalTurnTaken,
      };
      const { scores, breakdowns, winner } = computeScores(finalGame, handsByUid);

      tx.update(gameRef, {
        status: "finished",
        deck,
        fireSale: fireSaleNowActive,
        fireSaleEnder,
        fireSaleFinalTurnTaken,
        scores,
        scoringBreakdowns: breakdowns,
        winner,
        lastAction: `${displayName} ended the round`,
      });
      tx.update(handRef, { cards });
      return;
    }

    // Otherwise: advance the turn. Skip the fireSaleEnder if set; skip any
    // player who's already taken their final fire-sale turn.
    let nextTurn = (game.currentTurn + 1) % game.turnOrder.length;
    let safety = game.turnOrder.length;
    while (safety > 0) {
      const candidate = game.turnOrder[nextTurn];
      const isEnder = fireSaleEnder !== null && candidate === fireSaleEnder;
      const alreadyTaken = !!fireSaleFinalTurnTaken[candidate];
      if (!isEnder && !alreadyTaken) break;
      nextTurn = (nextTurn + 1) % game.turnOrder.length;
      safety--;
    }

    tx.update(gameRef, {
      deck,
      currentTurn: nextTurn,
      actionsLeft: 2,
      status: fireSaleNowActive ? "fire-sale" : game.status,
      fireSale: fireSaleNowActive,
      fireSaleEnder,
      fireSaleFinalTurnTaken,
      lastAction: `${displayName} ended their turn`,
    });
    tx.update(handRef, { cards });
  });
}
