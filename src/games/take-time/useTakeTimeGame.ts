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

export async function startTakeTimeGame(roomCode: string, room: Room): Promise<void> {
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
  const readyPlayers: Record<string, boolean> = {};
  turnOrder.forEach((uid) => { readyPlayers[uid] = false; });

  const emptySegments: Record<number, TakeTimePlacedCard[]> = {};
  for (let i = 1; i <= 6; i++) emptySegments[i] = [];

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
    faceUpRemaining: hasFaceUpBan ? 0 : playerCount,
    readyPlayers,
    revealIndex: 0,
    twoPlayerRevealed: playerCount !== 2,
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

    // ---- ALL WRITES BELOW ----
    const cardIdx = hand.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) throw new Error("Card not in hand");

    const card = hand.cards[cardIdx];
    const newCards = hand.cards.filter((_, i) => i !== cardIdx);
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

    // Update hand (may be overwritten below if reveal merges hidden cards)
    txn.update(handRef, { cards: newCards });

    // Build game updates
    const gameUpdates: Record<string, unknown> = {
      [`segments.${segmentIndex}`]: newSegmentCards,
      cardsPlayed: newCardsPlayed,
      lastAction: `${card.id} placed on segment ${segmentIndex}`,
    };

    if (faceUp && game.faceUpRemaining > 0) {
      gameUpdates.faceUpRemaining = game.faceUpRemaining - 1;
    }

    if (game.cardsPlayed === 0) {
      gameUpdates.firstPlayer = uid;
      const playerIdx = game.turnOrder.indexOf(uid);
      gameUpdates.currentTurn = (playerIdx + 1) % game.turnOrder.length;
    } else {
      gameUpdates.currentTurn = (game.currentTurn + 1) % game.turnOrder.length;
    }

    if (newCardsPlayed === 12) {
      gameUpdates.status = "resolution";
      gameUpdates.revealIndex = 0;
    }

    txn.update(gameRef, gameUpdates);

    // 2-player hidden card reveal: after 4 cards placed
    if (needsReveal) {
      // Current player: merge hidden cards into hand (use newCards which already has played card removed)
      if (hand.hiddenCards && hand.hiddenCards.length > 0) {
        txn.update(handRef, {
          cards: [...newCards, ...hand.hiddenCards],
          hiddenCards: [],
        });
      }
      // Other player: merge hidden cards using pre-read data
      if (otherPid && otherHand && otherHand.hiddenCards && otherHand.hiddenCards.length > 0) {
        txn.update(doc(db, "games", roomCode, "hands", otherPid), {
          cards: [...otherHand.cards, ...otherHand.hiddenCards],
          hiddenCards: [],
        });
      }
      txn.update(gameRef, { twoPlayerRevealed: true });
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
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function finalizeRotation(roomCode: string, game: TakeTimeGame): Promise<void> {
  // Called after post-reveal rotation adjustment (Chapter III+)
  const result = validateTest(game);
  await updateDoc(doc(db, "games", roomCode), {
    status: result.passed ? "pass" : "fail",
    lastAction: result.passed
      ? "Test passed!"
      : `Test failed: ${result.violations.join("; ")}`,
  });
}

export async function retryTest(roomCode: string, room: Room): Promise<void> {
  await startTakeTimeGame(roomCode, room);
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

export function validateTest(game: TakeTimeGame): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  const { segments, clockRotation, levelDef } = game;

  // Get segments in clockwise order starting from clock hand
  const orderedSegments: number[] = [];
  for (let i = 0; i < 6; i++) {
    orderedSegments.push(((i + clockRotation) % 6) + 1);
  }

  // Compute sums
  const sums: Record<number, number> = {};
  for (let s = 1; s <= 6; s++) {
    sums[s] = (segments[s] || []).reduce((acc, c) => acc + c.value, 0);
  }

  // Rule 1: at least 1 card per segment
  for (let s = 1; s <= 6; s++) {
    if (!segments[s] || segments[s].length === 0) {
      violations.push(`Segment ${s}: no cards placed`);
    }
  }

  // Rule 2: ascending sums in clock order
  for (let i = 1; i < orderedSegments.length; i++) {
    const prev = orderedSegments[i - 1];
    const curr = orderedSegments[i];
    if (sums[curr] < sums[prev]) {
      violations.push(`Segment ${curr} (${sums[curr]}) < segment ${prev} (${sums[prev]})`);
    }
  }

  // Rule 3: sums <= 24 (unless infinity)
  if (levelDef.clockRule !== "infinity") {
    for (let s = 1; s <= 6; s++) {
      if (sums[s] > 24) {
        violations.push(`Segment ${s}: sum ${sums[s]} exceeds 24`);
      }
    }
  }

  // Rule 4: segment-specific rules
  const allCards = Object.values(segments).flat();

  for (const [segStr, rules] of Object.entries(levelDef.segmentRules)) {
    const seg = Number(segStr);
    const segCards = segments[seg] || [];

    for (const rule of rules) {
      const v = checkSegmentRule(rule, seg, segCards, sums, allCards, segments);
      if (v) violations.push(`Segment ${seg}: ${v}`);
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
    case "max": {
      const maxVal = Math.max(...allCards.map((c) => c.value));
      if (!segCards.some((c) => c.value === maxVal))
        return `must contain highest value card (${maxVal})`;
      return null;
    }
    case "min": {
      // Find all segments with min rule
      const minVal = Math.min(...allCards.map((c) => c.value));
      if (!segCards.some((c) => c.value === minVal))
        return `must contain lowest value card (${minVal})`;
      return null;
    }
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
    default:
      return null;
  }
}
