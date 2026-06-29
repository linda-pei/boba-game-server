import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  onSnapshot,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  Room,
  TakeTimeGame,
  TakeTimeHand,
  TakeTimeCard,
  TakeTimePlacedCard,
  TakeTimeSegmentRule,
} from "../../types";
import { getLevel, getNextLevel } from "./levels";

// ---- Hooks ----

export function useTakeTimeGame(roomCode: string | undefined) {
  const [game, setGame] = useState<TakeTimeGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode),
      (snapshot) => {
        setGame(snapshot.data() as TakeTimeGame);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useTakeTimeHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<TakeTimeHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as TakeTimeHand);
        }
      }
    );
    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

// ---- Helpers ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): TakeTimeCard[] {
  const cards: TakeTimeCard[] = [];
  for (let v = 1; v <= 12; v++) {
    cards.push({ id: `W${v}`, color: "white", value: v });
    cards.push({ id: `B${v}`, color: "black", value: v });
  }
  return cards;
}

// ---- Game Actions ----

export async function startTakeTimeGame(
  roomCode: string,
  room: Room,
  bonusTokens = 0,
): Promise<void> {
  const chapter = room.settings.chapter ?? 1;
  const testNumber = room.settings.testNumber ?? 1;
  const levelDef = getLevel(chapter, testNumber);
  if (!levelDef) throw new Error(`Level ${chapter}-${testNumber} not found`);

  const playerUids = Object.keys(room.players);
  const playerCount = playerUids.length;
  const turnOrder = shuffle(playerUids);

  // Shuffle deck and deal 12 cards
  const deck = shuffle(buildDeck());
  const dealCards = deck.slice(0, 12);

  const cardsPerPlayer = Math.floor(12 / playerCount);
  const hands: Record<string, TakeTimeHand> = {};

  for (let i = 0; i < playerCount; i++) {
    const playerCards = dealCards.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    if (playerCount === 2) {
      // 2 players: see first 4, hide last 2
      hands[turnOrder[i]] = {
        cards: playerCards.slice(0, 4),
        hiddenCards: playerCards.slice(4, 6),
      };
    } else {
      hands[turnOrder[i]] = { cards: playerCards };
    }
  }

  const hasFaceUpBan = levelDef.specialRules?.includes("no-faceup");
  const bonusTokensEnabled = room.settings.bonusTokensEnabled === true;
  // Bonus tokens only matter when face-up reveals are allowed at all.
  const appliedBonus = hasFaceUpBan ? 0 : bonusTokens;
  const readyPlayers: Record<string, boolean> = {};
  turnOrder.forEach((uid) => { readyPlayers[uid] = false; });

  const emptySegments: Record<number, TakeTimePlacedCard[]> = {};
  for (let i = 1; i <= 6; i++) emptySegments[i] = [];

  // Keep remaining deck for draw mechanic (VII)
  const remainingDeck = deck.slice(12);

  // Check if level has draw segments
  const hasDrawRule = Object.values(levelDef.segmentRules).some(
    (rules) => rules.some((r) => r.type === "draw")
  );

  // Track hand sizes for draw mechanic (needed to know when players run out)
  const handSizes: Record<string, number> = {};
  for (const uid of turnOrder) {
    handSizes[uid] = hands[uid].cards.length;
  }

  // Track per-color hand sizes (public, for the player table breakdown).
  // For 2-player levels, the 2 hidden cards are still part of the player's full hand,
  // so include them in the initial count.
  const handColorSizes: Record<string, { white: number; black: number }> = {};
  const hiddenColorSizes: Record<string, { white: number; black: number }> = {};
  for (const uid of turnOrder) {
    const allCards = [...hands[uid].cards, ...(hands[uid].hiddenCards ?? [])];
    handColorSizes[uid] = {
      white: allCards.filter((c) => c.color === "white").length,
      black: allCards.filter((c) => c.color === "black").length,
    };
    const hidden = hands[uid].hiddenCards ?? [];
    if (hidden.length > 0) {
      hiddenColorSizes[uid] = {
        white: hidden.filter((c) => c.color === "white").length,
        black: hidden.filter((c) => c.color === "black").length,
      };
    }
  }

  const gameData: TakeTimeGame = {
    gameType: "take-time",
    status: "discussion",
    chapter,
    test: testNumber,
    levelDef,
    clockRotation: levelDef.startSegment - 1,
    turnOrder,
    currentTurn: 0,
    firstPlayer: null,
    cardsPlayed: 0,
    segments: emptySegments,
    faceUpRemaining: hasFaceUpBan ? 0 : playerCount + appliedBonus,
    bonusTokensEnabled,
    bonusTokens,
    readyPlayers,
    revealIndex: 0,
    twoPlayerRevealed: playerCount !== 2,
    lastAction: null,
    ...(hasDrawRule ? { deck: remainingDeck } : {}),
    ...(levelDef.secondHand !== undefined ? { secondHandPosition: levelDef.secondHand } : {}),
    boardRotation: 0,
    ...(hasDrawRule ? { handSizes } : {}),
    handColorSizes,
    ...(Object.keys(hiddenColorSizes).length > 0 ? { hiddenColorSizes } : {}),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "games", roomCode), gameData);
  for (const uid of turnOrder) {
    batch.set(doc(db, "games", roomCode, "hands", uid), hands[uid]);
  }
  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

