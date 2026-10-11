import type { BBDeclared, BBGame, BBMission, BBWire } from "../../../types";
import type { BuiltMission } from "../engine";

export type RuleParams = Record<string, number | string | boolean>;

/**
 * A mission special rule. Every hook is optional; the engine/actions call them at fixed points
 * (see Missions-9-19.md → Hooks) and never check mission ids. `S` is the rule's own state, stored
 * at `game.ruleState[id]` and touched by no other rule.
 *
 * Hooks that need a player's private stand run on that player's client (noted per hook).
 */
export interface MissionRule<P extends RuleParams = RuleParams, S = unknown> {
  id: string;
  /** One-line summary shown on the mission card. */
  describe?(params: P, state: S, game: BBGame): string;
  /** Host, while building the mission: initial rule state and any setup changes. */
  setup?(built: BuiltMission, ctx: { mission: BBMission; params: P; random: () => number }): { built: BuiltMission; state: S };
  /** Active player, before a Dual Cut / Solo Cut: an error message, or null if allowed. */
  canCut?(declared: BBDeclared, ctx: { game: BBGame; params: P; state: S }): string | null;
  /** Target (or owner): whether cutting this wire explodes, beyond red. */
  isDeadly?(wire: BBWire, ctx: { game: BBGame; params: P; state: S }): boolean;
  /** Any client, after a wire is cut: the rule's next state (and any game changes it owns). */
  afterCut?(wire: BBWire, ctx: { game: BBGame; params: P; state: S }): { game?: BBGame; state: S };
  /** Any client: override whether an equipment card is unlocked (undefined = default rule). */
  isEquipmentUnlocked?(cardId: number, ctx: { game: BBGame; params: P; state: S }): boolean | undefined;
}

export type RuleRegistry = Record<string, MissionRule<RuleParams, unknown>>;
