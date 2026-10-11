import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction, writeBatch, type Transaction } from "firebase/firestore";
import { db } from "../../firebase";
import type { BBDeclared, BBDetector, BBGame, BBHand, BBHandWire, Room } from "../../types";
import {
  addLog,
  canDeclare,
  canRevealRed,
  describeDeclared,
  describeWire,
  finishTurn,
  advanceDial,
  infoTokenFor,
  loseMission,
  matchedValue,
  FALSE_BOTTOM,
  drawExtraEquipment,
  refreshEquipment,
  nextCaptainOrder,
  areAdjacent,
  sameValue,
  swapIntoHand,
  wrapPublic,
  placeInfoToken,
  resolveDualCut,
  soloCutIndices,
  unwrapHand,
  unwrapPublic,
  wrapHand,
  type BuiltMission,
} from "./engine";
import { getMission } from "./missions";
import {
  buildMissionWithRules,
  cutWithRules,
  deadlyCheck,
  equipmentUnlockCheck,
  ruleCanCut,
  ruleCanUseEquipment,
  setupInfoPolicy,
  wrongGuessExplodes,
  wrongGuessToken,
} from "./rules";

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

function writeMission(batch: ReturnType<typeof writeBatch>, roomCode: string, built: BuiltMission) {
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

  const built = buildMissionWithRules(playerOrder, getMission(missionId));
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

/**
 * Setup: every player, at the same time, points info tokens at their wires — normally one, on a blue
 * wire, showing its value. A rule may change that (e.g. Red Herring places 2 fake tokens, choosing a
 * value that must not match the wire, never on red). `fakeValue` is the chosen value for fake tokens.
 */
export async function placeSetupInfo(roomCode: string, uid: string, flatIndex: number | null, fakeValue?: BBDeclared): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "setup-info") throw new Error("Setup is over.");
    const done = game.setupDone ?? [];
    if (done.includes(uid)) throw new Error("You've already placed your info tokens.");
    const policy = setupInfoPolicy(game, uid);
    const wires = hand.flat();

    let next = game;
    if (flatIndex === null) {
      // Only allowed when you have no blue wires at all (real tokens).
      if (policy.fake || wires.some((wire) => wire.color === "blue")) throw new Error("Choose one of your wires.");
      next = addLog(next, `${mention(uid)} has no blue wires to mark.`);
    } else {
      const wire = wires[flatIndex];
      const slot = unwrapPublic(game.stands)[uid].flat()[flatIndex];
      if (!wire) throw new Error("Choose one of your wires.");
      if (slot?.info) throw new Error("That wire already has an info token.");
      if (policy.fake) {
        if (wire.color === "red") throw new Error("Fake info tokens can't go in front of a red wire.");
        if (fakeValue === undefined) throw new Error("Choose the value to show.");
        const matches = fakeValue === "yellow" ? wire.color === "yellow" : wire.color === "blue" && wire.sortKey === fakeValue;
        if (matches) throw new Error("A fake info token must not match its wire.");
        const token = fakeValue === "yellow" ? { color: "yellow" as const } : { color: "blue" as const, value: fakeValue };
        next = addLog(placeInfoToken(next, uid, flatIndex, token), `${mention(uid)} placed an info token.`);
      } else {
        if (wire.color !== "blue") throw new Error("Setup info tokens go on a blue wire.");
        next = addLog(placeInfoToken(next, uid, flatIndex, infoTokenFor(wire)), `${mention(uid)} marked a ${wire.sortKey}.`);
      }
    }

    const placed = { ...(game.setupPlaced ?? {}), [uid]: ((game.setupPlaced ?? {})[uid] ?? 0) + 1 };
    const finished = flatIndex === null || placed[uid] >= policy.count;
    const setupDone = finished ? [...done, uid] : done;
    const allDone = setupDone.length >= game.playerOrder.length;
    transaction.set(gameRef, { ...next, setupPlaced: placed, setupDone, phase: allDone ? "playing" : "setup-info", turn: game.captain });
  });
}

