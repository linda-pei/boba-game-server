import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  OrderOverloadGame,
  OrderOverloadHand,
  OrderOverloadAbility,
  Room,
} from "../../types";
import { shuffled } from "../../utils/shuffle";
import { getDeck } from "./deck";

// ---- Realtime listeners ----

export function useOrderOverloadGame(roomCode: string | undefined) {
  const [game, setGame] = useState<OrderOverloadGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode),
      (snapshot) => {
        if (snapshot.exists()) {
          setGame(snapshot.data() as OrderOverloadGame);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Order Overload game listener error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useOrderOverloadHand(
  roomCode: string | undefined,
  uid: string | null
) {
  const [hand, setHand] = useState<OrderOverloadHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as OrderOverloadHand);
        } else {
          setHand(null);
        }
      }
    );

    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

export function useAllOrderOverloadHandCounts(
  roomCode: string | undefined,
  playerUids: string[]
) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!roomCode || playerUids.length === 0) return;

    const unsubs = playerUids.map((uid) =>
      onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as OrderOverloadHand;
          setCounts((prev) => ({ ...prev, [uid]: data.cards?.length ?? 0 }));
        }
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [roomCode, playerUids.join(",")]);

  return counts;
}

// ---- Helpers ----

async function readHand(
  roomCode: string,
  uid: string
): Promise<OrderOverloadHand> {
  const snap = await getDoc(doc(db, "games", roomCode, "hands", uid));
  if (!snap.exists()) throw new Error("Hand not found");
  return snap.data() as OrderOverloadHand;
}

async function writeHand(
  roomCode: string,
  uid: string,
  hand: OrderOverloadHand
): Promise<void> {
  await setDoc(doc(db, "games", roomCode, "hands", uid), hand);
}

function getEmptiedToWin(playerCount: number): number {
  if (playerCount <= 2) return 1;
  if (playerCount <= 4) return 2;
  return 3;
}

/** Find next active player index (not eliminated; emptied players can still guess). */
function findNextActiveTurn(
  turnOrder: string[],
  currentIndex: number,
  eliminatedPlayers: string[],
  emptiedPlayers: string[]
): number {
  const count = turnOrder.length;
  for (let offset = 1; offset <= count; offset++) {
    const idx = (currentIndex + offset) % count;
    const uid = turnOrder[idx];
    if (!eliminatedPlayers.includes(uid)) {
      return idx;
    }
  }
  return -1; // no active players
}

function getLevelStars(level: number): number {
  if (level === 5) return 1;
  if (level === 6) return 2;
  if (level >= 7) return 3;
  return 0;
}

// ---- Game actions ----

export async function startOrderOverloadGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const playerUids = Object.keys(room.players);
  const playerCount = playerUids.length;
  const turnOrder = shuffled(playerUids);
  const level = 1;
  const orderTakerIndex = 0;
  const totalOrders = level * playerCount;

  // Assign random abilities
  const abilityTypes: OrderOverloadAbility[] = [
    "discard",
    "first-letter",
    "last-letter",
  ];
  const abilities: Record<string, OrderOverloadAbility> = {};
  const abilitiesUsed: Record<string, boolean> = {};
  for (const uid of turnOrder) {
    abilities[uid] = abilityTypes[Math.floor(Math.random() * abilityTypes.length)];
    abilitiesUsed[uid] = false;
  }

  // Draw orders for level 1
  const deckId = room.settings.deckId ?? "cafe";
  const drawnOrders = shuffled(getDeck(deckId)).slice(0, totalOrders);

  const gameDoc: OrderOverloadGame = {
    gameType: "order-overload",
    deckId,
    status: "reading",
    level,
    turnOrder,
    currentTurn: (orderTakerIndex + 1) % playerCount,
    orderTakerIndex,

    readingIndex: 0,
    totalOrdersForLevel: totalOrders,

    currentGuess: null,
    guessingPlayer: null,
    respondingOrder: [],
    respondingIndex: 0,
    lastGuessResult: null,
    foundByPlayer: null,

    abilities,
    abilitiesUsed,
    abilityReveals: [],

    revealedCards: {},

    eliminatedPlayers: [],
    emptiedPlayers: [],
    emptiedToWin: getEmptiedToWin(playerCount),
    levelResult: null,

    highestLevelPassed: 0,
    lastAction: null,
  };

  await setDoc(doc(db, "games", roomCode), gameDoc);

  // Write hand docs — order taker gets ordersToRead, others get empty hands for now
  for (const uid of turnOrder) {
    const isOrderTaker = uid === turnOrder[orderTakerIndex];
    const hand: OrderOverloadHand = {
      cards: [],
      ...(isOrderTaker ? { ordersToRead: drawnOrders } : {}),
    };
    await writeHand(roomCode, uid, hand);
  }

  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

