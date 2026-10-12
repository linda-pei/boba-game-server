import type {
  BBColor,
  BBDeclared,
  BBGame,
  BBHandWire,
  BBInfoToken,
  BBMarker,
  BBMission,
  BBPublicSlot,
  BBWire,
  BBWireDraw,
} from "../../types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;

// ---- Wires ----

/** All 70 tiles: 4 × blue 1–12, red 1.5–11.5, yellow 1.1–11.1. */
export function createAllWires(): BBWire[] {
  const wires: BBWire[] = [];
  for (let value = 1; value <= 12; value += 1) {
    for (let copy = 1; copy <= 4; copy += 1) wires.push({ id: `B${value}-${copy}`, color: "blue", sortKey: value });
  }
  for (let value = 1; value <= 11; value += 1) {
    wires.push({ id: `R${value}.5`, color: "red", sortKey: value + 0.5 });
    wires.push({ id: `Y${value}.1`, color: "yellow", sortKey: value + 0.1 });
  }
  return wires;
}

export function wireMatches(wire: BBWire, declared: BBDeclared): boolean {
  return declared === "yellow" ? wire.color === "yellow" : wire.color === "blue" && wire.sortKey === declared;
}

export function describeDeclared(declared: BBDeclared): string {
  return declared === "yellow" ? "yellow" : String(declared);
}

export function describeWire(wire: Pick<BBWire, "color" | "sortKey">): string {
  return wire.color === "blue" ? String(wire.sortKey) : wire.color;
}

// ---- Mission setup ----

export function drawFor(mission: BBMission, playerCount: number, color: "red" | "yellow"): BBWireDraw {
  return (playerCount === 2 ? mission.twoPlayer?.[color] : undefined) ?? mission[color];
}

export interface WirePool {
  pool: BBWire[];
  markers: BBMarker[];
  totals: BBGame["wireTotals"];
}

/**
 * The mission's wires: its blue range (4 of each) plus red/yellow drawn at random.
 * For "N out of M", M candidates become uncertain markers and N of them go into play unseen.
 */
