import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase";
import { NOUN_CARDS, CONTEXT_CLUES, ATTRIBUTE_CLUES, WORD_CLUES, shuffled } from "../utils/deck";
import type { Game, Hand, Room } from "../types";

export function useGame(roomCode: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode),
      (snapshot) => {
        if (snapshot.exists()) {
          setGame(snapshot.data() as Game);
          setError(null);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Game listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading, error };
}

export function useHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<Hand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as Hand);
        } else {
          setHand(null);
        }
      }
    );

    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

export async function startGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const knowerUid = room.settings.knower!;
  const allPlayerUids = Object.keys(room.players);
  const nonKnowerUids = allPlayerUids.filter((uid) => uid !== knowerUid);
  const numRings = room.settings.numRings;

  const deck = shuffled(NOUN_CARDS);

  // Draw one clue from each category: context (ring 0), attribute (ring 1), word (ring 2)
  const contextClue = shuffled(CONTEXT_CLUES)[0];
  const attributeClue = shuffled(ATTRIBUTE_CLUES)[0];
  const wordClue = shuffled(WORD_CLUES)[0];
  const knowerClues = [contextClue, attributeClue, wordClue];

  // Deal 5 cards to each player (including knower)
  const hands: Record<string, string[]> = {};
  for (const uid of allPlayerUids) {
    hands[uid] = deck.splice(0, 5);
  }

  const gameDoc: Game = {
    gameType: "things-in-rings",
    mode: "competitive",
    status: "knower-setup",
    knower: knowerUid,
    numRings,
    rings: knowerClues.map((label) => ({ label })),
    ringAssignments: {},
    playedCards: {},
    pendingPlay: null,
    deck,
    turnOrder: nonKnowerUids,
    currentTurn: 0,
    winner: null,
  };

  // Write game doc
  await setDoc(doc(db, "games", roomCode), gameDoc);

  // Write each player's hand as a subcollection doc
  for (const uid of allPlayerUids) {
    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      cards: hands[uid],
    });
  }

  // Update room status
  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

// Knower setup actions
export async function submitKnowerSetup(
  roomCode: string,
  ringLabels: string[],
  ringAssignments: Record<string, number[]>
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    rings: ringLabels.map((label) => ({ label })),
    ringAssignments,
    status: "in-progress",
  });
}

// Player places a card
export async function playCard(
  roomCode: string,
  cardId: string,
  playedBy: string,
  rings: number[]
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    pendingPlay: { cardId, playedBy, rings },
  });
}

// Knower judges: correct
export async function judgeCorrect(
  roomCode: string,
  game: Game,
  playerUid: string
): Promise<void> {
  const pending = game.pendingPlay!;

  // Move card to playedCards
  await updateDoc(doc(db, "games", roomCode), {
    [`playedCards.${pending.cardId}`]: {
      playedBy: pending.playedBy,
      rings: pending.rings,
    },
    pendingPlay: null,
  });

  // Remove card from player's hand
  const handRef = doc(db, "games", roomCode, "hands", playerUid);
  const handSnap = await import("firebase/firestore").then((m) =>
    m.getDoc(handRef)
  );
  if (handSnap.exists()) {
    const currentCards: string[] = handSnap.data().cards;
    const newCards = currentCards.filter((c) => c !== pending.cardId);
    await setDoc(handRef, { cards: newCards });

    // Check win condition
    if (newCards.length === 0) {
      await updateDoc(doc(db, "games", roomCode), {
        winner: playerUid,
        status: "finished",
      });
    }
  }
}

// Knower judges: incorrect — places card in correct zone
// If the "correct" zone matches the guesser's zone, treat as correct instead
export async function judgeIncorrect(
  roomCode: string,
  game: Game,
  correctRings: number[],
  playerUid: string
): Promise<void> {
  const pending = game.pendingPlay!;

  // If the knower selected the same zone, treat it as correct
  const sameZone =
    JSON.stringify([...pending.rings].sort()) ===
    JSON.stringify([...correctRings].sort());
  if (sameZone) {
    return judgeCorrect(roomCode, game, playerUid);
  }

  const newDeck = [...game.deck];
  const drawnCard = newDeck.shift();

  const nextTurn = (game.currentTurn + 1) % game.turnOrder.length;

  // Move card to playedCards at correct position, advance turn
  await updateDoc(doc(db, "games", roomCode), {
    [`playedCards.${pending.cardId}`]: {
      playedBy: pending.playedBy,
      rings: correctRings,
    },
    pendingPlay: null,
    deck: newDeck,
    currentTurn: nextTurn,
  });

  // Remove played card from hand, add drawn card
  const handRef = doc(db, "games", roomCode, "hands", playerUid);
  const handSnap = await import("firebase/firestore").then((m) =>
    m.getDoc(handRef)
  );
  if (handSnap.exists()) {
    const currentCards: string[] = handSnap.data().cards;
    const newCards = currentCards.filter((c) => c !== pending.cardId);
    if (drawnCard) {
      newCards.push(drawnCard);
    }
    await setDoc(handRef, { cards: newCards });
  }
}

// Remove cards from knower's hand after setup (discard the 2 unused)
export async function discardKnowerCards(
  roomCode: string,
  knowerUid: string,
  keptCardIds: string[]
): Promise<void> {
  const handRef = doc(db, "games", roomCode, "hands", knowerUid);
  const handSnap = await import("firebase/firestore").then((m) =>
    m.getDoc(handRef)
  );
  if (handSnap.exists()) {
    const currentCards: string[] = handSnap.data().cards;
    const discarded = currentCards.filter((c) => !keptCardIds.includes(c));
    // Knower keeps no cards in hand after setup — all used cards go to ringAssignments
    await setDoc(handRef, { cards: [] });
  }
}