export async function advanceReading(roomCode: string): Promise<void> {
  const gameSnap = await getDoc(doc(db, "games", roomCode));
  if (!gameSnap.exists()) throw new Error("Game not found");
  const game = gameSnap.data() as OrderOverloadGame;

  if (game.readingIndex >= game.totalOrdersForLevel - 1) {
    throw new Error("Already read all orders");
  }

  await updateDoc(doc(db, "games", roomCode), {
    readingIndex: game.readingIndex + 1,
  });
}

export async function finishReading(
  roomCode: string,
  game: OrderOverloadGame
): Promise<void> {
  const orderTakerUid = game.turnOrder[game.orderTakerIndex];
  const orderTakerHand = await readHand(roomCode, orderTakerUid);

  if (!orderTakerHand.ordersToRead) {
    throw new Error("No orders to deal");
  }

  const orders = shuffled(orderTakerHand.ordersToRead);
  const playerCount = game.turnOrder.length;
  const cardsPerPlayer = Math.floor(orders.length / playerCount);

  // Deal cards to all players
  for (let i = 0; i < playerCount; i++) {
    const uid = game.turnOrder[i];
    const cards = orders.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    await writeHand(roomCode, uid, { cards });
  }

  await updateDoc(doc(db, "games", roomCode), {
    status: "playing",
    currentGuess: null,
    guessingPlayer: null,
    lastGuessResult: null,
    foundByPlayer: null,
    lastAction: "Orders dealt! Start guessing.",
  });
}

export async function submitGuess(
  roomCode: string,
  game: OrderOverloadGame,
  uid: string,
  guessText: string
): Promise<void> {
  // Build responding order: clockwise from after the guesser, excluding the guesser and emptied players
  const guesserIdx = game.turnOrder.indexOf(uid);
  const respondingOrder: string[] = [];
  for (let offset = 1; offset < game.turnOrder.length; offset++) {
    const idx = (guesserIdx + offset) % game.turnOrder.length;
    const pid = game.turnOrder[idx];
    if (!game.emptiedPlayers.includes(pid)) {
      respondingOrder.push(pid);
    }
  }

  await updateDoc(doc(db, "games", roomCode), {
    currentGuess: guessText.trim(),
    guessingPlayer: uid,
    respondingOrder,
    respondingIndex: 0,
    lastGuessResult: null,
    foundByPlayer: null,
    lastAction: `${uid} guessed: "${guessText.trim()}"`,
  });
}

