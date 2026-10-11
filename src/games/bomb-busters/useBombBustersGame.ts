import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction, writeBatch, type Transaction } from "firebase/firestore";
import { db } from "../../firebase";
import type { BBDeclared, BBGame, BBHand, BBHandWire, Room } from "../../types";
import {
  addLog,
  applyCutToGame,
  buildMission,
  canDeclare,
  canRevealRed,
  describeDeclared,
  describeWire,
  finishTurn,
  advanceDial,
  infoTokenFor,
  loseMission,
  nextCaptainOrder,
  placeInfoToken,
  resolveDualCut,
  soloCutIndices,
  unwrapHand,
  unwrapPublic,
  wrapHand,
} from "./engine";
import { getMission } from "./missions";

/** Log entries store `@uid@` mentions; the UI swaps in player names. */
export const mention = (uid: string) => `@${uid}@`;

export function useBombBustersGame(roomCode: string | undefined) {
  const [game, setGame] = useState<BBGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    return onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      setGame(snapshot.exists() ? (snapshot.data() as BBGame) : null);
      setLoading(false);
    });
  }, [roomCode]);

  return { game, loading: roomCode ? loading : false };
}

export function useBombBustersHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<BBHandWire[][] | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;
    return onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
      setHand(snapshot.exists() ? unwrapHand((snapshot.data() as BBHand).stands) : null);
    });
  }, [roomCode, uid]);

  return hand;
}

function writeMission(batch: ReturnType<typeof writeBatch>, roomCode: string, built: ReturnType<typeof buildMission>) {
  batch.set(doc(db, "games", roomCode), built.game);
  Object.entries(built.hands).forEach(([uid, stands]) => {
    const hand: BBHand = { ownerUid: uid, stands: wrapHand(stands) };
    batch.set(doc(db, "games", roomCode, "hands", uid), hand);
  });
}

export async function startBombBustersGame(roomCode: string, room: Room, missionId = 1): Promise<void> {
  const joined = Object.entries(room.players)
    .sort(([, first], [, second]) => first.order - second.order)
    .map(([uid]) => uid);
  // The first captain is random; seats stay in join order (clockwise).
  const captainIndex = Math.floor(Math.random() * joined.length);
  const playerOrder = [...joined.slice(captainIndex), ...joined.slice(0, captainIndex)];

  const built = buildMission(playerOrder, getMission(missionId));
  const batch = writeBatch(db);
  writeMission(batch, roomCode, built);
  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

async function readGameAndHand(transaction: Transaction, roomCode: string, uid: string) {
  const gameRef = doc(db, "games", roomCode);
  const handRef = doc(db, "games", roomCode, "hands", uid);
  const [gameSnap, handSnap] = await Promise.all([transaction.get(gameRef), transaction.get(handRef)]);
  if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Bomb Busters game not found.");
  return {
    gameRef,
    handRef,
    game: gameSnap.data() as BBGame,
    hand: unwrapHand((handSnap.data() as BBHand).stands),
  };
}

function cutInHand(hand: BBHandWire[][], flatIndex: number): BBHandWire[][] {
  let index = 0;
  return hand.map((stand) =>
    stand.map((wire) => {
      const isTarget = index === flatIndex;
      index += 1;
      return isTarget ? { ...wire, cut: true } : wire;
    }),
  );
}

/** Setup: each player, in order from the captain, points an info token at one of their blue wires. */
export async function placeSetupInfo(roomCode: string, uid: string, flatIndex: number | null): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "setup-info" || game.setupTurn !== uid) throw new Error("It's not your turn to place an info token.");
    const wires = hand.flat();

    let next = game;
    if (flatIndex === null) {
      // Only allowed when you have no blue wires at all.
      if (wires.some((wire) => wire.color === "blue")) throw new Error("Choose one of your blue wires.");
      next = addLog(next, `${mention(uid)} has no blue wires to mark.`);
    } else {
      const wire = wires[flatIndex];
      if (!wire || wire.color !== "blue") throw new Error("Setup info tokens go on a blue wire.");
      next = addLog(placeInfoToken(next, uid, flatIndex, infoTokenFor(wire)), `${mention(uid)} marked a ${wire.sortKey}.`);
    }

    const nextIndex = game.playerOrder.indexOf(uid) + 1;
    const done = nextIndex >= game.playerOrder.length;
    transaction.set(gameRef, {
      ...next,
      phase: done ? "playing" : "setup-info",
      setupTurn: done ? null : game.playerOrder[nextIndex],
      turn: game.captain,
    });
  });
}

/** Dual Cut, step 1: the active player points at a teammate's wire(s) and names a value. */
export async function declareDualCut(
  roomCode: string,
  uid: string,
  target: string,
  slots: number[],
  declared: BBDeclared,
  detector: "none" | "double" = "none",
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction) throw new Error("It's not your turn.");
    if (target === uid || !game.playerOrder.includes(target)) throw new Error("Point at a teammate's wire.");
    if (!canDeclare(hand, declared)) throw new Error("You can only name a value you hold.");
    if (new Set(slots).size !== slots.length || slots.length !== (detector === "double" ? 2 : 1)) {
      throw new Error(detector === "double" ? "The Double Detector points at 2 wires." : "Point at one wire.");
    }
    if (detector === "double" && game.characters[uid]?.used) throw new Error("Your Double Detector is used up.");
    const targetSlots = unwrapPublic(game.stands)[target].flat();
    if (slots.some((slot) => !targetSlots[slot] || targetSlots[slot].cut)) throw new Error("That wire is already cut.");

    const where = slots.map((slot) => `#${slot + 1}`).join(" or ");
    transaction.set(
      gameRef,
      addLog(
        {
          ...game,
          phase: "resolving",
          pendingAction: { kind: "dual-cut", by: uid, target, slots, declared, detector },
          characters: detector === "double" ? { ...game.characters, [uid]: { used: true } } : game.characters,
        },
        `${mention(uid)} asks if ${mention(target)}'s wire ${where} is ${describeDeclared(declared)}${detector === "double" ? " (Double Detector)" : ""}.`,
      ),
    );
  });
}