const DETECTOR_SLOTS: Record<Exclude<BBDetector, "super">, number> = { none: 1, double: 2, triple: 3 };
const DETECTOR_EQUIPMENT: Partial<Record<BBDetector, number>> = { triple: 3, super: 5 };
const X_OR_Y_RAY = 10;

function spendEquipment(game: BBGame, id: number, uid: string): BBGame {
  const objection = ruleCanUseEquipment(game, uid, id);
  if (objection) throw new Error(objection);
  const card = game.equipment.find((item) => item.id === id);
  if (!card) throw new Error("That equipment isn't on the board this mission.");
  if (!card.unlocked) throw new Error("That equipment isn't unlocked yet.");
  if (card.used) throw new Error("That equipment has already been used.");
  return { ...game, equipment: game.equipment.map((item) => (item.id === id ? { ...item, used: true } : item)) };
}

/**
 * Dual Cut, step 1: the active player points at a teammate's wire(s) and names a value.
 * Detectors point at more wires (Double: 2, Triple: 3, Super: the whole stand — `slots` is ignored);
 * the X or Y Ray names a second value.
 */
export async function declareDualCut(
  roomCode: string,
  uid: string,
  target: string,
  slots: number[],
  declared: BBDeclared,
  detector: BBDetector = "none",
  alsoDeclared?: BBDeclared,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction || game.pendingSwap) throw new Error("It's not your turn.");
    if (target === uid || !game.playerOrder.includes(target)) throw new Error("Point at a teammate's wire.");
    const values = alsoDeclared === undefined ? [declared] : [declared, alsoDeclared];
    if (alsoDeclared !== undefined && alsoDeclared === declared) throw new Error("Name two different values.");
    if (!canDeclare(hand, values)) throw new Error("You can only name values you hold.");
    for (const value of values) {
      const objection = ruleCanCut(game, value);
      if (objection) throw new Error(objection);
    }
    if ((detector === "triple" || detector === "super") && values.includes("yellow")) {
      throw new Error("The Triple and Super Detectors can't name yellow.");
    }

    const targetSlots = unwrapPublic(game.stands)[target].flat();
    const pointed =
      detector === "super" ? targetSlots.flatMap((slot, index) => (slot.cut ? [] : [index])) : slots;
    if (detector !== "super" && (new Set(pointed).size !== pointed.length || pointed.length !== DETECTOR_SLOTS[detector])) {
      throw new Error(`Point at ${DETECTOR_SLOTS[detector]} wire${DETECTOR_SLOTS[detector] === 1 ? "" : "s"}.`);
    }
    if (pointed.length === 0 || pointed.some((slot) => !targetSlots[slot] || targetSlots[slot].cut)) throw new Error("That wire is already cut.");

    let next = game;
    if (detector === "double") {
      if (game.characters[uid]?.used) throw new Error("Your Double Detector is used up.");
      next = { ...next, characters: { ...next.characters, [uid]: { used: true } } };
    }
    const detectorCard = DETECTOR_EQUIPMENT[detector];
    if (detectorCard) next = spendEquipment(next, detectorCard, uid);
    if (alsoDeclared !== undefined) next = spendEquipment(next, X_OR_Y_RAY, uid);

    const where = detector === "super" ? "stand" : `wire ${pointed.map((slot) => `#${slot + 1}`).join(" / ")}`;
    const what = values.map(describeDeclared).join(" or ");
    const tool = detector === "none" ? "" : ` (${detector[0].toUpperCase()}${detector.slice(1)} Detector)`;
    transaction.set(
      gameRef,
      addLog(
        {
          ...next,
          phase: "resolving",
          pendingAction: {
            kind: "dual-cut",
            by: uid,
            target,
            slots: pointed,
            declared,
            ...(alsoDeclared !== undefined ? { alsoDeclared } : {}),
            detector,
          },
        },
        `${mention(uid)} asks if ${mention(target)}'s ${where} has ${what}${tool}.`,
      ),
    );
  });
}

