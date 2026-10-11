import { createNumberDeck } from "./numberDeck";
import type { MissionRule } from "./types";

/**
 * Mission 15: equipment starts face down (in a random order). A number card is shown; when all 4
 * wires of that value are cut, the next equipment card (left to right) flips and is immediately
 * usable, and the next number card is shown. A number whose wires are already all cut is discarded
 * without gaining equipment.
 */
export interface RussianToolboxState {
  deck: number[];
  current: number | null;
  /** How many equipment cards (from the left) have flipped. */
  flipped: number;
}

const fullyCut = (game: { cutCounts: { blue: Record<string, number> }; wireTotals: { blue: Record<string, number> } }, value: number) =>
  (game.cutCounts.blue[value] ?? 0) >= (game.wireTotals.blue[value] ?? 4);

export const russianToolbox: MissionRule<Record<string, never>, RussianToolboxState> = {
  id: "russianToolbox",
  describe: (_params, state) =>
    state.current === null
      ? "Equipment is face down. No number cards left."
      : `Equipment is face down. Cut all four ${state.current}s to flip the next card.`,
  setup: (built, { random }) => {
    const deck = createNumberDeck(random);
    // Shuffle the face-down equipment so its order doesn't hint at which card flips first.
    const equipment = [...built.game.equipment];
    for (let i = equipment.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [equipment[i], equipment[j]] = [equipment[j], equipment[i]];
    }
    return { built: { ...built, game: { ...built.game, equipment } }, state: { deck: deck.slice(1), current: deck[0], flipped: 0 } };
  },
  afterCut: (_wire, { game, state }) => {
    if (state.current === null || !fullyCut(game, state.current)) return { state };
    // The shown number is done: flip the next equipment card, then show the next number,
    // discarding any that are already fully cut (no equipment for those).
    const flipped = Math.min(state.flipped + 1, game.equipment.length);
    let deck = state.deck;
    let current: number | null = null;
    while (deck.length > 0) {
      const next = deck[0];
      deck = deck.slice(1);
      if (!fullyCut(game, next)) {
        current = next;
        break;
      }
    }
    return { state: { deck, current, flipped } };
  },
  isEquipmentUnlocked: (cardId, { game, state }) => {
    const position = game.equipment.findIndex((card) => card.id === cardId);
    return position !== -1 && position < state.flipped;
  },
  equipmentFaceDown: (cardId, { game, state }) => game.equipment.findIndex((card) => card.id === cardId) >= state.flipped,
};