export async function markReady(roomCode: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    [`readyPlayers.${uid}`]: true,
  });
}

export async function startPlacement(roomCode: string): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    status: "placement",
  });
}

export async function setClockRotation(roomCode: string, rotation: number): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    clockRotation: rotation,
  });
}

/** Get the logical segment (rule segment) at a physical position, accounting for board rotation */
function logicalSegment(physicalPos: number, boardRotation: number): number {
  return ((physicalPos - 1 - boardRotation + 600) % 6) + 1;
}

/** Get the rules that apply at a physical position, accounting for board rotation */
function getRulesAtPosition(
  game: TakeTimeGame,
  physicalPos: number,
): TakeTimeSegmentRule[] {
  const logical = logicalSegment(physicalPos, game.boardRotation ?? 0);
  return game.levelDef.segmentRules[logical] || [];
}

/** Check if a physical segment is blocked (by blocked rule or second hand) */
function isSegmentBlocked(game: TakeTimeGame, physicalPos: number): string | null {
  const rules = getRulesAtPosition(game, physicalPos);
  if (rules.some((r) => r.type === "blocked")) {
    return "This segment is blocked";
  }
  // Second hand blocks two opposing segments
  if (game.secondHandPosition !== undefined) {
    const sh = game.secondHandPosition;
    const opposite = ((sh - 1 + 3) % 6) + 1;
    if (physicalPos === sh || physicalPos === opposite) {
      return "This segment is blocked by the second hand";
    }
  }
  return null;
}

/** Validate card selection against clock rule constraints (Chapter IV) */
function validateCardSelection(
  game: TakeTimeGame,
  hand: TakeTimeHand,
  cardId: string,
): string | null {
  const { clockRule } = game.levelDef;

  if (clockRule === "high-to-low") {
    const maxVal = Math.max(...hand.cards.map((c) => c.value));
    const card = hand.cards.find((c) => c.id === cardId);
    if (card && card.value < maxVal) {
      return "Must play your highest value card";
    }
  } else if (clockRule === "low-to-high") {
    const minVal = Math.min(...hand.cards.map((c) => c.value));
    const card = hand.cards.find((c) => c.id === cardId);
    if (card && card.value > minVal) {
      return "Must play your lowest value card";
    }
  } else if (clockRule === "locked-order") {
    if (hand.cards[0] && hand.cards[0].id !== cardId) {
      return "Must play the leftmost card in your hand";
    }
  }

  return null;
}

