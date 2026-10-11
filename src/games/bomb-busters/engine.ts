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
export function canDeclare(hand: BBHandWire[][], declared: BBDeclared): boolean {
  return uncutWires(hand).some((wire) => wireMatches(wire, declared));
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

/** Reveal Red: all of your uncut wires are red. */
export function canRevealRed(hand: BBHandWire[][]): boolean {
  const uncut = uncutWires(hand);
  return uncut.length > 0 && uncut.every((wire) => wire.color === "red");
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
export function resolveDualCut(pointed: BBWire[], declared: BBDeclared): DualCutOutcome {
  if (pointed.length === 0) throw new Error("Point at a wire.");
  const matching = pointed.flatMap((wire, index) => (wireMatches(wire, declared) ? [index] : []));
  if (matching.length > 0) return { result: "success", matching };
  const nonRed = pointed.flatMap((wire, index) => (wire.color !== "red" ? [index] : []));
  if (nonRed.length === 0) return { result: "explode" };
  return { result: "wrong", infoCandidates: nonRed };
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

/** One equipment card per player (or none), drawn at random from those the mission allows. */
export function drawEquipment(mission: BBMission, playerCount: number, random: () => number = Math.random): number[] {
  if (mission.equipment.count === 0) return [];
  const allowed = Array.from({ length: 12 }, (_, i) => i + 1).filter((id) => !mission.equipment.exclude?.includes(id));
  return shuffleWith(allowed, random).slice(0, playerCount).sort((a, b) => a - b);
}

/** Equipment unlocks once 2 blue wires of its number have been cut. */
export function refreshEquipment(equipment: BBGame["equipment"], cuts: BBGame["cutCounts"]): BBGame["equipment"] {
  return equipment.map((card) => ({ ...card, unlocked: card.unlocked || (cuts.blue[card.id] ?? 0) >= 2 }));
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

/** Next player clockwise who still has uncut wires (players with empty stands are skipped). */
export function nextTurn(playerOrder: string[], current: string, stands: BBGame["stands"]): string {
  const start = playerOrder.indexOf(current);
  for (let step = 1; step <= playerOrder.length; step += 1) {
    const uid = playerOrder[(start + step) % playerOrder.length];
    if (hasUncutWires(stands[uid] ?? [])) return uid;
  }
  return current;
}

export function isMissionWon(stands: BBGame["stands"]): boolean {
  return Object.values(stands).every((playerStands) => !hasUncutWires(playerStands));
}

/** Captain passes to the left (next in playerOrder) for the next mission or a retry. */
export function nextCaptainOrder(playerOrder: string[]): string[] {
  return [...playerOrder.slice(1), playerOrder[0]];
}