export type ResolveResult =
  | { status: "done" }
  | { status: "needs-choice"; choose: "cut" | "info"; options: number[] };

/**
 * Dual Cut, step 2 — runs on the target's client, which is the only one that can read their stand.
 * `choice` is a flat slot index, needed only when the rules let the target pick (two matches, or
 * where to put the info token after a failed Double Detector).
 */
export async function resolveDualCutAsTarget(roomCode: string, uid: string, choice?: number): Promise<ResolveResult> {
  return runTransaction(db, async (transaction): Promise<ResolveResult> => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    const pending = game.pendingAction;
    if (game.phase !== "resolving" || pending?.kind !== "dual-cut" || pending.target !== uid) return { status: "done" };

    const wires = hand.flat();
    const outcome = resolveDualCut(pending.slots.map((slot) => wires[slot]), pending.declared);

    if (outcome.result === "explode") {
      transaction.set(gameRef, addLog(loseMission(game, "A red wire was cut."), `💥 ${mention(pending.by)} cut a red wire.`));
      return { status: "done" };
    }

    if (outcome.result === "success") {
      const options = outcome.matching.map((index) => pending.slots[index]);
      if (options.length > 1 && (choice === undefined || !options.includes(choice))) {
        return { status: "needs-choice", choose: "cut", options };
      }
      const slot = options.length > 1 ? choice! : options[0];
      transaction.update(handRef, { stands: wrapHand(cutInHand(hand, slot)) });
      const next = applyCutToGame(game, uid, slot, wires[slot]);
      transaction.set(
        gameRef,
        addLog(
          { ...next, pendingAction: { kind: "own-cut", by: pending.by, declared: pending.declared } },
          `✂️ Correct! ${mention(uid)}'s wire #${slot + 1} is ${describeDeclared(pending.declared)}.`,
        ),
      );
      return { status: "done" };
    }

    const options = outcome.infoCandidates.map((index) => pending.slots[index]);
    if (options.length > 1 && (choice === undefined || !options.includes(choice))) {
      return { status: "needs-choice", choose: "info", options };
    }
    const slot = options.length > 1 ? choice! : options[0];
    const wrong = advanceDial(placeInfoToken(game, uid, slot, infoTokenFor(wires[slot])));
    const text =
      wrong.phase === "mission-lost"
        ? `💥 Wrong — ${mention(uid)}'s wire #${slot + 1} is ${describeWire(wires[slot])}. The detonator reached the skull.`
        : `❌ Wrong — ${mention(uid)}'s wire #${slot + 1} is ${describeWire(wires[slot])}.`;
    transaction.set(gameRef, addLog(finishTurn(wrong, pending.by), text));
    return { status: "done" };
  });
}

/** Dual Cut, step 3 — the active player's client turns up one of their own matching wires. */
export async function completeOwnCut(roomCode: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    const pending = game.pendingAction;
    if (game.phase !== "resolving" || pending?.kind !== "own-cut" || pending.by !== uid) return;

    const wires = hand.flat();
    const slot = wires.findIndex((wire) => !wire.cut && resolveDualCut([wire], pending.declared).result === "success");
    if (slot === -1) throw new Error("No matching wire left to cut.");
    transaction.update(handRef, { stands: wrapHand(cutInHand(hand, slot)) });
    transaction.set(gameRef, finishTurn(applyCutToGame(game, uid, slot, wires[slot]), uid));
  });
}

export async function soloCut(roomCode: string, uid: string, declared: BBDeclared): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction) throw new Error("It's not your turn.");
    const indices = soloCutIndices(hand, declared, game.wireTotals, game.cutCounts);
    if (!indices) throw new Error("You don't hold every remaining wire of that value.");

    const wires = hand.flat();
    let nextHand = hand;
    let next = game;
    indices.forEach((slot) => {
      nextHand = cutInHand(nextHand, slot);
      next = applyCutToGame(next, uid, slot, wires[slot]);
    });
    transaction.update(handRef, { stands: wrapHand(nextHand) });
    transaction.set(gameRef, addLog(finishTurn(next, uid), `✂️ ${mention(uid)} solo-cut ${indices.length} × ${describeDeclared(declared)}.`));
  });
}

export async function revealRedWires(roomCode: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction) throw new Error("It's not your turn.");
    if (!canRevealRed(hand)) throw new Error("You can only reveal when all your remaining wires are red.");

    const wires = hand.flat();
    let nextHand = hand;
    let next = game;
    wires.forEach((wire, slot) => {
      if (wire.cut) return;
      nextHand = cutInHand(nextHand, slot);
      next = applyCutToGame(next, uid, slot, wire);
    });
    transaction.update(handRef, { stands: wrapHand(nextHand) });
    transaction.set(gameRef, addLog(finishTurn(next, uid), `🟥 ${mention(uid)} revealed their red wires.`));
  });
}

/** Host: after a win or loss, the captain passes left and the next mission (or a retry) is dealt. */
export async function startNextMission(roomCode: string, uid: string, hostUid: string, game: BBGame, missionId: number): Promise<void> {
  if (uid !== hostUid) throw new Error("Only the host can start the next mission.");
  if (game.phase !== "mission-won" && game.phase !== "mission-lost") throw new Error("The mission isn't over yet.");
  const built = buildMission(nextCaptainOrder(game.playerOrder), getMission(missionId));
  const batch = writeBatch(db);
  writeMission(batch, roomCode, built);
  await batch.commit();
}
