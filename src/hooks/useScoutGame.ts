import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ScoutGame, ScoutHand, ScoutCard, Room } from "../types";
import {
  generateScoutDeck,
  filterDeckForPlayerCount,
  flipCard,
  flipHand,
  dealCards,
  validatePlay,
  beatsCurrentPile,
  shuffled,
} from "../utils/scoutDeck";

// ---- Realtime listeners ----

export function useScoutGame(roomCode: string | undefined) {
  const [game, setGame] = useState<ScoutGame | null>(null);
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
          setGame(snapshot.data() as ScoutGame);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Scout game listener error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useScoutHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<ScoutHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as ScoutHand);
        } else {
          setHand(null);
        }
      }
    );

    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

/** Summary of each player's hand visible to all (card count + S&S token status). */
export interface PlayerHandInfo {
  cardCount: number;
  hasUsedScoutPlay: boolean;
}

export function useAllScoutHandInfo(
  roomCode: string | undefined,
  playerUids: string[]
) {
  const [info, setInfo] = useState<Record<string, PlayerHandInfo>>({});

  useEffect(() => {
    if (!roomCode || playerUids.length === 0) return;

    const unsubs = playerUids.map((uid) =>
      onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ScoutHand;
          setInfo((prev) => ({
            ...prev,
            [uid]: {
              cardCount: data.cards?.length ?? 0,
              hasUsedScoutPlay: data.hasUsedScoutPlay ?? false,
            },
          }));
        }
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [roomCode, playerUids.join(",")]);

  return info;
}

// ---- Shared helpers ----

function validateConsecutiveIndices(indices: number[]): number[] {
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      throw new Error("Selected cards must be consecutive in hand");
    }
  }
  return sorted;
}

function takeFromPile(
  pileCards: ScoutCard[],
  fromEnd: "left" | "right",
  flip: boolean
): { taken: ScoutCard; remaining: ScoutCard[] } {
  const remaining = [...pileCards];
  const raw = fromEnd === "left" ? remaining.shift()! : remaining.pop()!;
  const taken = flip ? flipCard(raw) : raw;
  return { taken, remaining };
}

function awardDollarToken(
  scores: ScoutGame["scores"],
  pileOwner: string
): ScoutGame["scores"] {
  const newScores = { ...scores };
  newScores[pileOwner] = {
    capturedCount: newScores[pileOwner]?.capturedCount ?? 0,
    dollarTokens: (newScores[pileOwner]?.dollarTokens ?? 0) + 1,
  };
  return newScores;
}

function addCaptured(
  scores: ScoutGame["scores"],
  uid: string,
  count: number
): ScoutGame["scores"] {
  const newScores = { ...scores };
  newScores[uid] = {
    capturedCount: (newScores[uid]?.capturedCount ?? 0) + count,
    dollarTokens: newScores[uid]?.dollarTokens ?? 0,
  };
  return newScores;
}

async function readHand(roomCode: string, uid: string): Promise<ScoutHand> {
  const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
  if (!handSnap.exists()) throw new Error("Hand not found");
  return handSnap.data() as ScoutHand;
}

async function writeHand(
  roomCode: string,
  uid: string,
  cards: ScoutCard[],
  hasUsedScoutPlay: boolean
): Promise<void> {
  await setDoc(doc(db, "games", roomCode, "hands", uid), {
    cards,
    hasUsedScoutPlay,
  });
}

function initPerRoundState(turnOrder: string[]) {
  const scores: Record<string, { capturedCount: number; dollarTokens: number }> = {};
  const setupConfirmed: Record<string, boolean> = {};
  for (const uid of turnOrder) {
    scores[uid] = { capturedCount: 0, dollarTokens: 0 };
    setupConfirmed[uid] = false;
  }
  return { scores, setupConfirmed };
}

// ---- Game actions ----

