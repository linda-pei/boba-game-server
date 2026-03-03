import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase";
import { NOUN_CARDS, CONTEXT_CLUES, ATTRIBUTE_CLUES, WORD_CLUES, shuffled } from "./deck";
import type { Game, Hand, Room } from "../../types";

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

/** Card count for each player, visible to all. */
export function useAllHandCounts(
  roomCode: string | undefined,
  playerUids: string[]
) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!roomCode || playerUids.length === 0) return;

    const unsubs = playerUids.map((uid) =>
      onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
        if (snapshot.exists()) {
          const cards: string[] = snapshot.data().cards ?? [];
          setCounts((prev) => ({ ...prev, [uid]: cards.length }));
        }
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [roomCode, playerUids.join(",")]);

  return counts;
}

export async function startGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const knowerUid = room.settings.knower!;
  const allPlayerUids = Object.keys(room.players);
  const nonKnowerUids = allPlayerUids.filter((uid) => uid !== knowerUid);
  const numRings = room.settings.numRings;
  const mode = room.settings.mode ?? "competitive";
  const isCoop = mode === "coop";

  const deck = shuffled(NOUN_CARDS);

  // Draw one clue from each category: context (ring 0), attribute (ring 1), word (ring 2)
  const contextClue = shuffled(CONTEXT_CLUES)[0];
  const attributeClue = shuffled(ATTRIBUTE_CLUES)[0];
  const wordClue = shuffled(WORD_CLUES)[0];
  const knowerClues = [contextClue, attributeClue, wordClue];

  // Deal cards: knower gets 10 in co-op, 5 in competitive; non-knowers always get 5
  const hands: Record<string, string[]> = {};
  const knowerHandSize = isCoop ? 10 : 5;
  hands[knowerUid] = deck.splice(0, knowerHandSize);
  for (const uid of nonKnowerUids) {
    hands[uid] = deck.splice(0, 5);
  }

  // In co-op: numSetupCards = numPlayers + 1 (all players including knower)
  // In competitive: numSetupCards = numRings
  const numSetupCards = isCoop ? allPlayerUids.length + 1 : numRings;

  // In co-op, knower is included at the end of turn order
  const turnOrder = isCoop ? [...nonKnowerUids, knowerUid] : nonKnowerUids;

  const gameDoc: Game = {
    gameType: "things-in-rings",
    mode,
    status: "knower-setup",
    knower: knowerUid,
    numRings,
    numSetupCards,
    rings: knowerClues.map((label) => ({ label })),
    ringAssignments: {},
    playedCards: {},
    playOrder: [],
    pendingPlay: null,
    deck,
    turnOrder,
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
    playOrder: Object.keys(ringAssignments),
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

// Helper: find the next turn index, skipping players with empty hands (co-op)
async function getNextTurn(
  roomCode: string,
  game: Game,
  fromTurn: number
): Promise<number> {
  if (game.mode !== "coop") {
    return (fromTurn + 1) % game.turnOrder.length;
  }

  const len = game.turnOrder.length;
  let next = (fromTurn + 1) % len;

  // Walk through turn order, skipping players with empty hands (except knower)
  for (let i = 0; i < len; i++) {
    const uid = game.turnOrder[next];
    if (uid === game.knower) return next; // never skip knower
    const handRef = doc(db, "games", roomCode, "hands", uid);
    const handSnap = await import("firebase/firestore").then((m) =>
      m.getDoc(handRef)
    );
    if (handSnap.exists()) {
      const cards: string[] = handSnap.data().cards;
      if (cards.length > 0) return next;
    }
    next = (next + 1) % len;
  }

  return next;
}

// Helper: check if all non-knower players have empty hands (co-op win)
async function checkCoopWin(
  roomCode: string,
  game: Game
): Promise<boolean> {
  for (const uid of game.turnOrder) {
    if (uid === game.knower) continue;
    const handRef = doc(db, "games", roomCode, "hands", uid);
    const handSnap = await import("firebase/firestore").then((m) =>
      m.getDoc(handRef)
    );
    if (handSnap.exists()) {
      const cards: string[] = handSnap.data().cards;
      if (cards.length > 0) return false;
    }
  }
  return true;
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
    playOrder: [...(game.playOrder || []), pending.cardId],
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

    if (newCards.length === 0) {
      if (game.mode === "coop") {
        const allDone = await checkCoopWin(roomCode, game);
        if (allDone) {
          await updateDoc(doc(db, "games", roomCode), {
            winner: "team",
            status: "finished",
          });
          return;
        }
      } else {
        // Competitive: first to empty wins
        await updateDoc(doc(db, "games", roomCode), {
          winner: playerUid,
          status: "finished",
        });
        return;
      }
    }
  }

  // Correct play: player keeps their turn (both modes).
  // Only advance if their hand is now empty (coop: skip to next; competitive: already handled above as win).
  if (game.mode === "coop") {
    const handRef2 = doc(db, "games", roomCode, "hands", playerUid);
    const handSnap2 = await import("firebase/firestore").then((m) =>
      m.getDoc(handRef2)
    );
    const remaining = handSnap2.exists() ? (handSnap2.data().cards as string[]).length : 0;
    if (remaining === 0) {
      const nextTurn = await getNextTurn(roomCode, game, game.currentTurn);
      await updateDoc(doc(db, "games", roomCode), { currentTurn: nextTurn });
    }
  }
  // Competitive: player already won if hand is empty (returned above), otherwise stay on their turn.
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

  const nextTurn = await getNextTurn(roomCode, game, game.currentTurn);

  // Move card to playedCards at correct position, advance turn
  await updateDoc(doc(db, "games", roomCode), {
    [`playedCards.${pending.cardId}`]: {
      playedBy: pending.playedBy,
      rings: correctRings,
    },
    playOrder: [...(game.playOrder || []), pending.cardId],
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

  // Co-op lose check: if next turn is knower and knower has 0 cards
  if (game.mode === "coop") {
    const nextUid = game.turnOrder[nextTurn];
    if (nextUid === game.knower) {
      const knowerHandRef = doc(db, "games", roomCode, "hands", game.knower);
      const knowerSnap = await import("firebase/firestore").then((m) =>
        m.getDoc(knowerHandRef)
      );
      if (knowerSnap.exists()) {
        const knowerCards: string[] = knowerSnap.data().cards;
        if (knowerCards.length === 0) {
          await updateDoc(doc(db, "games", roomCode), {
            winner: null,
            status: "finished",
          });
        }
      }
    }
  }
}

// Co-op: knower auto-places a card (no judging)
export async function knowerAutoPlay(
  roomCode: string,
  game: Game,
  cardId: string,
  rings: number[],
  knowerUid: string
): Promise<void> {
  // Place card on the board
  await updateDoc(doc(db, "games", roomCode), {
    [`playedCards.${cardId}`]: {
      playedBy: knowerUid,
      rings,
    },
    playOrder: [...(game.playOrder || []), cardId],
  });

  // Remove card from knower's hand
  const handRef = doc(db, "games", roomCode, "hands", knowerUid);
  const handSnap = await import("firebase/firestore").then((m) =>
    m.getDoc(handRef)
  );
  if (handSnap.exists()) {
    const currentCards: string[] = handSnap.data().cards;
    const newCards = currentCards.filter((c) => c !== cardId);
    await setDoc(handRef, { cards: newCards });

    // Check if all non-knower players are done (win)
    const allDone = await checkCoopWin(roomCode, game);
    if (allDone) {
      await updateDoc(doc(db, "games", roomCode), {
        winner: "team",
        status: "finished",
      });
      return;
    }

    // Advance to next player (skip empty hands)
    const nextTurn = await getNextTurn(roomCode, game, game.currentTurn);
    const nextUid = game.turnOrder[nextTurn];

    // If next turn lands back on knower and knower is now empty → lose
    if (nextUid === knowerUid && newCards.length === 0) {
      await updateDoc(doc(db, "games", roomCode), {
        winner: null,
        status: "finished",
      });
      return;
    }

    await updateDoc(doc(db, "games", roomCode), { currentTurn: nextTurn });
  }
}

// Remove assigned cards from knower's hand after setup
// In competitive: knower's hand is emptied
// In co-op: knower keeps unassigned cards
export async function discardKnowerCards(
  roomCode: string,
  knowerUid: string,
  assignedCardIds: string[],
  keepRemaining: boolean = false
): Promise<void> {
  const handRef = doc(db, "games", roomCode, "hands", knowerUid);
  const handSnap = await import("firebase/firestore").then((m) =>
    m.getDoc(handRef)
  );
  if (handSnap.exists()) {
    const currentCards: string[] = handSnap.data().cards;
    if (keepRemaining) {
      // Co-op: keep cards that weren't assigned
      const remaining = currentCards.filter((c) => !assignedCardIds.includes(c));
      await setDoc(handRef, { cards: remaining });
    } else {
      await setDoc(handRef, { cards: [] });
    }
  }
}