export async function respondToGuess(
  roomCode: string,
  game: OrderOverloadGame,
  uid: string,
  hasIt: boolean,
  cardIndex?: number
): Promise<void> {
  if (hasIt && cardIndex === undefined) {
    throw new Error("Must specify which card to discard");
  }

  if (hasIt) {
    // Remove the card from responder's hand
    const hand = await readHand(roomCode, uid);
    const revealedCard = hand.cards[cardIndex!];
    const newCards = hand.cards.filter((_, i) => i !== cardIndex);
    await writeHand(roomCode, uid, { cards: newCards });

    const newRevealedCards = { ...game.revealedCards };
    newRevealedCards[uid] = [...(newRevealedCards[uid] ?? []), revealedCard];

    const newEmptied = [...game.emptiedPlayers];
    if (newCards.length === 0 && !newEmptied.includes(uid)) {
      newEmptied.push(uid);
    }

    // Check level win
    if (newEmptied.length >= game.emptiedToWin) {
      await updateDoc(doc(db, "games", roomCode), {
        currentGuess: null,
        guessingPlayer: null,
        respondingOrder: [],
        respondingIndex: 0,
        lastGuessResult: "found",
        foundByPlayer: uid,
        revealedCards: newRevealedCards,
        emptiedPlayers: newEmptied,
        levelResult: "pass",
        status: "level-complete",
        highestLevelPassed: game.level,
        lastAction: `Level ${game.level} passed!`,
      });
      return;
    }

    // Advance turn to next active player
    const nextTurn = findNextActiveTurn(
      game.turnOrder,
      game.turnOrder.indexOf(game.guessingPlayer!),
      game.eliminatedPlayers,
      newEmptied
    );

    await updateDoc(doc(db, "games", roomCode), {
      currentGuess: null,
      guessingPlayer: null,
      respondingOrder: [],
      respondingIndex: 0,
      lastGuessResult: "found",
      foundByPlayer: uid,
      revealedCards: newRevealedCards,
      emptiedPlayers: newEmptied,
      currentTurn: nextTurn >= 0 ? nextTurn : game.currentTurn,
      lastAction: `${uid} had the order!`,
    });
    return;
  }

  // "I don't have it" — advance to next responder
  const nextRespondingIndex = game.respondingIndex + 1;

  if (nextRespondingIndex >= game.respondingOrder.length) {
    // Nobody had it — guesser is eliminated
    const guesser = game.guessingPlayer!;
    const newEliminated = [...game.eliminatedPlayers, guesser];
    const newEmptied = game.emptiedPlayers;

    // Check if all players are eliminated
    const activeRemaining = game.turnOrder.filter(
      (p) => !newEliminated.includes(p)
    );

    if (activeRemaining.length === 0) {
      // Level failed
      await updateDoc(doc(db, "games", roomCode), {
        currentGuess: null,
        guessingPlayer: null,
        respondingOrder: [],
        respondingIndex: 0,
        lastGuessResult: "not-found",
        foundByPlayer: null,
        eliminatedPlayers: newEliminated,
        levelResult: "fail",
        status: "level-complete",
        lastAction: `Nobody had it! ${guesser} is out. Level failed!`,
      });
      return;
    }

    // Guesser eliminated, advance turn
    const nextTurn = findNextActiveTurn(
      game.turnOrder,
      game.turnOrder.indexOf(guesser),
      newEliminated,
      newEmptied
    );

    await updateDoc(doc(db, "games", roomCode), {
      currentGuess: null,
      guessingPlayer: null,
      respondingOrder: [],
      respondingIndex: 0,
      lastGuessResult: "not-found",
      foundByPlayer: null,
      eliminatedPlayers: newEliminated,
      currentTurn: nextTurn >= 0 ? nextTurn : game.currentTurn,
      lastAction: `Nobody had it! ${guesser} is out.`,
    });
    return;
  }

  // More responders to go
  await updateDoc(doc(db, "games", roomCode), {
    respondingIndex: nextRespondingIndex,
  });
}

