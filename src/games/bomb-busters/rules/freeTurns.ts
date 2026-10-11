import { hasUncutWires, unwrapPublic } from "../engine";
import type { MissionRule } from "./types";

/**
 * Mission 10: no clockwise order. When the turn is open, any player with wires says "Snip!" to take
 * it — but not the player who just went (except with 2 players).
 */
export interface FreeTurnsState {
  last: string | null;
}

export const freeTurns: MissionRule<Record<string, never>, FreeTurnsState> = {
  id: "freeTurns",
  describe: () => 'Take turns in any order: say "Snip!" to go. Nobody takes two turns in a row (except with 2 players).',
  setup: (built) => ({ built, state: { last: null } }),
  onPlay: ({ game, state }) => ({ game: { ...game, turn: "" }, state }),
  nextTurn: (actor) => ({ turn: "", state: { last: actor } }),
  canClaimTurn: (uid, { game, state }) => {
    if (!hasUncutWires(unwrapPublic(game.stands)[uid] ?? [])) return "You have no wires left.";
    if (game.playerOrder.length > 2 && state.last === uid) return "You just went: someone else has to snip first.";
    return null;
  },
};