export function buildWirePool(mission: BBMission, playerCount: number, random: () => number = Math.random): WirePool {
  const all = createAllWires();
  const blue = all.filter((wire) => wire.color === "blue" && wire.sortKey >= mission.blue.from && wire.sortKey <= mission.blue.to);
  const markers: BBMarker[] = [];
  const extra: BBWire[] = [];
  const counts = { red: 0, yellow: 0 };

  (["red", "yellow"] as const).forEach((color) => {
    const draw = drawFor(mission, playerCount, color);
    if (draw.count === 0) return;
    const candidates = all.filter(
      (wire) => wire.color === color && wire.sortKey >= (draw.from ?? 0) && wire.sortKey <= (draw.to ?? 99),
    );
    const revealed = shuffleWith(candidates, random).slice(0, draw.outOf ?? draw.count);
    const inPlay = shuffleWith(revealed, random).slice(0, draw.count);
    revealed.forEach((wire) => markers.push({ color, sortKey: wire.sortKey, uncertain: draw.outOf !== undefined }));
    extra.push(...inPlay);
    counts[color] = inPlay.length;
  });

  const blueTotals: Record<string, number> = {};
  blue.forEach((wire) => {
    blueTotals[wire.sortKey] = (blueTotals[wire.sortKey] ?? 0) + 1;
  });
  return {
    pool: [...blue, ...extra],
    markers: markers.sort((a, b) => a.sortKey - b.sortKey),
    totals: { blue: blueTotals, red: counts.red, yellow: counts.yellow },
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Stands per player, captain first: 2 players → 2 each; 3 → captain 2; 4–5 → 1 each. */
export function standCounts(playerCount: number): number[] {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) throw new Error("Bomb Busters needs 2–5 players.");
  return Array.from({ length: playerCount }, (_, index) => (playerCount === 2 || (playerCount === 3 && index === 0) ? 2 : 1));
}

export function sortStand<T extends BBWire>(wires: T[]): T[] {
  return [...wires].sort((a, b) => a.sortKey - b.sortKey);
}

/** Deal all wires as evenly as possible across every stand (captain's stands first), then sort each stand. */
export function dealStands(pool: BBWire[], playerOrder: string[], random: () => number = Math.random): Record<string, BBHandWire[][]> {
  const counts = standCounts(playerOrder.length);
  const stands: { uid: string; wires: BBHandWire[] }[] = playerOrder.flatMap((uid, index) =>
    Array.from({ length: counts[index] }, () => ({ uid, wires: [] as BBHandWire[] })),
  );
  shuffleWith(pool, random).forEach((wire, index) => {
    stands[index % stands.length].wires.push({ ...wire, cut: false });
  });
  const hands: Record<string, BBHandWire[][]> = Object.fromEntries(playerOrder.map((uid) => [uid, []]));
  stands.forEach((stand) => hands[stand.uid].push(sortStand(stand.wires)));
  return hands;
}

export function publicStandsFor(hand: BBHandWire[][]): BBPublicSlot[][] {
  return hand.map((stand) => stand.map(() => ({ cut: false })));
}

// ---- Slots (flat index across a player's stands) ----

export function flatWires<T>(stands: T[][]): T[] {
  return stands.flat();
}

export function locateSlot(stands: unknown[][], flatIndex: number): { stand: number; position: number } {
  let remaining = flatIndex;
  for (let stand = 0; stand < stands.length; stand += 1) {
    if (remaining < stands[stand].length) return { stand, position: remaining };
    remaining -= stands[stand].length;
  }
  throw new Error("No such wire.");
}

export function uncutWires(hand: BBHandWire[][]): BBHandWire[] {
  return flatWires(hand).filter((wire) => !wire.cut);
}

// ---- Legality ----

/** You may only name a value (or yellow) you hold yourself. Red can never be named. */
export function canDeclare(hand: BBHandWire[][], declared: BBDeclared | BBDeclared[]): boolean {
  const values = Array.isArray(declared) ? declared : [declared];
  return values.every((value) => uncutWires(hand).some((wire) => wireMatches(wire, value)));
}

function remainingOf(declared: BBDeclared, totals: BBGame["wireTotals"], cuts: BBGame["cutCounts"]): number {
  return declared === "yellow"
    ? totals.yellow - cuts.yellow
    : (totals.blue[declared] ?? 0) - (cuts.blue[declared] ?? 0);
}

/**
 * Solo Cut: every remaining wire of that value is in your hand.
 * Blue is cut in pairs (all 4, or the last 2); yellow cuts all remaining yellow wires.
 * Returns the flat indices to cut, or null if a Solo Cut isn't allowed.
 */
export function soloCutIndices(
  hand: BBHandWire[][],
  declared: BBDeclared,
  totals: BBGame["wireTotals"],
  cuts: BBGame["cutCounts"],
): number[] | null {
  const indices = flatWires(hand).flatMap((wire, index) => (!wire.cut && wireMatches(wire, declared) ? [index] : []));
  const remaining = remainingOf(declared, totals, cuts);
  if (remaining === 0 || indices.length !== remaining) return null;
  if (declared !== "yellow" && remaining !== 2 && remaining !== 4) return null;
  return indices;
}

/** Which wires explode when cut. Red by default; mission rules can add more (e.g. mission 11). */
export type DeadlyCheck = (wire: BBWire) => boolean;
export const isRed: DeadlyCheck = (wire) => wire.color === "red";

/** Reveal Red: all of your uncut wires are red (or otherwise deadly this mission). */
export function canRevealRed(hand: BBHandWire[][], isDeadly: DeadlyCheck = isRed): boolean {
  const uncut = uncutWires(hand);
  return uncut.length > 0 && uncut.every(isDeadly);
}

// ---- Dual Cut resolution ----

export type DualCutOutcome =
  | { result: "success"; matching: number[] }
  | { result: "explode" }
  | { result: "wrong"; infoCandidates: number[] };

/**
 * Resolve a Dual Cut against the wires pointed at (1 normally, 2 with the Double Detector).
 * Any match succeeds (the target picks if several match). With no match, the bomb explodes
 * only if every wire pointed at is red; otherwise the target puts an info token on a non-red one.
 */
export function resolveDualCut(
  pointed: BBWire[],
  declared: BBDeclared | BBDeclared[],
  isDeadly: DeadlyCheck = isRed,
): DualCutOutcome {
  if (pointed.length === 0) throw new Error("Point at a wire.");
  const values = Array.isArray(declared) ? declared : [declared];
  const matching = pointed.flatMap((wire, index) => (values.some((value) => wireMatches(wire, value)) ? [index] : []));
  // Successfully cutting a deadly wire (e.g. mission 11's value) still explodes.
  if (matching.length > 0 && matching.some((index) => isDeadly(pointed[index]))) return { result: "explode" };
  if (matching.length > 0) return { result: "success", matching };
  const nonRed = pointed.flatMap((wire, index) => (!isDeadly(wire) ? [index] : []));
  if (nonRed.length === 0) return { result: "explode" };
  return { result: "wrong", infoCandidates: nonRed };
}

/** Which of the named values a wire matches (for the active player's own cut after an X or Y Ray). */
export function matchedValue(wire: BBWire, declared: BBDeclared[]): BBDeclared {
  const value = declared.find((item) => wireMatches(wire, item));
  if (value === undefined) throw new Error("That wire doesn't match.");
  return value;
}

/** Equality used by the ≠ and = labels: blue by number; all yellow equal; all red equal. */
export function sameValue(a: BBWire, b: BBWire): boolean {
  if (a.color !== b.color) return false;
  return a.color === "blue" ? a.sortKey === b.sortKey : true;
}

/** Two flat slots are adjacent when they sit next to each other on the same stand. */
export function areAdjacent(stands: unknown[][], left: number): boolean {
  const a = locateSlot(stands, left);
  try {
    const b = locateSlot(stands, left + 1);
    return a.stand === b.stand;
  } catch {
    return false;
  }
}

/**
 * After a Walkie-Talkies swap, re-sort a stand and carry each wire's public slot (cut state, info
 * token) to its new position. The incoming wire starts uncut with no token.
 */
export function swapIntoHand(
  hand: BBHandWire[][],
  slots: BBPublicSlot[][],
  giveSlot: number,
  incoming: BBWire,
): { hand: BBHandWire[][]; slots: BBPublicSlot[][]; given: BBHandWire } {
  const { stand } = locateSlot(hand, giveSlot);
  const flat = hand.flat();
  const given = flat[giveSlot];
  if (!given || given.cut) throw new Error("Pick one of your uncut wires.");
  const slotById = new Map(hand.flat().map((wire, index) => [wire.id, slots.flat()[index]]));
  const nextHand = hand.map((wires, index) => {
    if (index !== stand) return wires;
    return sortStand([...wires.filter((wire) => wire.id !== given.id), { ...incoming, cut: false }]);
  });
  const nextSlots = nextHand.map((wires) =>
    wires.map((wire) => (wire.id === incoming.id ? { cut: false } : slotById.get(wire.id) ?? { cut: wire.cut })),
  );
  return { hand: nextHand, slots: nextSlots, given };
}

export function infoTokenFor(wire: BBWire): BBInfoToken {
  return wire.color === "yellow" ? { color: "yellow" } : { color: "blue", value: wire.sortKey };
}

// ---- Dial, equipment, validation ----

/** The bomb explodes on the wrong guess that matches the player count (capped at 5). */
export function dialLimit(playerCount: number): number {
  return Math.min(playerCount, 5);
}

export function isDialExploded(dial: BBGame["dial"]): boolean {
  return dial.wrongGuesses >= dial.limit;
}

/** Equipment #13: False Bottom (yellow), in the pool from mission 9. */
export const FALSE_BOTTOM = 13;

/**
 * Every equipment id the mission allows: 1–12, plus False Bottom when enabled, minus exclusions.
 * False Bottom unlocks at 2 yellow cuts, so it stays out when fewer than 2 yellow wires are in play.
 */
export function equipmentPool(mission: BBMission, yellowWires = Infinity): number[] {
  const falseBottom = mission.equipment.falseBottom && yellowWires >= 2;
  const ids = Array.from({ length: falseBottom ? 13 : 12 }, (_, i) => i + 1);
  return ids.filter((id) => !mission.equipment.exclude?.includes(id));
}

/** One equipment card per player (or none), drawn at random from those the mission allows. */
export function drawEquipment(mission: BBMission, playerCount: number, random: () => number = Math.random, yellowWires = Infinity): number[] {
  if (mission.equipment.count === 0) return [];
  return shuffleWith(equipmentPool(mission, yellowWires), random).slice(0, playerCount).sort((a, b) => a - b);
}

/** Draw `count` more equipment cards from the pool, skipping any already on the board (False Bottom). */
export function drawExtraEquipment(
  mission: BBMission,
  onBoard: number[],
  count: number,
  random: () => number = Math.random,
): number[] {
  const unused = equipmentPool(mission).filter((id) => id !== FALSE_BOTTOM && !onBoard.includes(id));
  return shuffleWith(unused, random).slice(0, count);
}

/** A rule may override when a card unlocks; `undefined` falls back to the default. */
export type UnlockCheck = (card: BBGame["equipment"][number], cuts: BBGame["cutCounts"]) => boolean | undefined;

/** Default unlock: 2 blue wires of the card's number cut (False Bottom: 2 yellow wires). */
export function defaultUnlocked(card: BBGame["equipment"][number], cuts: BBGame["cutCounts"]): boolean {
  return card.id === FALSE_BOTTOM ? cuts.yellow >= 2 : (cuts.blue[card.id] ?? 0) >= 2;
}

export function refreshEquipment(equipment: BBGame["equipment"], cuts: BBGame["cutCounts"], isUnlocked?: UnlockCheck): BBGame["equipment"] {
  return equipment.map((card) => ({
    ...card,
    unlocked: card.unlocked || (isUnlocked?.(card, cuts) ?? defaultUnlocked(card, cuts)),
  }));
}

export function recordCut(cuts: BBGame["cutCounts"], color: BBColor, sortKey: number): BBGame["cutCounts"] {
  if (color === "blue") return { ...cuts, blue: { ...cuts.blue, [sortKey]: (cuts.blue[sortKey] ?? 0) + 1 } };
  return { ...cuts, [color]: cuts[color] + 1 };
}

/** Blue values whose every wire in play has been cut (validation tokens). */
export function validatedValues(totals: BBGame["wireTotals"], cuts: BBGame["cutCounts"]): number[] {
  return Object.entries(totals.blue)
    .filter(([value, total]) => total > 0 && (cuts.blue[value] ?? 0) >= total)
    .map(([value]) => Number(value))
    .sort((a, b) => a - b);
}

// ---- Turns and the end of a mission ----

export function hasUncutWires(stands: BBPublicSlot[][]): boolean {
  return flatWires(stands).some((slot) => !slot.cut);
}

/** Public stands per player as plain nested arrays (the engine's shape; Firestore wraps each stand). */
export type PublicStands = Record<string, BBPublicSlot[][]>;

export const unwrapPublic = (stands: BBGame["stands"]): PublicStands =>
  Object.fromEntries(Object.entries(stands).map(([uid, list]) => [uid, list.map((stand) => stand.slots)]));
export const wrapPublic = (stands: PublicStands): BBGame["stands"] =>
  Object.fromEntries(Object.entries(stands).map(([uid, list]) => [uid, list.map((slots) => ({ slots }))]));
export const unwrapHand = (stands: { wires: BBHandWire[] }[]): BBHandWire[][] => stands.map((stand) => stand.wires);
export const wrapHand = (stands: BBHandWire[][]): { wires: BBHandWire[] }[] => stands.map((wires) => ({ wires }));

/** Next player clockwise who still has uncut wires (players with empty stands are skipped). */
export function nextTurn(playerOrder: string[], current: string, stands: PublicStands): string {
  const start = playerOrder.indexOf(current);
  for (let step = 1; step <= playerOrder.length; step += 1) {
    const uid = playerOrder[(start + step) % playerOrder.length];
    if (hasUncutWires(stands[uid] ?? [])) return uid;
  }
  return current;
}

export function isMissionWon(stands: PublicStands): boolean {
  return Object.values(stands).every((playerStands) => !hasUncutWires(playerStands));
}

/** Captain passes to the left (next in playerOrder) for the next mission or a retry. */
export function nextCaptainOrder(playerOrder: string[]): string[] {
  return [...playerOrder.slice(1), playerOrder[0]];
}


// ---- Applying outcomes to the public game state ----

function updateSlot(game: BBGame, uid: string, flatIndex: number, update: (slot: BBPublicSlot) => BBPublicSlot): BBGame {
  const stands = unwrapPublic(game.stands);
  const { stand, position } = locateSlot(stands[uid], flatIndex);
  stands[uid] = stands[uid].map((slots, standIndex) =>
    standIndex === stand ? slots.map((slot, index) => (index === position ? update(slot) : slot)) : slots,
  );
  return { ...game, stands: wrapPublic(stands) };
}

/** Turn a wire face up in place, count it, and refresh validation and equipment. */
export function applyCutToGame(game: BBGame, uid: string, flatIndex: number, wire: BBWire, isUnlocked?: UnlockCheck): BBGame {
  const next = updateSlot(game, uid, flatIndex, (slot) => ({
    cut: true,
    revealed: { color: wire.color, sortKey: wire.sortKey },
    ...(slot.info ? { info: slot.info } : {}),
  }));
  const cutCounts = recordCut(next.cutCounts, wire.color, wire.sortKey);
  return {
    ...next,
    cutCounts,
    validated: validatedValues(next.wireTotals, cutCounts),
    equipment: refreshEquipment(next.equipment, cutCounts, isUnlocked),
  };
}

export function placeInfoToken(game: BBGame, uid: string, flatIndex: number, token: BBInfoToken): BBGame {
  return updateSlot(game, uid, flatIndex, (slot) => ({ ...slot, info: token }));
}

export function addLog(game: BBGame, text: string, at: number = Date.now()): BBGame {
  return { ...game, log: [...game.log, { at, text }].slice(-40) };
}

export function loseMission(game: BBGame, reason: string): BBGame {
  return { ...game, phase: "mission-lost", pendingAction: null, result: { outcome: "lost", reason } };
}

/** A wrong (non-red) guess: the dial advances, and the bomb explodes at the limit. */
export function advanceDial(game: BBGame): BBGame {
  const dial = { ...game.dial, wrongGuesses: game.dial.wrongGuesses + 1 };
  const next = { ...game, dial };
  return isDialExploded(dial) ? loseMission(next, "The detonator dial reached the skull.") : next;
}

/** After an action resolves: win if every stand is empty, otherwise pass the turn on. */
export function finishTurn(game: BBGame, actor: string): BBGame {
  if (game.phase === "mission-lost") return game;
  const stands = unwrapPublic(game.stands);
  if (isMissionWon(stands)) {
    return { ...game, phase: "mission-won", pendingAction: null, stabilized: false, result: { outcome: "won", reason: "Every wire is cut." } };
  }
  return { ...game, phase: "playing", pendingAction: null, stabilized: false, turn: nextTurn(game.playerOrder, actor, stands) };
}

// ---- Building a mission ----

export interface BuiltMission {
  game: BBGame;
  hands: Record<string, BBHandWire[][]>;
}

/** Fresh mission state. `playerOrder` starts with the captain and runs clockwise. */
export function buildMission(playerOrder: string[], mission: BBMission, random: () => number = Math.random): BuiltMission {
  const { pool, markers, totals } = buildWirePool(mission, playerOrder.length, random);
  const hands = dealStands(pool, playerOrder, random);
  const captain = playerOrder[0];
  const game: BBGame = {
    gameType: "bomb-busters",
    missionId: mission.id,
    phase: "setup-info",
    playerOrder,
    captain,
    stands: wrapPublic(Object.fromEntries(playerOrder.map((uid) => [uid, publicStandsFor(hands[uid])]))),
    turn: captain,
    setupDone: [],
    dial: { wrongGuesses: 0, limit: dialLimit(playerOrder.length) },
    markers,
    wireTotals: totals,
    cutCounts: { blue: {}, red: 0, yellow: 0 },
    validated: [],
    equipment: drawEquipment(mission, playerOrder.length, random, totals.yellow).map((id) => ({ id, unlocked: false, used: false })),
    characters: Object.fromEntries(playerOrder.map((uid) => [uid, { used: false }])),
    pendingAction: null,
    labels: [],
    radar: null,
    stabilized: false,
    pendingSwap: null,
    ruleState: {},
    log: [],
    result: null,
  };
  return { game, hands };
}