export async function useAbilityDiscard(
  roomCode: string,
  game: OrderOverloadGame,
  uid: string,
  cardIndex: number
): Promise<void> {
  const hand = await readHand(roomCode, uid);
  if (hand.cards.length <= 1) {
    throw new Error("Cannot discard your last card");
  }
  const newCards = hand.cards.filter((_, i) => i !== cardIndex);
  await writeHand(roomCode, uid, { cards: newCards });

  const newEmptied = [...game.emptiedPlayers];
  if (newCards.length === 0 && !newEmptied.includes(uid)) {
    newEmptied.push(uid);
  }

  const updates: Record<string, unknown> = {
    [`abilitiesUsed.${uid}`]: true,
    emptiedPlayers: newEmptied,
    lastAction: `${uid} used Discard ability.`,
  };

  // Check level win after discard
  if (newEmptied.length >= game.emptiedToWin) {
    updates.levelResult = "pass";
    updates.status = "level-complete";
    updates.highestLevelPassed = game.level;
    updates.lastAction = `Level ${game.level} passed!`;
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function useAbilityLetters(
  roomCode: string,
  game: OrderOverloadGame,
  uid: string,
  targetUid: string
): Promise<void> {
  const abilityType = game.abilities[uid];
  if (abilityType !== "first-letter" && abilityType !== "last-letter") {
    throw new Error("Player does not have a letter ability");
  }

  const targetHand = await readHand(roomCode, targetUid);
  const letters = targetHand.cards.map((card) =>
    abilityType === "first-letter"
      ? card.charAt(0).toUpperCase()
      : card.charAt(card.length - 1).toUpperCase()
  );

  const newReveals = [
    ...game.abilityReveals,
    { type: abilityType, targetUid, letters, usedBy: uid },
  ];

  await updateDoc(doc(db, "games", roomCode), {
    [`abilitiesUsed.${uid}`]: true,
    abilityReveals: newReveals,
    lastAction: `${uid} used ${abilityType === "first-letter" ? "First Letter" : "Last Letter"} ability on ${targetUid}.`,
  });
}

export async function continueToNextLevel(
  roomCode: string,
  game: OrderOverloadGame
): Promise<void> {
  const playerCount = game.turnOrder.length;
  const newLevel = game.level + 1;
  const newOrderTakerIndex = (game.orderTakerIndex + 1) % playerCount;
  const totalOrders = newLevel * playerCount;

  const drawnOrders = shuffled(getDeck(game.deckId)).slice(0, totalOrders);

  await updateDoc(doc(db, "games", roomCode), {
    status: "reading",
    level: newLevel,
    orderTakerIndex: newOrderTakerIndex,
    currentTurn: (newOrderTakerIndex + 1) % playerCount,
    readingIndex: 0,
    totalOrdersForLevel: totalOrders,
    currentGuess: null,
    guessingPlayer: null,
    respondingOrder: [],
    respondingIndex: 0,
    lastGuessResult: null,
    foundByPlayer: null,
    abilityReveals: [],
    revealedCards: {},
    eliminatedPlayers: [],
    emptiedPlayers: [],
    levelResult: null,
    lastAction: null,
  });

  // Reset hands — order taker gets ordersToRead
  for (const uid of game.turnOrder) {
    const isOrderTaker = uid === game.turnOrder[newOrderTakerIndex];
    const hand: OrderOverloadHand = {
      cards: [],
      ...(isOrderTaker ? { ordersToRead: drawnOrders } : {}),
    };
    await writeHand(roomCode, uid, hand);
  }
}

export async function retryLevel(
  roomCode: string,
  game: OrderOverloadGame
): Promise<void> {
  const playerCount = game.turnOrder.length;
  const totalOrders = game.level * playerCount;

  const drawnOrders = shuffled(getDeck(game.deckId)).slice(0, totalOrders);

  await updateDoc(doc(db, "games", roomCode), {
    status: "reading",
    readingIndex: 0,
    totalOrdersForLevel: totalOrders,
    currentTurn: (game.orderTakerIndex + 1) % playerCount,
    currentGuess: null,
    guessingPlayer: null,
    respondingOrder: [],
    respondingIndex: 0,
    lastGuessResult: null,
    foundByPlayer: null,
    abilityReveals: [],
    revealedCards: {},
    eliminatedPlayers: [],
    emptiedPlayers: [],
    levelResult: null,
    lastAction: null,
  });

  // Reset hands
  for (const uid of game.turnOrder) {
    const isOrderTaker = uid === game.turnOrder[game.orderTakerIndex];
    const hand: OrderOverloadHand = {
      cards: [],
      ...(isOrderTaker ? { ordersToRead: drawnOrders } : {}),
    };
    await writeHand(roomCode, uid, hand);
  }
}

export async function finishGame(roomCode: string): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    status: "finished",
  });
}

export { getLevelStars };
