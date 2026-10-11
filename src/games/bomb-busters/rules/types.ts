import type { BBDeclared, BBGame, BBInfoToken, BBMission, BBWire } from "../../../types";
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
  /** Host, before dealing: reorder players (e.g. a random Captain-card holder goes first). */
  choosePlayerOrder?(playerOrder: string[], ctx: { params: P; random: () => number }): string[];
  /** Host, while building the mission: initial rule state and any setup changes. */
  setup?(built: BuiltMission, ctx: { mission: BBMission; params: P; random: () => number }): { built: BuiltMission; state: S };
  /** Active player, before a Dual Cut / Solo Cut: an error message, or null if allowed. */
  canCut?(declared: BBDeclared, ctx: { game: BBGame; params: P; state: S }): string | null;
  /** Target (or owner): whether cutting this wire explodes, beyond red. */
  isDeadly?(wire: BBWire, ctx: { game: BBGame; params: P; state: S }): boolean;
  /** Any client, after a wire is cut: the rule's next state (and any game changes it owns). */
  afterCut?(wire: BBWire, ctx: { game: BBGame; params: P; state: S }): { game?: BBGame; state: S };
  /** Each player, during setup: how many info tokens they place, and whether they're fake. */
  setupInfoPolicy?(uid: string, ctx: { game: BBGame; params: P; state: S }): SetupInfoPolicy | undefined;
  /** Target, after a failed Dual Cut: "explode" to blow the bomb regardless (e.g. the Rookie). */
  onWrongGuess?(ctx: { game: BBGame; params: P; state: S; by: string; target: string }): "explode" | undefined;
  /** Target, after a failed Dual Cut: the info token to place instead of the true value. */
  wrongGuessToken?(wire: BBWire, declared: BBDeclared, ctx: { game: BBGame; params: P; state: S; target: string }): BBInfoToken | undefined;
  /** Whoever uses equipment: an error if this player may not use this card. */
  canUseEquipment?(uid: string, cardId: number, ctx: { game: BBGame; params: P; state: S }): string | null;
  /** Active player: an error if Reveal Red isn't allowed right now (e.g. mission 13 forces Red Alert). */
  canReveal?(uid: string, ctx: { game: BBGame; params: P; state: S }): string | null;
  /** Whoever finishes setup: runs once as play begins (start a timer, open the turn…). */
  onPlay?(ctx: { game: BBGame; params: P; state: S; now: number }): { game?: BBGame; state: S };
  /** After each action: who acts next. `undefined` keeps the default (next player clockwise); "" opens the turn. */
  nextTurn?(actor: string, ctx: { game: BBGame; params: P; state: S }): { turn: string; state: S } | undefined;
  /** When the turn is open: an error if this player may not claim it, or null. */
  canClaimTurn?(uid: string, ctx: { game: BBGame; params: P; state: S }): string | null;
  /** Any client: a reason the mission is lost right now (e.g. time ran out), or null. */
  checkLoss?(ctx: { game: BBGame; params: P; state: S; now: number }): string | null;
  /** Any client: override whether an equipment card is unlocked (undefined = default). `cuts` is up to date. */
  isEquipmentUnlocked?(cardId: number, ctx: { game: BBGame; params: P; state: S; cuts: BBGame["cutCounts"] }): boolean | undefined;
  /** Rendering: whether an equipment card is still face down (its identity hidden). */
  equipmentFaceDown?(cardId: number, ctx: { game: BBGame; params: P; state: S }): boolean;
}

/** How a player places setup info tokens: how many, whether fake, and (if set) the value they must show. */
export interface SetupInfoPolicy {
  count: number;
  fake: boolean;
  /** A forced value (mission 13's random token); with no matching wire it goes beside the stand. */
  value?: number;
}

export type RuleRegistry = Record<string, MissionRule<RuleParams, unknown>>;
