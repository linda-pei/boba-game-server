import type { BBDeclared, BBGame, BBMission, BBWire } from "../../../types";
import { applyCutToGame, buildMission, isRed, refreshEquipment, type BuiltMission, type DeadlyCheck, type UnlockCheck } from "../engine";
import { getMission } from "../missions";
import { deadlyValue } from "./deadlyValue";
import { redTape } from "./redTape";
import { russianToolbox } from "./russianToolbox";
import { sequence } from "./sequence";
import type { MissionRule, RuleParams, RuleRegistry } from "./types";

/** Every registered rule module. Each mission lists the ones it uses (see missions.ts). */
export const RULES: RuleRegistry = {
  sequence,
  deadlyValue,
  redTape,
  russianToolbox,
} as unknown as RuleRegistry;

/** Where rules and missions come from; tests pass fakes, the app uses the defaults. */
export interface RuleEnv {
  registry: RuleRegistry;
  getMission: (id: number) => BBMission;
}
export const DEFAULT_RULE_ENV: RuleEnv = { registry: RULES, getMission };

interface ActiveRule {
  rule: MissionRule<RuleParams, unknown>;
  params: RuleParams;
}

/** The rule modules a mission uses, with their params. Unknown ids are an error (caught by tests). */
export function activeRules(mission: BBMission, env: RuleEnv = DEFAULT_RULE_ENV): ActiveRule[] {
  return mission.rules.map((ref) => {
    const rule = env.registry[ref.id];
    if (!rule) throw new Error(`Unknown mission rule "${ref.id}" (mission ${mission.id}).`);
    return { rule, params: ref.params ?? {} };
  });
}

const rulesOf = (game: BBGame, env: RuleEnv) => activeRules(env.getMission(game.missionId), env);
const stateOf = (game: BBGame, id: string) => game.ruleState?.[id];

/** Build a mission and let its rules adjust the setup and create their state. */
export function buildMissionWithRules(
  playerOrder: string[],
  mission: BBMission,
  random: () => number = Math.random,
  env: RuleEnv = DEFAULT_RULE_ENV,
): BuiltMission {
  let built = buildMission(playerOrder, mission, random);
  for (const { rule, params } of activeRules(mission, env)) {
    if (!rule.setup) continue;
    const result = rule.setup(built, { mission, params, random });
    built = { ...result.built, game: { ...result.built.game, ruleState: { ...result.built.game.ruleState, [rule.id]: result.state } } };
  }
  return built;
}

/** The first rule objection to cutting this value, or null if every rule allows it. */
export function ruleCanCut(game: BBGame, declared: BBDeclared, env: RuleEnv = DEFAULT_RULE_ENV): string | null {
  for (const { rule, params } of rulesOf(game, env)) {
    const error = rule.canCut?.(declared, { game, params, state: stateOf(game, rule.id) });
    if (error) return error;
  }
  return null;
}

/** Red, or anything a rule marks deadly this mission. */
export function deadlyCheck(game: BBGame, env: RuleEnv = DEFAULT_RULE_ENV): DeadlyCheck {
  const rules = rulesOf(game, env);
  return (wire) => isRed(wire) || rules.some(({ rule, params }) => rule.isDeadly?.(wire, { game, params, state: stateOf(game, rule.id) }) ?? false);
}

function unlockCheck(game: BBGame, env: RuleEnv): UnlockCheck | undefined {
  const rules = rulesOf(game, env).filter(({ rule }) => rule.isEquipmentUnlocked);
  if (rules.length === 0) return undefined;
  return (card, cuts) => {
    for (const { rule, params } of rules) {
      const verdict = rule.isEquipmentUnlocked!(card.id, { game, params, state: stateOf(game, rule.id), cuts });
      if (verdict !== undefined) return verdict;
    }
    return undefined;
  };
}

/** Cut a wire (engine) and then let every rule react; the one entry point actions use for cuts. */
export function cutWithRules(game: BBGame, uid: string, flatIndex: number, wire: BBWire, env: RuleEnv = DEFAULT_RULE_ENV): BBGame {
  let next = applyCutToGame(game, uid, flatIndex, wire, unlockCheck(game, env));
  for (const { rule, params } of rulesOf(next, env)) {
    if (!rule.afterCut) continue;
    const result = rule.afterCut(wire, { game: next, params, state: stateOf(next, rule.id) });
    next = { ...(result.game ?? next), ruleState: { ...(result.game ?? next).ruleState, [rule.id]: result.state } };
  }
  // Rules may have changed what unlocks (e.g. mission 15 flipping a card), so refresh with their new state.
  return { ...next, equipment: refreshEquipment(next.equipment, next.cutCounts, unlockCheck(next, env)) };
}

/** Unlock check for equipment changes made outside a cut (e.g. False Bottom adding cards). */
export function equipmentUnlockCheck(game: BBGame, env: RuleEnv = DEFAULT_RULE_ENV): UnlockCheck | undefined {
  return unlockCheck(game, env);
}

/** Whether a rule keeps this equipment card face down (identity hidden). */
export function ruleEquipmentFaceDown(game: BBGame, cardId: number, env: RuleEnv = DEFAULT_RULE_ENV): boolean {
  return rulesOf(game, env).some(({ rule, params }) => rule.equipmentFaceDown?.(cardId, { game, params, state: stateOf(game, rule.id) }) ?? false);
}

/** Summary lines for the mission card. */
export function describeRules(game: BBGame, env: RuleEnv = DEFAULT_RULE_ENV): string[] {
  return rulesOf(game, env).flatMap(({ rule, params }) => (rule.describe ? [rule.describe(params, stateOf(game, rule.id), game)] : []));
}
