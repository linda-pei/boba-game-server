import { useEffect, useState } from "react";
import { arrayUnion, doc, onSnapshot, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import type { RobotrickCard, RobotrickGame, RobotrickHand, Room } from "../../types";
import {
  DROCO_SEAT,
  PASS_COUNT,
  ROBOTRICK_PLAYERS,
  ROBOTRICK_ROUNDS,
  buildRound,
  ledType,
  legalPlays,
  nextSeat,
  passTarget,
  progressTrick,
  sortCards,
  startNextTrick,
} from "./engine";

export function useRobotrickGame(roomCode: string | undefined) {
  const [game, setGame] = useState<RobotrickGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    return onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      setGame(snapshot.exists() ? (snapshot.data() as RobotrickGame) : null);
      setLoading(false);
    });
  }, [roomCode]);

  return { game, loading: roomCode ? loading : false };
}

export function useRobotrickHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<RobotrickHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;
    return onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
      setHand(snapshot.exists() ? (snapshot.data() as RobotrickHand) : null);
    });
  }, [roomCode, uid]);

  return hand;
}

/** Cards in hand including any passed cards not yet merged in. */
export function effectiveHand(hand: RobotrickHand | null): RobotrickCard[] {
  if (!hand) return [];
  return sortCards([...hand.cards, ...(hand.incoming ?? [])]);
}

function writeRound(
  batch: ReturnType<typeof writeBatch>,
  roomCode: string,
  built: ReturnType<typeof buildRound>,
) {
  batch.set(doc(db, "games", roomCode), built.game);
  Object.entries(built.hands).forEach(([uid, cards]) => {
    const hand: RobotrickHand = { ownerUid: uid, cards, passOut: null, incoming: [] };
    batch.set(doc(db, "games", roomCode, "hands", uid), hand);
  });
}

export async function startRobotrickGame(roomCode: string, room: Room): Promise<void> {
  const playerOrder = Object.entries(room.players)
    .sort(([, first], [, second]) => first.order - second.order)
    .map(([uid]) => uid);
  if (playerOrder.length !== ROBOTRICK_PLAYERS) throw new Error("Robotrick needs exactly 3 players.");

  const built = buildRound({
    playerOrder,
    round: 1,
    options: {
      hangars: room.settings.robotrickMoreHangars === false ? 3 : 4,
      fixedAiCard: room.settings.robotrickFixedAiCard ?? false,
    },
    previousAiCardId: null,
    roundScores: Object.fromEntries(playerOrder.map((uid) => [uid, []])),
  });

  const batch = writeBatch(db);
  writeRound(batch, roomCode, built);
  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

/** Lock in 2 cards to pass left. The last player to lock in starts the round (Droco leads). */
export async function submitRobotrickPass(roomCode: string, uid: string, cardIds: string[]): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);

  await runTransaction(db, async (transaction) => {
    const [gameSnap, handSnap] = await Promise.all([transaction.get(gameRef), transaction.get(handRef)]);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Robotrick game not found.");
    const game = gameSnap.data() as RobotrickGame;
    const hand = handSnap.data() as RobotrickHand;
    if (game.phase !== "passing") throw new Error("Passing is over.");
    if (game.passSubmitted.includes(uid)) throw new Error("You already passed.");
    if (new Set(cardIds).size !== PASS_COUNT) throw new Error(`Choose exactly ${PASS_COUNT} cards.`);
    const passing = hand.cards.filter((card) => cardIds.includes(card.id));
    if (passing.length !== PASS_COUNT) throw new Error("Those cards aren't in your hand.");

    const target = passTarget(game.playerOrder, uid);
    transaction.update(handRef, {
      cards: hand.cards.filter((card) => !cardIds.includes(card.id)),
      passOut: passing,
    });
    // Blind append: the recipient's hand is private, so we can't read it — only add to `incoming`.
    transaction.update(doc(db, "games", roomCode, "hands", target), { incoming: arrayUnion(...passing) });

    const passSubmitted = [...game.passSubmitted, uid];
    if (passSubmitted.length < game.playerOrder.length) {
      transaction.update(gameRef, { passSubmitted, lastAction: "A player locked in their pass." });
      return;
    }
    const started = progressTrick({ ...game, passSubmitted, phase: "playing", lastAction: "Passes swapped. Droco leads." });
    transaction.set(gameRef, started);
  });
}

export async function playRobotrickCard(roomCode: string, uid: string, cardId: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);

  await runTransaction(db, async (transaction) => {
    const [gameSnap, handSnap] = await Promise.all([transaction.get(gameRef), transaction.get(handRef)]);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Robotrick game not found.");
    const game = gameSnap.data() as RobotrickGame;
    const hand = handSnap.data() as RobotrickHand;
    if (game.phase !== "playing") throw new Error("It's not time to play a card.");
    if (game.turn !== uid) throw new Error("It's not your turn.");

    const cards = effectiveHand(hand);
    const card = cards.find((item) => item.id === cardId);
    if (!card) throw new Error("That card isn't in your hand.");
    if (!legalPlays(cards, ledType(game.currentTrick)).some((item) => item.id === cardId)) {
      throw new Error("You must follow the led type.");
    }

    transaction.update(handRef, { cards: cards.filter((item) => item.id !== cardId), incoming: [] });
    const next = progressTrick({
      ...game,
      currentTrick: [...game.currentTrick, { seat: uid, card }],
      turn: nextSeat(game.seatOrder, uid),
      handCounts: { ...game.handCounts, [uid]: cards.length - 1 },
    });
    transaction.set(gameRef, {
      ...next,
      lastAction: next.phase === "trick-result"
        ? next.lastTrick?.winner === DROCO_SEAT ? "Droco took the trick." : "Trick won!"
        : game.lastAction,
    });
  });
}

/** Move past the trick-result screen. `trickNumber` makes repeat clicks from several clients a no-op. */
export async function advanceRobotrickTrick(roomCode: string, trickNumber: number): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists()) throw new Error("Robotrick game not found.");
    const game = snapshot.data() as RobotrickGame;
    if (game.phase !== "trick-result" || game.trickNumber !== trickNumber) return;
    const next = startNextTrick(game);
    transaction.set(gameRef, {
      ...next,
      lastAction: next.phase === "round-end" ? `Round ${game.round} complete.` : game.lastAction,
    });
  });
}

/** Host: deal the next round, or finish after round 3. */
export async function continueRobotrick(roomCode: string, uid: string, hostUid: string): Promise<void> {
  if (uid !== hostUid) throw new Error("Only the host can continue.");
  const gameRef = doc(db, "games", roomCode);

  const snapshot = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(gameRef);
    if (!snap.exists()) throw new Error("Robotrick game not found.");
    const game = snap.data() as RobotrickGame;
    if (game.phase !== "round-end") throw new Error("The round isn't over yet.");
    if (game.round >= ROBOTRICK_ROUNDS) {
      transaction.update(gameRef, { phase: "finished", lastAction: "Game over." });
      return null;
    }
    return game;
  });
  if (!snapshot) return;

  const built = buildRound({
    playerOrder: snapshot.playerOrder,
    round: snapshot.round + 1,
    options: snapshot.options,
    previousAiCardId: snapshot.aiCardId,
    roundScores: snapshot.roundScores,
  });
  const batch = writeBatch(db);
  writeRound(batch, roomCode, built);
  await batch.commit();
}
