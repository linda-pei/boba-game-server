import type { BBHandWire } from "../../../types";
import { createAllWires, publicStandsFor, sortStand, wrapPublic } from "../engine";
import type { MissionRule } from "./types";

/**
 * Mission 13: three red wires, dealt before the blue ones — one each to the first three players from
 * the captain (with 2 players the captain gets two, one per stand). Setup info tokens are drawn at
 * random: point yours at a wire of that value, or place it face up beside your stand if you have
 * none (2 players: the captain places none). A new action, Red Alert, cuts the three reds at once:
 * point at them anywhere; if any isn't red, the bomb explodes. Reveal Red isn't available — a player
 * holding only reds must use Red Alert.
 */
export interface RedAlertState {
  /** Each player's randomly drawn setup info token value. */
  tokens: Record<string, number>;
}

/** Info token pool: 2 blue tokens of each value 1–12 (yellow tokens are redrawn, so never drawn). */
function drawTokenValues(count: number, random: () => number): number[] {
  const pool = Array.from({ length: 12 }, (_, i) => [i + 1, i + 1]).flat();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const redAlert: MissionRule<Record<string, never>, RedAlertState> = {
  id: "redAlert",
  describe: () => "Three red wires. Red Alert: on your turn, point at all three anywhere to cut them at once. Any mistake explodes the bomb.",
  setup: (built, { random }) => {
    const order = built.game.playerOrder;
    const reds = createAllWires().filter((wire) => wire.color === "red");
    for (let i = reds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [reds[i], reds[j]] = [reds[j], reds[i]];
    }
    const recipients: { uid: string; stand: number }[] =
      order.length === 2 ? [{ uid: order[0], stand: 0 }, { uid: order[0], stand: 1 }, { uid: order[1], stand: 0 }] : order.slice(0, 3).map((uid) => ({ uid, stand: 0 }));
    const hands: Record<string, BBHandWire[][]> = { ...built.hands };
    recipients.forEach(({ uid, stand }, index) => {
      hands[uid] = hands[uid].map((wires, standIndex) => (standIndex === stand ? sortStand([...wires, { ...reds[index], cut: false }]) : wires));
    });
    const stands = wrapPublic(Object.fromEntries(order.map((uid) => [uid, publicStandsFor(hands[uid])])));
    const markers = [...built.game.markers, ...reds.slice(0, 3).map((wire) => ({ color: "red" as const, sortKey: wire.sortKey, uncertain: false }))];
    const values = drawTokenValues(order.length, random);
    const tokens = Object.fromEntries(order.map((uid, index) => [uid, values[index]]));
    const setupDone = order.length === 2 ? [...built.game.setupDone, order[0]] : built.game.setupDone;
    return {
      built: {
        ...built,
        hands,
        game: { ...built.game, stands, markers, setupDone, wireTotals: { ...built.game.wireTotals, red: 3 } },
      },
      state: { tokens },
    };
  },
  setupInfoPolicy: (uid, { state }) => ({ count: 1, fake: false, value: state.tokens[uid] }),
  canReveal: () => "Use Red Alert to cut the three reds at once.",
};
