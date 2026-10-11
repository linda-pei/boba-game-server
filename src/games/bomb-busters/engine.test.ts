import { describe, expect, it } from "vitest";
import type { BBHandWire, BBWire } from "../../types";
import {
  buildWirePool,
  canDeclare,
  canRevealRed,
  createAllWires,
  dealStands,
  dialLimit,
  drawEquipment,
  isDialExploded,
  isMissionWon,
  locateSlot,
  nextCaptainOrder,
  nextTurn,
  recordCut,
  refreshEquipment,
  resolveDualCut,
  soloCutIndices,
  standCounts,
  validatedValues,
} from "./engine";
import { EQUIPMENT } from "./equipment";
import { MISSIONS, getMission } from "./missions";

const blue = (value: number, copy = 1): BBWire => ({ id: `B${value}-${copy}`, color: "blue", sortKey: value });
const red = (value: number): BBWire => ({ id: `R${value}.5`, color: "red", sortKey: value + 0.5 });
const yellow = (value: number): BBWire => ({ id: `Y${value}.1`, color: "yellow", sortKey: value + 0.1 });
const hand = (...stands: BBWire[][]): BBHandWire[][] => stands.map((stand) => stand.map((wire) => ({ ...wire, cut: false })));
const seeded = (seed = 1) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

