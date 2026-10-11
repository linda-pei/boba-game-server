import { describe, expect, it } from "vitest";
import type { BBGame, BBHandWire, BBWire } from "../../types";
import {
  areAdjacent,
  matchedValue,
  sameValue,
  swapIntoHand,
  advanceDial,
  applyCutToGame,
  buildMission,
  finishTurn,
  placeInfoToken,
  unwrapPublic,
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

  it("defines missions 1–8 and 13 equipment cards (12 base + False Bottom)", () => {
    expect(MISSIONS.map((m) => m.id).slice(0, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(EQUIPMENT.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
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

describe("public state transitions", () => {
  const base = () => buildMission(["cap", "b", "c"], getMission(4), seeded(11));

  it("builds a mission waiting for setup info tokens from the captain", () => {
    const { game, hands } = base();
    expect(game.phase).toBe("setup-info");
    expect(game.setupDone).toEqual([]);
    expect(game.dial).toEqual({ wrongGuesses: 0, limit: 3 });
    expect(game.equipment).toHaveLength(3);
    expect(unwrapPublic(game.stands).cap).toHaveLength(2);
    expect(Object.values(hands).flat(2)).toHaveLength(53);
  });

  it("cuts a wire in place and counts it", () => {
    const { game, hands } = base();
    const wire = hands.b[0][0];
    const next = applyCutToGame(game, "b", 0, wire);
    expect(unwrapPublic(next.stands).b[0][0]).toEqual({ cut: true, revealed: { color: wire.color, sortKey: wire.sortKey } });
    expect(next.cutCounts).not.toEqual(game.cutCounts);
  });

  it("places info tokens and loses at the dial limit", () => {
    const { game } = base();
    expect(unwrapPublic(placeInfoToken(game, "c", 1, { color: "blue", value: 7 }).stands).c[0][1].info).toEqual({ color: "blue", value: 7 });
    const once = advanceDial(advanceDial(game));
    expect(once.phase).toBe("setup-info");
    const lost = advanceDial(once);
    expect(lost.phase).toBe("mission-lost");
    expect(finishTurn(lost, "cap").phase).toBe("mission-lost");
  });
});

describe("full mission simulation", () => {
  // An all-knowing player: Reveal Red, else Solo Cut, else a correct Dual Cut.
  function play(missionId: number, players: string[], seed: number) {
    const built = buildMission(players, getMission(missionId), seeded(seed));
    const hands = built.hands;
    let game: BBGame = { ...built.game, phase: "playing" };
    for (let guard = 0; guard < 400 && game.phase === "playing"; guard += 1) {
      const uid = game.turn;
      const mine = hands[uid];
      const flat = mine.flat();
      if (canRevealRed(mine)) {
        flat.forEach((wire, index) => {
          if (!wire.cut) {
            wire.cut = true;
            game = applyCutToGame(game, uid, index, wire);
          }
        });
        game = finishTurn(game, uid);
        continue;
      }
      const declarable = [...new Set(flat.filter((w) => !w.cut && w.color !== "red").map((w) => (w.color === "yellow" ? "yellow" : w.sortKey)))];
      const solo = declarable.map((d) => ({ d, idx: soloCutIndices(mine, d, game.wireTotals, game.cutCounts) })).find((x) => x.idx);
      if (solo?.idx) {
        solo.idx.forEach((index) => {
          flat[index].cut = true;
          game = applyCutToGame(game, uid, index, flat[index]);
        });
        game = finishTurn(game, uid);
        continue;
      }
      let done = false;
      for (const declared of declarable) {
        for (const target of players.filter((p) => p !== uid)) {
          const theirs = hands[target].flat();
          const t = theirs.findIndex((w) => !w.cut && resolveDualCut([w], declared).result === "success");
          if (t === -1) continue;
          theirs[t].cut = true;
          game = applyCutToGame(game, target, t, theirs[t]);
          const own = flat.findIndex((w) => !w.cut && resolveDualCut([w], declared).result === "success");
          flat[own].cut = true;
          game = applyCutToGame(game, uid, own, flat[own]);
          done = true;
          break;
        }
        if (done) break;
      }
      expect(done).toBe(true);
      game = finishTurn(game, uid);
    }
    return game;
  }

  it("every mission 1–8 can be won at every player count", () => {
    // Missions 1–8 have no special rules; missions 9+ are simulated with their rules in rules/*.test.ts.
    for (const mission of MISSIONS.filter((m) => m.rules.length === 0)) {
      for (const players of [["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"], ["a", "b", "c", "d", "e"]]) {
        const game = play(mission.id, players, mission.id * 7 + players.length);
        expect(game.phase, `mission ${mission.id}, ${players.length} players`).toBe("mission-won");
        expect(game.validated.length).toBe(mission.blue.to - mission.blue.from + 1);
      }
    }
  });
});

describe("equipment helpers", () => {
  it("X or Y Ray: a wire matching either named value succeeds, and the own cut uses the matched one", () => {
    expect(resolveDualCut([blue(7)], [3, 7])).toEqual({ result: "success", matching: [0] });
    expect(resolveDualCut([yellow(2)], [5, "yellow"])).toEqual({ result: "success", matching: [0] });
    expect(matchedValue(blue(7), [3, 7])).toBe(7);
    expect(canDeclare(hand([blue(3), blue(7)]), [3, 7])).toBe(true);
    expect(canDeclare(hand([blue(3)]), [3, 7])).toBe(false);
  });

  it("Triple/Super Detector: any match succeeds; all-red explodes; otherwise a token on a non-red wire", () => {
    expect(resolveDualCut([blue(1), blue(4), blue(9)], 9)).toEqual({ result: "success", matching: [2] });
    expect(resolveDualCut([red(2), blue(4), red(8)], 6)).toEqual({ result: "wrong", infoCandidates: [1] });
    expect(resolveDualCut([red(2), red(8), red(10)], 6)).toEqual({ result: "explode" });
  });

  it("labels compare blue by number and treat all yellow (or all red) as equal", () => {
    expect(sameValue(blue(4, 1), blue(4, 2))).toBe(true);
    expect(sameValue(blue(4), blue(5))).toBe(false);
    expect(sameValue(yellow(2), yellow(9))).toBe(true);
    expect(sameValue(yellow(2), blue(2))).toBe(false);
    const h = hand([blue(1), blue(2)], [blue(3), blue(4)]);
    expect(areAdjacent(h, 0)).toBe(true);
    expect(areAdjacent(h, 1)).toBe(false); // last wire of stand 1 and first of stand 2
    expect(areAdjacent(h, 3)).toBe(false);
  });

  it("Walkie-Talkies re-sorts the stand and keeps each wire's public slot", () => {
    const h = hand([blue(2), blue(5), blue(9)]);
    h[0][0].cut = true;
    const slots = [[{ cut: true, revealed: { color: "blue" as const, sortKey: 2 } }, { cut: false, info: { color: "blue" as const, value: 5 } }, { cut: false }]];
    const result = swapIntoHand(h, slots, 2, blue(6));
    expect(result.given.sortKey).toBe(9);
    expect(result.hand[0].map((w) => w.sortKey)).toEqual([2, 5, 6]);
    expect(result.slots[0]).toEqual([slots[0][0], slots[0][1], { cut: false }]);
    expect(() => swapIntoHand(h, slots, 0, blue(6))).toThrow();
  });
});
