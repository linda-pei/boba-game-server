import { describe, expect, it } from "vitest";
import type { BBDeclared, BBGame } from "../../../types";
import { canRevealRed, finishTurn, resolveDualCut, soloCutIndices } from "../engine";
import { MISSIONS, getMission } from "../missions";
import { buildMissionWithRules, cutWithRules, deadlyCheck, ruleCanCut, ruleEquipmentFaceDown } from "./index";
import type { DeadlyValueState } from "./deadlyValue";
import type { RedTapeState } from "./redTape";
import type { RussianToolboxState } from "./russianToolbox";
import type { SequenceState } from "./sequence";

const seeded = (seed = 1) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const cuts = (blue: Record<string, number>, yellow = 0) => ({ blue, red: 0, yellow });

describe("sequence (missions 9 & 16)", () => {
  const game = (state: SequenceState, blue: Record<string, number> = {}) =>
    ({ ...buildMissionWithRules(["a", "b"], getMission(9), seeded(1)).game, ruleState: { sequence: state }, cutCounts: cuts(blue) }) as BBGame;

  it("blocks later values until enough of the current one are cut", () => {
    const g = game({ cards: [4, 9, 2], index: 0 });
    expect(ruleCanCut(g, 4)).toBeNull();
    expect(ruleCanCut(g, 9)).toMatch(/cut the 4s first/);
    expect(ruleCanCut(g, 2)).toMatch(/cut the 4s first/);
    expect(ruleCanCut(g, 7)).toBeNull();
    expect(ruleCanCut(g, "yellow")).toBeNull();
  });

  it("advances after `threshold` cuts (2 in mission 9, 4 in mission 16)", () => {
    const built = buildMissionWithRules(["a", "b"], getMission(9), seeded(2));
    const [first] = (built.game.ruleState.sequence as SequenceState).cards;
    let g: BBGame = built.game;
    const wires = Object.entries(built.hands).flatMap(([uid, stands]) => stands.flat().map((wire, index) => ({ uid, wire, index })));
    wires.filter(({ wire }) => wire.color === "blue" && wire.sortKey === first).slice(0, 2).forEach(({ uid, wire, index }) => {
      g = cutWithRules(g, uid, index, wire);
    });
    expect((g.ruleState.sequence as SequenceState).index).toBe(1);

    const built16 = buildMissionWithRules(["a", "b"], getMission(16), seeded(2));
    expect(getMission(16).rules[0].params?.threshold).toBe(4);
    expect((built16.game.ruleState.sequence as SequenceState).cards).toHaveLength(3);
  });
});

describe("deadlyValue (mission 11)", () => {
  it("draws a value, skips the captain's setup token, blocks naming it, and makes it deadly", () => {
    const built = buildMissionWithRules(["cap", "b", "c"], getMission(11), seeded(3));
    const { value } = built.game.ruleState.deadlyValue as DeadlyValueState;
    expect(value).toBeGreaterThanOrEqual(1);
    expect(built.game.setupDone).toEqual(["cap"]);
    expect(ruleCanCut(built.game, value)).toMatch(/detonates/);
    const deadly = deadlyCheck(built.game);
    expect(deadly({ id: "x", color: "blue", sortKey: value })).toBe(true);
    expect(resolveDualCut([{ id: "x", color: "blue", sortKey: value }], value === 12 ? 1 : value + 1, deadly)).toEqual({ result: "explode" });
    expect(canRevealRed([[{ id: "x", color: "blue", sortKey: value, cut: false }]], deadly)).toBe(true);
  });
});

describe("redTape (mission 12)", () => {
  const built = buildMissionWithRules(["a", "b", "c"], getMission(12), seeded(5));
  const state = built.game.ruleState.redTape as RedTapeState;

  it("covers every equipment card with a number card", () => {
    expect(Object.keys(state.covers)).toHaveLength(built.game.equipment.length);
  });

  it("needs both pairs; one pair when the numbers match", () => {
    const game = { ...built.game, ruleState: { redTape: { covers: { 3: 7, 5: 5 } } }, equipment: [{ id: 3, unlocked: false, used: false }, { id: 5, unlocked: false, used: false }] } as BBGame;
    const wire = (value: number) => ({ id: `B${value}`, color: "blue" as const, sortKey: value });
    const stands = { ...game.stands };
    const at = (g: BBGame, value: number) => ({ ...g, cutCounts: { ...g.cutCounts, blue: { ...g.cutCounts.blue, [value]: (g.cutCounts.blue[value] ?? 0) + 1 } } });
    // Own pair of 3s alone isn't enough.
    let g = at(at({ ...game, stands }, 3), 3);
    g = cutWithRules(at(g, 3), "a", 0, wire(3));
    expect(g.equipment.find((c) => c.id === 3)?.unlocked).toBe(false);
    // The covering 7s complete it.
    g = cutWithRules(at(g, 7), "a", 1, wire(7));
    expect(g.equipment.find((c) => c.id === 3)?.unlocked).toBe(true);
    // #5 covered by a 5: one pair of 5s satisfies both.
    g = cutWithRules(at(g, 5), "a", 2, wire(5));
    expect(g.equipment.find((c) => c.id === 5)?.unlocked).toBe(true);
  });
});

