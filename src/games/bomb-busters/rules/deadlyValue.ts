import { drawEquipment } from "../engine";
import { createNumberDeck, drawNumbers } from "./numberDeck";
import type { MissionRule } from "./types";

/**
 * Mission 11: one number card is drawn; the four blue wires of that value act like red wires.
 * Cutting one explodes the bomb; they can only be revealed (with Reveal) when they're all you have
 * left. The captain places no setup info token, and no equipment card of that value is dealt (it
 * could never unlock).
 */
export interface DeadlyValueState {
  value: number;
}

export const deadlyValue: MissionRule<Record<string, never>, DeadlyValueState> = {
  id: "deadlyValue",
  describe: (_params, state) => `Blue ${state.value}s act like red wires: never cut them. Reveal them when they're all you have left.`,
  setup: (built, { mission, random }) => {
    const { game } = built;
    const value = drawNumbers(createNumberDeck(random), 1).drawn[0];
    const totals = { ...game.wireTotals, blue: { ...game.wireTotals.blue, [value]: 0 } };
    const equipment = drawEquipment(mission, game.playerOrder.length, random, totals).map((id) => ({ id, unlocked: false, used: false }));
    return { built: { ...built, game: { ...game, equipment, setupDone: [...game.setupDone, game.captain] } }, state: { value } };
  },
  canCut: (declared, { state }) => (declared === state.value ? `Cutting a ${state.value} detonates the bomb.` : null),
  isDeadly: (wire, { state }) => wire.color === "blue" && wire.sortKey === state.value,
};