describe("components and data", () => {
  it("has 70 wires: 48 blue, 11 red, 11 yellow", () => {
    const wires = createAllWires();
    expect(wires).toHaveLength(70);
    expect(wires.filter((w) => w.color === "blue")).toHaveLength(48);
    expect(wires.filter((w) => w.color === "red").map((w) => w.sortKey)).toContain(11.5);
    expect(wires.filter((w) => w.color === "yellow").map((w) => w.sortKey)).toContain(1.1);
  });

  it("defines missions 1–8 and 12 equipment cards", () => {
    expect(MISSIONS.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(EQUIPMENT.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe("mission setup", () => {
  it("mission 1 is 24 blue wires 1–6, nothing else", () => {
    const { pool, markers, totals } = buildWirePool(getMission(1), 4);
    expect(pool).toHaveLength(24);
    expect(new Set(pool.map((w) => w.sortKey))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(markers).toEqual([]);
    expect(totals).toEqual({ blue: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 }, red: 0, yellow: 0 });
  });

  it("limits mission 2's yellow and mission 3's red to their ranges", () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const m2 = buildWirePool(getMission(2), 3, seeded(seed));
      const yellows = m2.pool.filter((w) => w.color === "yellow");
      expect(yellows).toHaveLength(2);
      yellows.forEach((w) => expect(w.sortKey).toBeLessThanOrEqual(7.1));
      const m3 = buildWirePool(getMission(3), 3, seeded(seed));
      const reds = m3.pool.filter((w) => w.color === "red");
      expect(reds).toHaveLength(1);
      expect(reds[0].sortKey).toBeLessThanOrEqual(9.5);
    }
  });

  it("'2 out of 3' shows 3 uncertain markers but puts 2 in play", () => {
    const { pool, markers, totals } = buildWirePool(getMission(5), 4, seeded(3));
    const yellowMarkers = markers.filter((m) => m.color === "yellow");
    expect(yellowMarkers).toHaveLength(3);
    yellowMarkers.forEach((m) => expect(m.uncertain).toBe(true));
    expect(pool.filter((w) => w.color === "yellow")).toHaveLength(2);
    expect(totals.yellow).toBe(2);
    pool.filter((w) => w.color === "yellow").forEach((w) => expect(yellowMarkers.map((m) => m.sortKey)).toContain(w.sortKey));
  });

  it("applies 2-player overrides", () => {
    expect(buildWirePool(getMission(5), 2).totals.red).toBe(2);
    expect(buildWirePool(getMission(5), 3).totals.red).toBe(1);
    const final2 = buildWirePool(getMission(8), 2);
    expect(final2.totals.yellow).toBe(4);
    expect(final2.markers.filter((m) => m.color === "red")).toHaveLength(3);
  });

  it("splits stands per the rulebook", () => {
    expect(standCounts(2)).toEqual([2, 2]);
    expect(standCounts(3)).toEqual([2, 1, 1]);
    expect(standCounts(4)).toEqual([1, 1, 1, 1]);
    expect(standCounts(5)).toEqual([1, 1, 1, 1, 1]);
    expect(() => standCounts(6)).toThrow();
  });

  it("deals every wire, evenly, with each stand sorted", () => {
    const { pool } = buildWirePool(getMission(8), 3, seeded(5));
    const hands = dealStands(pool, ["cap", "b", "c"], seeded(9));
    expect(hands.cap).toHaveLength(2);
    const stands = Object.values(hands).flat();
    expect(stands.flat()).toHaveLength(pool.length);
    const sizes = stands.map((s) => s.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    stands.forEach((stand) => expect(stand.map((w) => w.sortKey)).toEqual([...stand.map((w) => w.sortKey)].sort((a, b) => a - b)));
  });
});

describe("legality", () => {
  it("only lets you name values (or yellow) you hold", () => {
    const h = hand([blue(3), yellow(4), red(7)]);
    expect(canDeclare(h, 3)).toBe(true);
    expect(canDeclare(h, 5)).toBe(false);
    expect(canDeclare(h, "yellow")).toBe(true);
  });

  it("allows a Solo Cut only when you hold every remaining wire of that value", () => {
    const totals = { blue: { 9: 4 }, red: 0, yellow: 2 };
    const none = { blue: {}, red: 0, yellow: 0 };
    expect(soloCutIndices(hand([blue(9, 1), blue(9, 2), blue(9, 3), blue(9, 4)]), 9, totals, none)).toEqual([0, 1, 2, 3]);
    expect(soloCutIndices(hand([blue(9, 1), blue(9, 2)]), 9, totals, none)).toBeNull();
    const twoCut = { blue: { 9: 2 }, red: 0, yellow: 0 };
    // The last two 9s can be split across a player's two stands.
    expect(soloCutIndices(hand([blue(9, 3)], [blue(9, 4)]), 9, totals, twoCut)).toEqual([0, 1]);
    expect(soloCutIndices(hand([yellow(2), yellow(8)]), "yellow", totals, none)).toEqual([0, 1]);
  });

  it("allows Reveal Red only when every uncut wire is red", () => {
    expect(canRevealRed(hand([red(3), red(9)]))).toBe(true);
    expect(canRevealRed(hand([red(3), blue(4)]))).toBe(false);
    expect(canRevealRed([[{ ...blue(4), cut: true }, { ...red(5), cut: false }]])).toBe(true);
  });

  it("maps flat slot indices across two stands", () => {
    const h = hand([blue(1), blue(2)], [blue(3)]);
    expect(locateSlot(h, 0)).toEqual({ stand: 0, position: 0 });
    expect(locateSlot(h, 2)).toEqual({ stand: 1, position: 0 });
  });
});

describe("Dual Cut and the Double Detector", () => {
  it("succeeds on a match, explodes on red, otherwise reveals the real value", () => {
    expect(resolveDualCut([blue(9)], 9)).toEqual({ result: "success", matching: [0] });
    expect(resolveDualCut([yellow(4)], "yellow")).toEqual({ result: "success", matching: [0] });
    expect(resolveDualCut([red(6)], 6)).toEqual({ result: "explode" });
    expect(resolveDualCut([blue(11)], 12)).toEqual({ result: "wrong", infoCandidates: [0] });
  });

  it("Double Detector: either wire may match; if both do, the target chooses", () => {
    expect(resolveDualCut([blue(2), blue(5)], 2)).toEqual({ result: "success", matching: [0] });
    expect(resolveDualCut([blue(2, 1), blue(2, 2)], 2)).toEqual({ result: "success", matching: [0, 1] });
  });

  it("Double Detector: exactly one red doesn't explode; the token goes on the non-red wire", () => {
    expect(resolveDualCut([red(4), blue(6)], 3)).toEqual({ result: "wrong", infoCandidates: [1] });
    expect(resolveDualCut([red(4), red(8)], 3)).toEqual({ result: "explode" });
  });
});

describe("dial, equipment and validation", () => {
  it("explodes on the wrong guess matching the player count, capped at 5", () => {
    expect([2, 3, 4, 5].map(dialLimit)).toEqual([2, 3, 4, 5]);
    expect(isDialExploded({ wrongGuesses: 1, limit: 2 })).toBe(false);
    expect(isDialExploded({ wrongGuesses: 2, limit: 2 })).toBe(true);
  });

  it("draws one card per player, respecting exclusions and missions without equipment", () => {
    expect(drawEquipment(getMission(1), 4)).toEqual([]);
    for (let seed = 1; seed < 30; seed += 1) {
      const cards = drawEquipment(getMission(3), 5, seeded(seed));
      expect(cards).toHaveLength(5);
      expect(cards).not.toContain(2);
      expect(cards).not.toContain(12);
    }
  });

  it("unlocks equipment after 2 wires of its number are cut, and validates full sets", () => {
    let cuts = { blue: {}, red: 0, yellow: 0 } as { blue: Record<string, number>; red: number; yellow: number };
    cuts = recordCut(recordCut(cuts, "blue", 9), "blue", 9);
    const equipment = refreshEquipment([{ id: 9, unlocked: false, used: false }, { id: 3, unlocked: false, used: false }], cuts);
    expect(equipment.map((c) => c.unlocked)).toEqual([true, false]);
    cuts = recordCut(recordCut(cuts, "blue", 9), "blue", 9);
    expect(validatedValues({ blue: { 9: 4, 3: 4 }, red: 0, yellow: 0 }, cuts)).toEqual([9]);
    expect(recordCut(cuts, "red", 4.5).red).toBe(1);
  });
});

describe("turns and mission end", () => {
  const stands = {
    a: [[{ cut: true }]],
    b: [[{ cut: false }]],
    c: [[{ cut: true }, { cut: false }]],
  };

  it("skips players with empty stands", () => {
    expect(nextTurn(["a", "b", "c"], "b", stands)).toBe("c");
    expect(nextTurn(["a", "b", "c"], "c", stands)).toBe("b");
  });

  it("is won when every stand is empty, and passes the captain left", () => {
    expect(isMissionWon(stands)).toBe(false);
    expect(isMissionWon({ a: [[{ cut: true }]], b: [[{ cut: true }]] })).toBe(true);
    expect(nextCaptainOrder(["a", "b", "c"])).toEqual(["b", "c", "a"]);
  });
});