export type ResolveResult =
  | { status: "done" }
  | { status: "needs-choice"; choose: "cut" | "info" | "own"; options: number[] };

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
    const values = pending.alsoDeclared === undefined ? [pending.declared] : [pending.declared, pending.alsoDeclared];
    const outcome = resolveDualCut(pending.slots.map((slot) => wires[slot]), values, deadlyCheck(game));

    if (outcome.result === "explode") {
      if (game.stabilized) {
        transaction.set(gameRef, addLog(finishTurn(game, pending.by), `🛡️ The Stabilizer held: ${mention(pending.by)} hit a red wire, but the bomb didn't explode.`));
      } else {
        transaction.set(gameRef, addLog(loseMission(game, "A red wire was cut."), `💥 ${mention(pending.by)} cut a red wire.`));
      }
      return { status: "done" };
    }

    if (outcome.result === "success") {
      const options = outcome.matching.map((index) => pending.slots[index]);
      if (options.length > 1 && (choice === undefined || !options.includes(choice))) {
        return { status: "needs-choice", choose: "cut", options };
      }
      const slot = options.length > 1 ? choice! : options[0];
      transaction.update(handRef, { stands: wrapHand(cutInHand(hand, slot)) });
      const next = cutWithRules(game, uid, slot, wires[slot]);
      transaction.set(
        gameRef,
        addLog(
          { ...next, pendingAction: { kind: "own-cut", by: pending.by, declared: matchedValue(wires[slot], values) } },
          `✂️ ${mention(pending.by)} dual cut ${mention(uid)}'s ${describeWire(wires[slot])}.`,
        ),
      );
      return { status: "done" };
    }

    const options = outcome.infoCandidates.map((index) => pending.slots[index]);
    if (options.length > 1 && (choice === undefined || !options.includes(choice))) {
      return { status: "needs-choice", choose: "info", options };
    }
    const slot = options.length > 1 ? choice! : options[0];
    if (wrongGuessExplodes(game, pending.by, uid)) {
      transaction.set(gameRef, addLog(loseMission(game, "The Rookie's cut failed."), `💥 ${mention(pending.by)} missed, and a Rookie's mistake is fatal.`));
      return { status: "done" };
    }
    const token = wrongGuessToken(game, wires[slot], pending.declared, uid, infoTokenFor(wires[slot]));
    const marked = placeInfoToken(game, uid, slot, token);
    const wrong = game.stabilized ? marked : advanceDial(marked);
    const text = game.stabilized
      ? `🛡️ ${mention(pending.by)} missed: ${mention(uid)}'s wire was a ${describeWire(wires[slot])}. The Stabilizer kept the dial still.`
      : wrong.phase === "mission-lost"
        ? `💥 ${mention(pending.by)} missed: ${mention(uid)}'s wire was a ${describeWire(wires[slot])}. The detonator reached the skull.`
        : `❌ ${mention(pending.by)} missed: ${mention(uid)}'s wire was a ${describeWire(wires[slot])}.`;
    transaction.set(gameRef, addLog(finishTurn(wrong, pending.by), text));
    return { status: "done" };
  });
}

/** Dual Cut, step 3 — the active player's client turns up one of their own matching wires. */
/**
 * Dual Cut, step 3 — the active player turns up one of their own matching wires. With several
 * matches the player chooses which (it reveals a position), so `choice` is needed then.
 */
export async function completeOwnCut(roomCode: string, uid: string, choice?: number): Promise<ResolveResult> {
  return runTransaction(db, async (transaction): Promise<ResolveResult> => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    const pending = game.pendingAction;
    if (game.phase !== "resolving" || pending?.kind !== "own-cut" || pending.by !== uid) return { status: "done" };

    const wires = hand.flat();
    const options = wires.flatMap((wire, index) => (!wire.cut && resolveDualCut([wire], pending.declared).result === "success" ? [index] : []));
    if (options.length === 0) throw new Error("No matching wire left to cut.");
    if (options.length > 1 && (choice === undefined || !options.includes(choice))) {
      return { status: "needs-choice", choose: "own", options };
    }
    const slot = options.length > 1 ? choice! : options[0];
    transaction.update(handRef, { stands: wrapHand(cutInHand(hand, slot)) });
    transaction.set(gameRef, finishTurn(cutWithRules(game, uid, slot, wires[slot]), uid));
    return { status: "done" };
  });
}