export async function placeCard(
  roomCode: string,
  _game: TakeTimeGame,
  uid: string,
  cardId: string,
  segmentIndex: number,
  faceUp: boolean,
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);

  await runTransaction(db, async (txn) => {
    // ---- ALL READS FIRST ----
    const [gameSnap, handSnap] = await Promise.all([
      txn.get(gameRef),
      txn.get(handRef),
    ]);
    const game = gameSnap.data() as TakeTimeGame;
    const hand = handSnap.data() as TakeTimeHand;

    const newCardsPlayed = game.cardsPlayed + 1;
    const needsReveal =
      game.turnOrder.length === 2 &&
      newCardsPlayed === 4 &&
      !game.twoPlayerRevealed;

    // Pre-read other player's hand if we'll need it for reveal
    let otherPid: string | null = null;
    let otherHand: TakeTimeHand | null = null;
    if (needsReveal) {
      otherPid = game.turnOrder.find((pid) => pid !== uid) ?? null;
      if (otherPid) {
        const otherHandSnap = await txn.get(doc(db, "games", roomCode, "hands", otherPid));
        otherHand = otherHandSnap.data() as TakeTimeHand;
      }
    }

    // ---- VALIDATION ----

    // Check blocked segments (VIII blocked rule + X second hand)
    const blockReason = isSegmentBlocked(game, segmentIndex);
    if (blockReason) throw new Error(blockReason);

    // Check card selection constraints (IV: high-to-low, low-to-high, locked-order)
    const selectionError = validateCardSelection(game, hand, cardId);
    if (selectionError) throw new Error(selectionError);

    // ---- ALL WRITES BELOW ----
    const cardIdx = hand.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) throw new Error("Card not in hand");

    const card = hand.cards[cardIdx];
    let newCards = hand.cards.filter((_, i) => i !== cardIdx);
    const turnNumber = game.cardsPlayed + 1;

    const placedCard: TakeTimePlacedCard = {
      cardId: card.id,
      color: card.color,
      value: card.value,
      faceUp,
      playedBy: uid,
      turnNumber,
      revealed: faceUp,
    };

    const newSegmentCards = [...(game.segments[segmentIndex] || []), placedCard];

    // Check if this segment has a draw rule (VII) — draw from deck
    const segmentRules = getRulesAtPosition(game, segmentIndex);
    const hasDraw = segmentRules.some((r) => r.type === "draw");
    let drawnCard: TakeTimeCard | null = null;
    let newDeck = game.deck ? [...game.deck] : [];
    if (hasDraw && newDeck.length > 0) {
      drawnCard = newDeck.shift()!;
      newCards = [...newCards, drawnCard];
    }

    // Check for rotation rules (VIII)
    const hasClockwise = segmentRules.some((r) => r.type === "clockwise");
    const hasCounterClockwise = segmentRules.some((r) => r.type === "counter-clockwise");
    let newBoardRotation = game.boardRotation ?? 0;
    if (hasClockwise) newBoardRotation += 1;
    if (hasCounterClockwise) newBoardRotation -= 1;

    // Rotate second hand after each turn (X)
    let newSecondHandPos = game.secondHandPosition;
    if (newSecondHandPos !== undefined) {
      newSecondHandPos = ((newSecondHandPos - 1 + 1) % 6) + 1; // advance 1 clockwise
    }

    // Determine next turn (skip players with empty hands for draw levels)
    const hasDrawMechanic = game.deck !== undefined;
    let newHandSize = newCards.length;

    // Update hand sizes tracking
    const handSizes = game.handSizes ? { ...game.handSizes } : {};
    handSizes[uid] = newHandSize;

    // Update per-color counts: -1 for played card, +1 if a card was drawn.
    const handColorSizes = game.handColorSizes
      ? Object.fromEntries(
          Object.entries(game.handColorSizes).map(([k, v]) => [k, { ...v }])
        )
      : {};
    if (handColorSizes[uid]) {
      handColorSizes[uid][card.color]--;
      if (drawnCard) handColorSizes[uid][drawnCard.color]++;
    }

    // For 2-player reveal, update sizes
    if (needsReveal) {
      if (hand.hiddenCards && hand.hiddenCards.length > 0) {
        newHandSize = newCards.length + hand.hiddenCards.length;
        handSizes[uid] = newHandSize;
      }
      if (otherPid && otherHand && otherHand.hiddenCards && otherHand.hiddenCards.length > 0) {
        handSizes[otherPid] = otherHand.cards.length + otherHand.hiddenCards.length;
      }
    }

    // Calculate next turn
    let nextTurn: number;
    if (game.cardsPlayed === 0) {
      const playerIdx = game.turnOrder.indexOf(uid);
      nextTurn = (playerIdx + 1) % game.turnOrder.length;
    } else {
      nextTurn = (game.currentTurn + 1) % game.turnOrder.length;
    }

    // Check if game is done (all hands empty)
    let allDone = false;
    if (hasDrawMechanic) {
      // With draw mechanic, check handSizes
      allDone = Object.values(handSizes).every((s) => s === 0);
      if (!allDone) {
        // Skip players with no cards
        let checks = 0;
        while (handSizes[game.turnOrder[nextTurn]] === 0 && checks < game.turnOrder.length) {
          nextTurn = (nextTurn + 1) % game.turnOrder.length;
          checks++;
        }
        if (checks >= game.turnOrder.length) allDone = true;
      }
    } else {
      allDone = newCardsPlayed >= 12;
    }

    // Update hand
    if (needsReveal && hand.hiddenCards && hand.hiddenCards.length > 0) {
      txn.update(handRef, {
        cards: [...newCards, ...hand.hiddenCards],
        hiddenCards: [],
      });
    } else {
      txn.update(handRef, { cards: newCards });
    }

    // Build game updates
    const gameUpdates: Record<string, unknown> = {
      [`segments.${segmentIndex}`]: newSegmentCards,
      cardsPlayed: newCardsPlayed,
      currentTurn: nextTurn,
      lastAction: `${card.id} placed on segment ${segmentIndex}`,
    };

    if (faceUp && game.faceUpRemaining > 0) {
      gameUpdates.faceUpRemaining = game.faceUpRemaining - 1;
    }

    if (game.cardsPlayed === 0) {
      gameUpdates.firstPlayer = uid;
    }

    // Board rotation (VIII)
    if (newBoardRotation !== (game.boardRotation ?? 0)) {
      gameUpdates.boardRotation = newBoardRotation;
      // VIII-4: clock hand rotates with board
      if (game.levelDef.handRotatesWithBoard) {
        gameUpdates.clockRotation = game.clockRotation + (newBoardRotation - (game.boardRotation ?? 0));
      }
    }

    // Second hand rotation (X)
    if (newSecondHandPos !== game.secondHandPosition) {
      gameUpdates.secondHandPosition = newSecondHandPos;
    }

    // Draw mechanic: update deck and hand sizes
    if (hasDraw && game.deck !== undefined) {
      gameUpdates.deck = newDeck;
    }
    if (game.handSizes !== undefined) {
      gameUpdates.handSizes = handSizes;
    }
    if (game.handColorSizes !== undefined) {
      gameUpdates.handColorSizes = handColorSizes;
    }

    if (allDone) {
      gameUpdates.status = "resolution";
      gameUpdates.revealIndex = 0;
    }

    txn.update(gameRef, gameUpdates);

    // 2-player hidden card reveal: other player
    if (needsReveal) {
      if (otherPid && otherHand && otherHand.hiddenCards && otherHand.hiddenCards.length > 0) {
        txn.update(doc(db, "games", roomCode, "hands", otherPid), {
          cards: [...otherHand.cards, ...otherHand.hiddenCards],
          hiddenCards: [],
        });
      }
      txn.update(gameRef, { twoPlayerRevealed: true, hiddenColorSizes: {} });
    }
  });
}

