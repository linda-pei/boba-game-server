import { createNumberDeck } from "./numberDeck";
import type { MissionRule } from "./types";

/**
 * Mission 12: each equipment card in play is covered by a number card. A card unlocks only when
 * both its own pair and its number card's pair are cut (one pair if they match). A number card is
 * discarded once its pair is cut.
 */
export interface RedTapeState {
  /** Equipment id → covering number card. */
  covers: Record<string, number>;
}

const pairCut = (cuts: { blue: Record<string, number> }, value: number) => (cuts.blue[value] ?? 0) >= 2;

export const redTape: MissionRule<Record<string, never>, RedTapeState> = {
  id: "redTape",
  describe: () => "Each equipment card also needs its number card's pair cut before it unlocks.",
  setup: (built, { random }) => {
    const deck = createNumberDeck(random);
    const covers = Object.fromEntries(built.game.equipment.map((card, index) => [card.id, deck[index]]));
    return { built, state: { covers } };
  },
  isEquipmentUnlocked: (cardId, { state, cuts }) => {
    const cover = state.covers[cardId];
    if (cover === undefined) return undefined; // e.g. cards added later by False Bottom
    const own = cardId === 13 ? cuts.yellow >= 2 : pairCut(cuts, cardId);
    return own && pairCut(cuts, cover);
  },
};

export const coverDone = (state: RedTapeState, cardId: number, cuts: { blue: Record<string, number> }) =>
  state.covers[cardId] !== undefined && pairCut(cuts, state.covers[cardId]);