export async function soloCut(roomCode: string, uid: string, declared: BBDeclared): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction) throw new Error("It's not your turn.");
    const objection = ruleCanCut(game, declared);
    if (objection) throw new Error(objection);
    const indices = soloCutIndices(hand, declared, game.wireTotals, game.cutCounts);
    if (!indices) throw new Error("You don't hold every remaining wire of that value.");

    const wires = hand.flat();
    let nextHand = hand;
    let next = game;
    indices.forEach((slot) => {
      nextHand = cutInHand(nextHand, slot);
      next = cutWithRules(next, uid, slot, wires[slot]);
    });
    transaction.update(handRef, { stands: wrapHand(nextHand) });
    transaction.set(gameRef, addLog(finishTurn(next, uid), `✂️ ${mention(uid)} solo-cut ${indices.length} × ${describeDeclared(declared)}.`));
  });
}

export async function revealRedWires(roomCode: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (game.phase !== "playing" || game.turn !== uid || game.pendingAction) throw new Error("It's not your turn.");
    if (!canRevealRed(hand, deadlyCheck(game))) throw new Error("You can only reveal when all your remaining wires are red.");

    const wires = hand.flat();
    let nextHand = hand;
    let next = game;
    wires.forEach((wire, slot) => {
      if (wire.cut) return;
      nextHand = cutInHand(nextHand, slot);
      next = cutWithRules(next, uid, slot, wire);
    });
    transaction.update(handRef, { stands: wrapHand(nextHand) });
    transaction.set(gameRef, addLog(finishTurn(next, uid), `🟥 ${mention(uid)} revealed their red wires.`));
  });
}

/** Host: after a win or loss, the captain passes left and the next mission (or a retry) is dealt. */
export async function startNextMission(roomCode: string, uid: string, hostUid: string, game: BBGame, missionId: number): Promise<void> {
  if (uid !== hostUid) throw new Error("Only the host can start the next mission.");
  if (game.phase !== "mission-won" && game.phase !== "mission-lost") throw new Error("The mission isn't over yet.");
  const built = buildMissionWithRules(nextCaptainOrder(game.playerOrder), getMission(missionId));
  const batch = writeBatch(db);
  writeMission(batch, roomCode, built);
  await batch.commit();
}

// ---- Equipment ----

function assertActive(game: BBGame) {
  if (game.phase !== "playing" || game.pendingAction || game.pendingSwap) throw new Error("Wait until the current action finishes.");
}

async function updateGame(roomCode: string, change: (game: BBGame) => BBGame): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const gameRef = doc(db, "games", roomCode);
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists()) throw new Error("Bomb Busters game not found.");
    transaction.set(gameRef, change(snapshot.data() as BBGame));
  });
}

/** #6 Rewinder: move the detonator dial back 1 space. Any time. */
export async function rewindDial(roomCode: string, uid: string): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    const next = spendEquipment(game, 6, uid);
    return addLog({ ...next, dial: { ...next.dial, wrongGuesses: Math.max(0, next.dial.wrongGuesses - 1) } }, `⏪ ${mention(uid)} used the Rewinder.`);
  });
}

/** #7 Emergency Batteries: make 1 or 2 used Double Detectors usable again. Any time. */
export async function rechargeDetectors(roomCode: string, uid: string, players: string[]): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    if (players.length < 1 || players.length > 2) throw new Error("Choose 1 or 2 players.");
    if (players.some((player) => !game.characters[player]?.used)) throw new Error("Only used Double Detectors can be recharged.");
    const next = spendEquipment(game, 7, uid);
    const characters = { ...next.characters };
    players.forEach((player) => {
      characters[player] = { used: false };
    });
    return addLog({ ...next, characters }, `🔋 ${mention(uid)} recharged ${players.map(mention).join(" and ")}'s Double Detector.`);
  });
}