export async function startScoutGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const playerUids = Object.keys(room.players);
  const playerCount = playerUids.length;

  const turnOrder = shuffled(playerUids);
  const dealerIndex = 0;

  const fullDeck = generateScoutDeck();
  const deck = filterDeckForPlayerCount(fullDeck, playerCount);
  const hands = dealCards(deck, playerCount);

  const { scores, setupConfirmed } = initPerRoundState(turnOrder);
  const cumulativeScores: Record<string, number> = {};
  for (const uid of turnOrder) {
    cumulativeScores[uid] = 0;
  }

  const gameDoc: ScoutGame = {
    gameType: "scout",
    status: "setup",
    turnOrder,
    currentTurn: (dealerIndex + 1) % playerCount,
    dealerIndex,
    roundNumber: 1,
    centerPile: null,
    consecutiveScouts: 0,
    scores,
    cumulativeScores,
    setupConfirmed,
    roundEndReason: null,
    roundEndPlayer: null,
    winner: null,
  };

  await setDoc(doc(db, "games", roomCode), gameDoc);

  for (let i = 0; i < turnOrder.length; i++) {
    await writeHand(roomCode, turnOrder[i], hands[i], false);
  }

  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

export async function confirmHandOrientation(
  roomCode: string,
  uid: string,
  flip: boolean
): Promise<void> {
  if (flip) {
    const hand = await readHand(roomCode, uid);
    await writeHand(roomCode, uid, flipHand(hand.cards), hand.hasUsedScoutPlay);
  }

  await updateDoc(doc(db, "games", roomCode), {
    [`setupConfirmed.${uid}`]: true,
  });

  const gameSnap = await getDoc(doc(db, "games", roomCode));
  if (gameSnap.exists()) {
    const game = gameSnap.data() as ScoutGame;
    const allConfirmed = game.turnOrder.every(
      (pid) => pid === uid ? true : game.setupConfirmed[pid]
    );
    if (allConfirmed) {
      await updateDoc(doc(db, "games", roomCode), { status: "in-progress" });
    }
  }
}