export function getCardsPlayedByPlayer(game: TakeTimeGame): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pid of game.turnOrder) counts[pid] = 0;
  for (const seg of Object.values(game.segments)) {
    for (const card of seg) {
      if (card.playedBy) counts[card.playedBy] = (counts[card.playedBy] ?? 0) + 1;
    }
  }
  return counts;
}

export async function advanceReveal(roomCode: string, game: TakeTimeGame): Promise<void> {
  const segmentIndex = ((game.revealIndex + game.clockRotation) % 6) + 1;
  const segmentCards = game.segments[segmentIndex] || [];

  // Mark all cards in this segment as revealed
  const revealedCards = segmentCards.map((c) => ({ ...c, revealed: true }));

  const newRevealIndex = game.revealIndex + 1;
  const updates: Record<string, unknown> = {
    [`segments.${segmentIndex}`]: revealedCards,
    revealIndex: newRevealIndex,
  };

  // If all segments revealed and hand is not adjustable, auto-validate
  if (newRevealIndex === 6 && !game.levelDef.handAdjustable) {
    const updatedSegments = { ...game.segments, [segmentIndex]: revealedCards };
    const updatedGame = { ...game, segments: updatedSegments };
    const result = validateTest(updatedGame);
    updates.status = result.passed ? "pass" : "fail";
    updates.lastAction = result.passed
      ? "Test passed!"
      : `Test failed: ${result.violations.join("; ")}`;
    const earned = bonusTokenOnFail(game, result.passed);
    if (earned !== null) updates.bonusTokens = earned;
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

/**
 * If the bonus-token setting is on and the test just failed, return the new bonus token
 * count (current + 1, capped at 3). Returns null when no change should be written.
 */
function bonusTokenOnFail(game: TakeTimeGame, passed: boolean): number | null {
  if (passed || !game.bonusTokensEnabled) return null;
  const current = game.bonusTokens ?? 0;
  if (current >= 3) return null;
  return current + 1;
}

export async function finalizeRotation(roomCode: string, game: TakeTimeGame): Promise<void> {
  // Called after post-reveal rotation adjustment (Chapter III+)
  const result = validateTest(game);
  const updates: Record<string, unknown> = {
    status: result.passed ? "pass" : "fail",
    lastAction: result.passed
      ? "Test passed!"
      : `Test failed: ${result.violations.join("; ")}`,
  };
  const earned = bonusTokenOnFail(game, result.passed);
  if (earned !== null) updates.bonusTokens = earned;
  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function retryTest(
  roomCode: string,
  room: Room,
  bonusTokens = 0,
): Promise<void> {
  await startTakeTimeGame(roomCode, room, bonusTokens);
}

/**
 * Turn on the bonus-token feature mid-game from the test-result screen. Persists the setting
 * to the room (so future tests keep it) and, when called on a failed test, immediately awards
 * the bonus token for this loss (capped at 3) so the retry benefits.
 */
export async function enableBonusTokens(roomCode: string): Promise<void> {
  await runTransaction(db, async (txn) => {
    const gameRef = doc(db, "games", roomCode);
    const gameSnap = await txn.get(gameRef);
    if (!gameSnap.exists()) return;
    const game = gameSnap.data() as TakeTimeGame;

    txn.update(doc(db, "rooms", roomCode), { "settings.bonusTokensEnabled": true });

    const updates: Record<string, unknown> = { bonusTokensEnabled: true };
    // Treat enabling-on-a-loss as if the setting had been on for this failure.
    const earned = bonusTokenOnFail({ ...game, bonusTokensEnabled: true }, game.status === "pass");
    if (earned !== null) updates.bonusTokens = earned;
    txn.update(gameRef, updates);
  });
}

export async function nextTest(roomCode: string, room: Room, game: TakeTimeGame): Promise<void> {
  const next = getNextLevel(game.chapter, game.test);
  if (!next) return;
  // Update room settings then restart
  await updateDoc(doc(db, "rooms", roomCode), {
    "settings.chapter": next.chapter,
    "settings.testNumber": next.test,
  });
  // Re-read room with updated settings
  const updatedRoom: Room = {
    ...room,
    settings: { ...room.settings, chapter: next.chapter, testNumber: next.test },
  };
  await startTakeTimeGame(roomCode, updatedRoom);
}

export async function backToLobby(roomCode: string): Promise<void> {
  await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
}

// ---- Validation ----

/** Compute segment values: sum for normal, |max-min| for difference mode */
function computeSegmentValues(
  segments: Record<number, TakeTimePlacedCard[]>,
  clockRule: string,
): Record<number, number> {
  const vals: Record<number, number> = {};
  for (let s = 1; s <= 6; s++) {
    const cards = segments[s] || [];
    if (cards.length === 0) { vals[s] = 0; continue; }
    if (clockRule === "difference") {
      const values = cards.map((c) => c.value);
      vals[s] = Math.max(...values) - Math.min(...values);
    } else {
      vals[s] = cards.reduce((acc, c) => acc + c.value, 0);
    }
  }
  return vals;
}

export function validateTest(game: TakeTimeGame): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  const { segments, clockRotation, levelDef } = game;

  // Get segments in clockwise order starting from clock hand
  const orderedSegments: number[] = [];
  for (let i = 0; i < 6; i++) {
    orderedSegments.push(((i + clockRotation) % 6) + 1);
  }

  // Compute segment values (sum or difference)
  const sums = computeSegmentValues(segments, levelDef.clockRule);

  // Rule 1: at least 1 card per segment
  for (let s = 1; s <= 6; s++) {
    if (!segments[s] || segments[s].length === 0) {
      violations.push(`Segment ${s}: no cards placed`);
    }
  }

  // Rule 2: ascending values in clock order
  for (let i = 1; i < orderedSegments.length; i++) {
    const prev = orderedSegments[i - 1];
    const curr = orderedSegments[i];
    if (sums[curr] < sums[prev]) {
      const label = levelDef.clockRule === "difference" ? "diff" : "sum";
      violations.push(`Segment ${curr} (${label} ${sums[curr]}) < segment ${prev} (${label} ${sums[prev]})`);
    }
  }

  // Rule 3: sums <= 24 (unless infinity or difference mode)
  if (levelDef.clockRule !== "infinity" && levelDef.clockRule !== "difference") {
    for (let s = 1; s <= 6; s++) {
      if (sums[s] > 24) {
        violations.push(`Segment ${s}: sum ${sums[s]} exceeds 24`);
      }
    }
  }

  // Two-per-segment: exactly 2 cards each (V, VI)
  if (levelDef.clockRule === "two-per-segment" || levelDef.clockRule === "difference") {
    for (let s = 1; s <= 6; s++) {
      const count = (segments[s] || []).length;
      if (count !== 2) {
        violations.push(`Segment ${s}: must have exactly 2 cards, has ${count}`);
      }
    }
  }

  // Max-spread: max difference between highest and lowest segment values (IX)
  if (levelDef.clockRule === "max-spread" && levelDef.maxSpread !== undefined) {
    const vals = Object.values(sums);
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread > levelDef.maxSpread) {
      violations.push(`Spread between highest and lowest segment is ${spread}, max allowed is ${levelDef.maxSpread}`);
    }
  }

  // Hour hand: first cards placed in each segment must be ascending from hour hand (X)
  if (levelDef.hourHand !== undefined) {
    const hourOrder: number[] = [];
    for (let i = 0; i < 6; i++) {
      hourOrder.push(((i + levelDef.hourHand - 1) % 6) + 1);
    }
    for (let i = 1; i < hourOrder.length; i++) {
      const prevSeg = hourOrder[i - 1];
      const currSeg = hourOrder[i];
      const prevFirst = (segments[prevSeg] || [])[0];
      const currFirst = (segments[currSeg] || [])[0];
      if (prevFirst && currFirst && currFirst.value < prevFirst.value) {
        violations.push(`Hour hand: first card in segment ${currSeg} (${currFirst.value}) < first card in segment ${prevSeg} (${prevFirst.value})`);
      }
    }
  }

  // Between-segment rules (IX) — map logical to physical
  const boardRot2 = game.boardRotation ?? 0;
  if (levelDef.betweenRules) {
    for (const br of levelDef.betweenRules) {
      const logSeg1 = br.segment;
      const logSeg2 = (logSeg1 % 6) + 1;
      const seg1 = ((logSeg1 - 1 + boardRot2 + 600) % 6) + 1;
      const seg2 = ((logSeg2 - 1 + boardRot2 + 600) % 6) + 1;
      const v1 = sums[seg1];
      const v2 = sums[seg2];
      if (br.type === "min-diff") {
        const diff = Math.abs(v2 - v1);
        if (diff < (br.minDiff ?? 0)) {
          violations.push(`Between segments ${seg1}–${seg2}: difference ${diff} < required ${br.minDiff}`);
        }
      } else if (br.type === "equal") {
        if (v1 !== v2) {
          violations.push(`Segments ${seg1} and ${seg2} must be equal (${v1} ≠ ${v2})`);
        }
      }
    }
  }

  // Segment-specific rules
  // With board rotation (VIII), rules shift: logical segment s → physical position ((s-1+boardRotation) % 6) + 1
  const boardRot = game.boardRotation ?? 0;
  const allCards = Object.values(segments).flat();

  // Collect physical segments with min/max rules for cross-segment validation
  const minSegs: number[] = [];
  const maxSegs: number[] = [];

  for (const [segStr, rules] of Object.entries(levelDef.segmentRules)) {
    const logicalSeg = Number(segStr);
    // Map logical segment to physical position (accounting for board rotation)
    const physicalSeg = ((logicalSeg - 1 + boardRot + 600) % 6) + 1;
    const segCards = segments[physicalSeg] || [];

    for (const rule of rules) {
      if (rule.type === "min") { minSegs.push(physicalSeg); continue; }
      if (rule.type === "max") { maxSegs.push(physicalSeg); continue; }
      // Skip placement-only rules during validation
      if (rule.type === "draw" || rule.type === "clockwise" || rule.type === "counter-clockwise" || rule.type === "blocked") continue;
      const v = checkSegmentRule(rule, physicalSeg, segCards, sums, allCards, segments);
      if (v) violations.push(`Segment ${physicalSeg}: ${v}`);
    }
  }

  // Validate min rules
  if (minSegs.length > 0) {
    const sortedVals = [...allCards.map((c) => c.value)].sort((a, b) => a - b);
    const targetMins = sortedVals.slice(0, minSegs.length);
    const minSegCards = minSegs.flatMap((s) => segments[s] || []);
    for (const target of targetMins) {
      if (!minSegCards.some((c) => c.value === target)) {
        violations.push(`Min segments must collectively contain the ${minSegs.length} lowest values (missing ${target})`);
      }
    }
  }

  // Validate max rules
  if (maxSegs.length > 0) {
    const sortedVals = [...allCards.map((c) => c.value)].sort((a, b) => b - a);
    const targetMaxes = sortedVals.slice(0, maxSegs.length);
    const maxSegCards = maxSegs.flatMap((s) => segments[s] || []);
    for (const target of targetMaxes) {
      if (!maxSegCards.some((c) => c.value === target)) {
        violations.push(`Max segments must collectively contain the ${maxSegs.length} highest values (missing ${target})`);
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

function checkSegmentRule(
  rule: TakeTimeSegmentRule,
  seg: number,
  segCards: TakeTimePlacedCard[],
  sums: Record<number, number>,
  allCards: TakeTimePlacedCard[],
  allSegments: Record<number, TakeTimePlacedCard[]>,
): string | null {
  switch (rule.type) {
    case "color-count": {
      const whites = segCards.filter((c) => c.color === "white").length;
      const blacks = segCards.filter((c) => c.color === "black").length;
      const totalRequired = (rule.whiteCount ?? 0) + (rule.blackCount ?? 0);
      if (rule.whiteCount !== undefined && whites !== rule.whiteCount)
        return `needs ${rule.whiteCount}W, has ${whites}W`;
      if (rule.blackCount !== undefined && blacks !== rule.blackCount)
        return `needs ${rule.blackCount}B, has ${blacks}B`;
      if (segCards.length !== totalRequired)
        return `needs exactly ${totalRequired} cards, has ${segCards.length}`;
      return null;
    }
    case "card-count":
      if (segCards.length !== rule.cardCount)
        return `needs ${rule.cardCount} cards, has ${segCards.length}`;
      return null;
    case "value-range": {
      const sum = sums[seg];
      if (sum < rule.range![0] || sum > rule.range![1])
        return `sum ${sum} not in [${rule.range![0]}, ${rule.range![1]}]`;
      return null;
    }
    case "no-values": {
      const bad = segCards.filter((c) => rule.excludedValues!.includes(c.value));
      if (bad.length > 0)
        return `contains forbidden value(s): ${bad.map((c) => c.value).join(",")}`;
      return null;
    }
    case "turn-order": {
      const hasCard = segCards.some((c) => c.turnNumber === rule.turnNumber);
      if (!hasCard)
        return `must contain the card played on turn ${rule.turnNumber}`;
      return null;
    }
    case "closest-to": {
      const target = rule.targetValue!;
      const segDiff = Math.abs(sums[seg] - target);
      const minDiff = Math.min(
        ...Object.values(sums).map((s) => Math.abs(s - target))
      );
      if (segDiff > minDiff)
        return `sum ${sums[seg]} is not closest to ${target}`;
      return null;
    }
    case "max":
    case "min":
      // Handled at validateTest level for cross-segment logic
      return null;
    case "color-max": {
      const colorCards = allCards.filter((c) => c.color === rule.color);
      if (colorCards.length === 0) return null;
      const maxVal = Math.max(...colorCards.map((c) => c.value));
      if (!segCards.some((c) => c.color === rule.color && c.value === maxVal))
        return `must contain highest ${rule.color} card (${maxVal})`;
      return null;
    }
    case "color-min": {
      const colorCards = allCards.filter((c) => c.color === rule.color);
      if (colorCards.length === 0) return null;
      const minVal = Math.min(...colorCards.map((c) => c.value));
      if (!segCards.some((c) => c.color === rule.color && c.value === minVal))
        return `must contain lowest ${rule.color} card (${minVal})`;
      return null;
    }
    case "last-play": {
      const maxTurn = Math.max(...allCards.map((c) => c.turnNumber));
      if (!segCards.some((c) => c.turnNumber === maxTurn))
        return `must contain the last card played`;
      return null;
    }
    // Placement-only rules — no validation needed
    case "draw":
    case "clockwise":
    case "counter-clockwise":
    case "blocked":
      return null;
    default:
      return null;
  }
}