/** #9 Stabilizer: at the start of your turn, before your Dual Cut. */
export async function activateStabilizer(roomCode: string, uid: string): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    if (game.turn !== uid) throw new Error("Use the Stabilizer at the start of your own turn.");
    return addLog({ ...spendEquipment(game, 9, uid), stabilized: true }, `🛡️ ${mention(uid)} switched on the Stabilizer.`);
  });
}

/** #11 Coffee Mug: skip your turn and choose who goes next. Your turn only. */
export async function passTurnWithCoffee(roomCode: string, uid: string, nextPlayer: string): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    if (game.turn !== uid) throw new Error("Use the Coffee Mug on your own turn.");
    if (!game.playerOrder.includes(nextPlayer)) throw new Error("Choose a player.");
    if (!unwrapPublic(game.stands)[nextPlayer].flat().some((slot) => !slot.cut)) throw new Error("That player has no wires left.");
    return addLog({ ...spendEquipment(game, 11, uid), turn: nextPlayer, stabilized: false }, `☕ ${mention(uid)} passed the turn to ${mention(nextPlayer)}.`);
  });
}

/** #4 Post-it: put an info token on one of your own blue wires. Any time. */
export async function placePostIt(roomCode: string, uid: string, slot: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    assertActive(game);
    const wire = hand.flat()[slot];
    if (!wire || wire.cut || wire.color !== "blue") throw new Error("The Post-it goes on one of your uncut blue wires.");
    const next = placeInfoToken(spendEquipment(game, 4, uid), uid, slot, infoTokenFor(wire));
    transaction.set(gameRef, addLog(next, `📝 ${mention(uid)} marked their wire #${slot + 1} as a ${wire.sortKey}.`));
  });
}

/** #1 Label ≠ / #12 Label =: mark two of your adjacent wires as different / the same. Any time. */
export async function placeLabel(roomCode: string, uid: string, kind: "neq" | "eq", left: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    assertActive(game);
    if (!areAdjacent(hand, left)) throw new Error("Pick two adjacent wires on the same stand.");
    const [a, b] = [hand.flat()[left], hand.flat()[left + 1]];
    if (sameValue(a, b) !== (kind === "eq")) {
      throw new Error(kind === "eq" ? "Those wires don't have the same value." : "Those wires have the same value.");
    }
    const next = spendEquipment(game, kind === "eq" ? 12 : 1, uid);
    transaction.set(
      gameRef,
      addLog({ ...next, labels: [...next.labels, { uid, at: left, kind }] }, `🏷️ ${mention(uid)} labeled wires #${left + 1} and #${left + 2} ${kind === "eq" ? "=" : "≠"}.`),
    );
  });
}

/** #8 General Radar: name a value; every player's client answers from its own stand. Any time. */
export async function runGeneralRadar(roomCode: string, uid: string, value: number): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    if (!Number.isInteger(value) || value < 1 || value > 12) throw new Error("Choose a number from 1 to 12.");
    const answers = Object.fromEntries(game.playerOrder.map((player) => [player, null]));
    return addLog({ ...spendEquipment(game, 8, uid), radar: { by: uid, value, answers } }, `📡 ${mention(uid)} ran the General Radar for ${value}.`);
  });
}

/** Each player's client answers the radar for itself. */
export async function answerRadar(roomCode: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    if (!game.radar || game.radar.answers[uid] !== null) return;
    const has = hand.flat().some((wire) => !wire.cut && wire.color === "blue" && wire.sortKey === game.radar!.value);
    transaction.set(gameRef, { ...game, radar: { ...game.radar, answers: { ...game.radar.answers, [uid]: has } } });
  });
}

/**
 * #2 Walkie-Talkies, step 1: hand one of your uncut wires to a teammate. Their client then asks them
 * to hand one back (step 2), and your client swaps the returned wire in (step 3). Any time.
 */