describe("russianToolbox (mission 15)", () => {
  it("keeps equipment face down and flips left to right as number cards are finished", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(15), seeded(7));
    const state = built.game.ruleState.russianToolbox as RussianToolboxState;
    expect(state.flipped).toBe(0);
    built.game.equipment.forEach((card) => expect(ruleEquipmentFaceDown(built.game, card.id)).toBe(true));

    let g: BBGame = built.game;
    const current = state.current!;
    const all = Object.entries(built.hands).flatMap(([uid, stands]) => stands.flat().map((wire, index) => ({ uid, wire, index })));
    all.filter(({ wire }) => wire.color === "blue" && wire.sortKey === current).forEach(({ uid, wire, index }) => {
      g = cutWithRules(g, uid, index, wire);
    });
    const after = g.ruleState.russianToolbox as RussianToolboxState;
    expect(after.flipped).toBe(1);
    expect(after.current).not.toBe(current);
    expect(g.equipment[0].unlocked).toBe(true);
    expect(ruleEquipmentFaceDown(g, g.equipment[0].id)).toBe(false);
    expect(ruleEquipmentFaceDown(g, g.equipment[1].id)).toBe(true);
  });
});

describe("rule-aware mission simulation", () => {
  // An all-knowing team that only takes moves the rules allow: Reveal (red/deadly), else a legal
  // Solo Cut, else a correct legal Dual Cut; a player with no legal move passes.
  function play(missionId: number, players: string[], seed: number) {
    const built = buildMissionWithRules(players, getMission(missionId), seeded(seed));
    const hands = built.hands;
    let game: BBGame = { ...built.game, phase: "playing" };
    for (let guard = 0; guard < 600 && game.phase === "playing"; guard += 1) {
      const uid = game.turn;
      const mine = hands[uid];
      const flat = mine.flat();
      const deadly = deadlyCheck(game);
      const cut = (owner: string, index: number) => {
        const wire = hands[owner].flat()[index];
        expect(deadly(wire)).toBe(false);
        wire.cut = true;
        game = cutWithRules(game, owner, index, wire);
      };
      if (canRevealRed(mine, deadly)) {
        flat.forEach((wire, index) => {
          if (!wire.cut) {
            wire.cut = true;
            game = cutWithRules(game, uid, index, wire);
          }
        });
        game = finishTurn(game, uid);
        continue;
      }
      const values = [...new Set(flat.filter((w) => !w.cut && !deadly(w)).map((w): BBDeclared => (w.color === "yellow" ? "yellow" : w.sortKey)))].filter(
        (value) => !ruleCanCut(game, value),
      );
      const solo = values.map((value) => soloCutIndices(mine, value, game.wireTotals, game.cutCounts)).find(Boolean);
      if (solo) {
        solo.forEach((index) => cut(uid, index));
        game = finishTurn(game, uid);
        continue;
      }
      done: for (const value of values) {
        for (const target of players.filter((p) => p !== uid)) {
          const t = hands[target].flat().findIndex((w) => !w.cut && resolveDualCut([w], value, deadly).result === "success");
          if (t === -1) continue;
          cut(target, t);
          cut(uid, flat.findIndex((w) => !w.cut && resolveDualCut([w], value, deadly).result === "success"));
          break done;
        }
      }
      game = finishTurn(game, uid);
    }
    return game;
  }

  it("missions 9+ can be won at every player count without ever cutting a deadly wire", () => {
    for (const mission of MISSIONS.filter((m) => m.rules.length > 0)) {
      for (const players of [["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"], ["a", "b", "c", "d", "e"]]) {
        const game = play(mission.id, players, mission.id * 11 + players.length);
        expect(game.phase, `mission ${mission.id}, ${players.length} players`).toBe("mission-won");
      }
    }
  });
});