export async function playScoutCards(
  roomCode: string,
  game: ScoutGame,
  uid: string,
  selectedIndices: number[]
): Promise<void> {
  const hand = await readHand(roomCode, uid);
  const sorted = validateConsecutiveIndices(selectedIndices);

  const selectedCards = sorted.map((i) => hand.cards[i]);
  const play = validatePlay(selectedCards);
  if (!play.valid) throw new Error("Invalid play");

  if (game.centerPile) {
    const incumbent = validatePlay(game.centerPile.cards);
    if (!beatsCurrentPile(play, incumbent)) {
      throw new Error("Play does not beat current pile");
    }
  }

  const capturedCount = game.centerPile ? game.centerPile.cards.length : 0;
  const newCards = hand.cards.filter((_, i) => !sorted.includes(i));

  await writeHand(roomCode, uid, newCards, hand.hasUsedScoutPlay);

  const newScores = addCaptured(game.scores, uid, capturedCount);

  const updates: Record<string, unknown> = {
    centerPile: { cards: selectedCards, playedBy: uid },
    consecutiveScouts: 0,
    scores: newScores,
  };

  if (newCards.length === 0) {
    updates.status = "round-end";
    updates.roundEndReason = "hand-emptied";
    updates.roundEndPlayer = uid;
  } else {
    updates.currentTurn = (game.currentTurn + 1) % game.turnOrder.length;
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function scoutCard(
  roomCode: string,
  game: ScoutGame,
  uid: string,
  fromEnd: "left" | "right",
  flipIt: boolean,
  insertAtIndex: number
): Promise<void> {
  if (!game.centerPile || game.centerPile.cards.length === 0) {
    throw new Error("No pile to scout from");
  }

  const { taken, remaining } = takeFromPile(game.centerPile.cards, fromEnd, flipIt);

  const hand = await readHand(roomCode, uid);
  const newCards = [...hand.cards];
  newCards.splice(insertAtIndex, 0, taken);
  await writeHand(roomCode, uid, newCards, hand.hasUsedScoutPlay);

  let newScores = awardDollarToken(game.scores, game.centerPile.playedBy);
  const newConsecutiveScouts = game.consecutiveScouts + 1;

  const updates: Record<string, unknown> = {
    centerPile: remaining.length > 0 ? { cards: remaining, playedBy: game.centerPile.playedBy } : null,
    consecutiveScouts: newConsecutiveScouts,
    scores: newScores,
    currentTurn: (game.currentTurn + 1) % game.turnOrder.length,
  };

  if (newConsecutiveScouts >= game.turnOrder.length - 1) {
    updates.status = "round-end";
    updates.roundEndReason = "uncontested";
    updates.roundEndPlayer = game.centerPile.playedBy;
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function scoutAndPlay(
  roomCode: string,
  game: ScoutGame,
  uid: string,
  scoutParams: { fromEnd: "left" | "right"; flipIt: boolean; insertAtIndex: number },
  playIndices: number[]
): Promise<void> {
  if (!game.centerPile || game.centerPile.cards.length === 0) {
    throw new Error("No pile to scout from");
  }

  // Step 1: Scout
  const { taken, remaining } = takeFromPile(
    game.centerPile.cards,
    scoutParams.fromEnd,
    scoutParams.flipIt
  );

  const hand = await readHand(roomCode, uid);
  if (hand.hasUsedScoutPlay) throw new Error("Scout+Show already used this round");

  const handAfterScout = [...hand.cards];
  handAfterScout.splice(scoutParams.insertAtIndex, 0, taken);

  // Step 2: Play
  const sorted = validateConsecutiveIndices(playIndices);
  const selectedCards = sorted.map((i) => handAfterScout[i]);
  const play = validatePlay(selectedCards);
  if (!play.valid) throw new Error("Invalid play");

  if (remaining.length > 0) {
    const incumbent = validatePlay(remaining);
    if (incumbent.valid && !beatsCurrentPile(play, incumbent)) {
      throw new Error("Play does not beat remaining pile");
    }
  }

  const finalCards = handAfterScout.filter((_, i) => !sorted.includes(i));
  await writeHand(roomCode, uid, finalCards, true);

  let newScores = awardDollarToken(game.scores, game.centerPile.playedBy);
  newScores = addCaptured(newScores, uid, remaining.length);

  const updates: Record<string, unknown> = {
    centerPile: { cards: selectedCards, playedBy: uid },
    consecutiveScouts: 0,
    scores: newScores,
  };

  if (finalCards.length === 0) {
    updates.status = "round-end";
    updates.roundEndReason = "hand-emptied";
    updates.roundEndPlayer = uid;
  } else {
    updates.currentTurn = (game.currentTurn + 1) % game.turnOrder.length;
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function finalizeRound(
  roomCode: string,
  game: ScoutGame
): Promise<void> {
  const newCumulative = { ...game.cumulativeScores };

  for (const uid of game.turnOrder) {
    const s = game.scores[uid];
    let roundScore = (s?.capturedCount ?? 0) + (s?.dollarTokens ?? 0);

    const isUncontestedOwner =
      game.roundEndReason === "uncontested" && game.roundEndPlayer === uid;

    if (!isUncontestedOwner) {
      const hand = await readHand(roomCode, uid);
      roundScore -= hand.cards.length;
    }

    newCumulative[uid] = (newCumulative[uid] ?? 0) + roundScore;
  }

  const totalRounds = game.turnOrder.length;
  if (game.roundNumber >= totalRounds) {
    let maxScore = -Infinity;
    let winnerId: string | null = null;
    for (const uid of game.turnOrder) {
      if (newCumulative[uid] > maxScore) {
        maxScore = newCumulative[uid];
        winnerId = uid;
      }
    }

    await updateDoc(doc(db, "games", roomCode), {
      cumulativeScores: newCumulative,
      status: "finished",
      winner: winnerId,
    });
  } else {
    await updateDoc(doc(db, "games", roomCode), {
      cumulativeScores: newCumulative,
    });
  }
}

export async function startNextRound(
  roomCode: string,
  game: ScoutGame
): Promise<void> {
  const playerCount = game.turnOrder.length;
  const newDealerIndex = (game.dealerIndex + 1) % playerCount;

  const fullDeck = generateScoutDeck();
  const deck = filterDeckForPlayerCount(fullDeck, playerCount);
  const hands = dealCards(deck, playerCount);

  const { scores, setupConfirmed } = initPerRoundState(game.turnOrder);

  await updateDoc(doc(db, "games", roomCode), {
    status: "setup",
    currentTurn: (newDealerIndex + 1) % playerCount,
    dealerIndex: newDealerIndex,
    roundNumber: game.roundNumber + 1,
    centerPile: null,
    consecutiveScouts: 0,
    scores,
    setupConfirmed,
    roundEndReason: null,
    roundEndPlayer: null,
  });

  for (let i = 0; i < game.turnOrder.length; i++) {
    await writeHand(roomCode, game.turnOrder[i], hands[i], false);
  }
}