export async function startWalkieTalkies(roomCode: string, uid: string, to: string, fromSlot: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
    assertActive(game);
    if (to === uid || !game.playerOrder.includes(to)) throw new Error("Choose a teammate.");
    const wire = hand.flat()[fromSlot];
    if (!wire || wire.cut) throw new Error("Pick one of your uncut wires.");
    const next = spendEquipment(game, 2, uid);
    const given = { id: wire.id, color: wire.color, sortKey: wire.sortKey };
    transaction.update(doc(db, "games", roomCode, "hands", to), { incoming: [given] });
    transaction.set(
      gameRef,
      addLog({ ...next, pendingSwap: { by: uid, to, fromSlot, stage: "await-target" } }, `📻 ${mention(uid)} hands ${mention(to)} their wire #${fromSlot + 1} (Walkie-Talkies).`),
    );
  });
}

/** Swap the incoming wire into your stand in place of `giveSlot`, keeping public slots in step. */
async function swapOwnWire(transaction: Transaction, roomCode: string, uid: string, giveSlot: number) {
  const { gameRef, handRef, game, hand } = await readGameAndHand(transaction, roomCode, uid);
  const handSnap = await transaction.get(handRef);
  const incoming = ((handSnap.data() as BBHand).incoming ?? [])[0];
  if (!incoming) throw new Error("No wire has arrived yet.");
  const publicStands = unwrapPublic(game.stands);
  const swapped = swapIntoHand(hand, publicStands[uid], giveSlot, incoming);
  transaction.update(handRef, { stands: wrapHand(swapped.hand), incoming: [] });
  const stands = wrapPublic({ ...publicStands, [uid]: swapped.slots });
  // Positions on this stand shifted, so drop this player's labels.
  return { gameRef, game: { ...game, stands, labels: game.labels.filter((label) => label.uid !== uid) }, given: swapped.given };
}

/** Walkie-Talkies, step 2 (the teammate's client): hand a wire back. */
export async function returnWalkieTalkies(roomCode: string, uid: string, giveSlot: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { gameRef, game, given } = await swapOwnWire(transaction, roomCode, uid, giveSlot);
    const swap = game.pendingSwap;
    if (!swap || swap.to !== uid || swap.stage !== "await-target") throw new Error("There's no swap waiting for you.");
    transaction.update(doc(db, "games", roomCode, "hands", swap.by), {
      incoming: [{ id: given.id, color: given.color, sortKey: given.sortKey }],
    });
    transaction.set(gameRef, addLog({ ...game, pendingSwap: { ...swap, stage: "await-return" } }, `📻 ${mention(uid)} hands back their wire #${giveSlot + 1}.`));
  });
}

/** Walkie-Talkies, step 3 (the initiator's client): take the returned wire. */
export async function finishWalkieTalkies(roomCode: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(doc(db, "games", roomCode));
    const swap = (snapshot.data() as BBGame | undefined)?.pendingSwap;
    if (!swap || swap.by !== uid || swap.stage !== "await-return") return;
    const { gameRef, game } = await swapOwnWire(transaction, roomCode, uid, swap.fromSlot);
    transaction.set(gameRef, { ...game, pendingSwap: null });
  });
}

/** #13 False Bottom: draw 2 more equipment cards from the unused pool onto the board. Any time. */
export async function openFalseBottom(roomCode: string, uid: string): Promise<void> {
  await updateGame(roomCode, (game) => {
    assertActive(game);
    const next = spendEquipment(game, FALSE_BOTTOM, uid);
    const extra = drawExtraEquipment(getMission(game.missionId), next.equipment.map((card) => card.id), 2);
    const equipment = refreshEquipment([...next.equipment, ...extra.map((id) => ({ id, unlocked: false, used: false }))], next.cutCounts, equipmentUnlockCheck(next));
    return addLog({ ...next, equipment }, `🧰 ${mention(uid)} opened the False Bottom: ${extra.length ? extra.map((id) => `#${id}`).join(" and ") : "nothing left"} added.`);
  });
}
