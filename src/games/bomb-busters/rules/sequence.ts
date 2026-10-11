import { createNumberDeck, drawNumbers } from "./numberDeck";
import type { MissionRule } from "./types";

/**
 * Missions 9 & 16: some values must be cut in order. Number cards A → B → C are laid out; no B
 * wire may be cut until `threshold` A wires are cut, and so on. Other values are unrestricted.
 */
export interface SequenceState {
  cards: number[];
  /** Index of the card currently in force; cards before it are done. */
  index: number;
}
type Params = { cards: number; threshold: number };

export const sequence: MissionRule<Params, SequenceState> = {
  id: "sequence",
  describe: ({ threshold }, state) =>
    `Cut in order: ${state.cards.join(" → ")}. ${threshold === 4 ? "All 4" : threshold} of each before the next.`,
  setup: (built, { params, random }) => ({ built, state: { cards: drawNumbers(createNumberDeck(random), params.cards).drawn, index: 0 } }),
  canCut: (declared, { state }) => {
    if (declared === "yellow") return null;
    const position = state.cards.indexOf(declared);
    if (position <= state.index) return null;
    return `Not yet: cut the ${state.cards[state.index]}s first.`;
  },
  afterCut: (_wire, { game, params, state }) => {
    let index = state.index;
    while (index < state.cards.length && (game.cutCounts.blue[state.cards[index]] ?? 0) >= params.threshold) index += 1;
    return { state: { ...state, index } };
  },
};
