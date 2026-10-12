import { describe, expect, it } from "vitest";
import type { BBMission, BBWire } from "../../../types";
import { FALSE_BOTTOM, buildMission, defaultUnlocked, drawExtraEquipment, equipmentPool, refreshEquipment, resolveDualCut } from "../engine";
import { MISSIONS, getMission } from "../missions";
import { activeRules, buildMissionWithRules, cutWithRules, deadlyCheck, describeRules, ruleCanCut, type RuleEnv } from "./index";
import { createNumberDeck, drawNumbers } from "./numberDeck";
import type { MissionRule, RuleRegistry } from "./types";

const seeded = (seed = 1) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const blue = (value: number, copy = 1): BBWire => ({ id: `B${value}-${copy}`, color: "blue", sortKey: value });

// A fake rule exercising every hook, used through a fake mission so real missions stay untouched.
type FakeState = { cuts: number };
const fake: MissionRule<{ banned: number }, FakeState> = {
  id: "fake",
  describe: (params, state) => `No ${params.banned}s (${state.cuts} cuts so far)`,
  setup: (built) => ({ built, state: { cuts: 0 } }),
  canCut: (declared, { params }) => (declared === params.banned ? `Can't cut ${params.banned}s.` : null),
  isDeadly: (wire, { params }) => wire.color === "blue" && wire.sortKey === params.banned + 1,
  afterCut: (_wire, { state }) => ({ state: { cuts: state.cuts + 1 } }),
  isEquipmentUnlocked: (cardId) => (cardId === 3 ? true : undefined),
};
const registry = { fake } as unknown as RuleRegistry;
const fakeMission: BBMission = { ...getMission(4), id: 99, rules: [{ id: "fake", params: { banned: 7 } }] };
const env: RuleEnv = { registry, getMission: (id) => (id === 99 ? fakeMission : getMission(id)) };

describe("rule framework", () => {
  it("every mission's rules are registered", () => {
    MISSIONS.forEach((mission) => expect(() => activeRules(mission)).not.toThrow());
    expect(() => activeRules({ ...fakeMission, rules: [{ id: "nope" }] }, env)).toThrow(/Unknown mission rule/);
  });

  it("missions without rules build exactly as before", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(4), seeded(3));
    expect(built.game.ruleState).toEqual({});
  });

  it("folds setup, canCut, isDeadly, afterCut, unlock and describe", () => {
    const built = buildMissionWithRules(["a", "b", "c"], fakeMission, seeded(3), env);
    let game = { ...built.game, equipment: [{ id: 3, unlocked: false, used: false }, { id: 5, unlocked: false, used: false }] };
    expect(game.ruleState).toEqual({ fake: { cuts: 0 } });

    expect(ruleCanCut(game, 7, env)).toBe("Can't cut 7s.");
    expect(ruleCanCut(game, 6, env)).toBeNull();

    const isDeadly = deadlyCheck(game, env);
    expect(isDeadly(blue(8))).toBe(true);
    expect(isDeadly(blue(9))).toBe(false);
    expect(resolveDualCut([blue(8)], 8, isDeadly)).toEqual({ result: "explode" });

    const target = built.hands.a.flat().findIndex((wire) => wire.color === "blue");
    game = cutWithRules(game, "a", target, built.hands.a.flat()[target], env);
    expect(game.ruleState).toEqual({ fake: { cuts: 1 } });
    expect(game.equipment.find((card) => card.id === 3)?.unlocked).toBe(true);
    expect(game.equipment.find((card) => card.id === 5)?.unlocked).toBe(false);
    expect(describeRules(game, env)).toEqual(["No 7s (1 cuts so far)"]);
  });
});

describe("number deck", () => {
  it("is a shuffled 1–12 that draws from the top", () => {
    const deck = createNumberDeck(seeded(4));
    expect([...deck].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const { drawn, deck: rest } = drawNumbers(deck, 3);
    expect(drawn).toEqual(deck.slice(0, 3));
    expect(rest).toHaveLength(9);
  });
});

describe("False Bottom (#13)", () => {
  const withFalseBottom: BBMission = { ...getMission(4), equipment: { count: "players", falseBottom: true } };

  it("joins the pool only when the mission enables it", () => {
    expect(equipmentPool(getMission(4))).not.toContain(FALSE_BOTTOM);
    expect(equipmentPool(withFalseBottom)).toContain(FALSE_BOTTOM);
  });

  it("stays out when fewer than 2 yellow wires are in play (it could never unlock)", () => {
    expect(equipmentPool(withFalseBottom, 0)).not.toContain(FALSE_BOTTOM);
    expect(equipmentPool(withFalseBottom, 1)).not.toContain(FALSE_BOTTOM);
    expect(equipmentPool(withFalseBottom, 2)).toContain(FALSE_BOTTOM);
    for (let seed = 1; seed < 20; seed += 1) {
      const { game } = buildMission(["a", "b", "c", "d", "e"], getMission(13), seeded(seed));
      expect(game.wireTotals.yellow).toBe(0);
      expect(game.equipment.map((card) => card.id)).not.toContain(FALSE_BOTTOM);
    }
  });

  it("unlocks after 2 yellow cuts", () => {
    const card = { id: FALSE_BOTTOM, unlocked: false, used: false };
    expect(defaultUnlocked(card, { blue: { 13: 2 }, red: 0, yellow: 1 })).toBe(false);
    expect(defaultUnlocked(card, { blue: {}, red: 0, yellow: 2 })).toBe(true);
    expect(refreshEquipment([card], { blue: {}, red: 0, yellow: 2 })[0].unlocked).toBe(true);
  });

  it("draws 2 unused cards, never itself or one already on the board", () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const extra = drawExtraEquipment(withFalseBottom, [1, 2, FALSE_BOTTOM], 2, seeded(seed));
      expect(extra).toHaveLength(2);
      extra.forEach((id) => expect([1, 2, FALSE_BOTTOM]).not.toContain(id));
    }
  });
});
