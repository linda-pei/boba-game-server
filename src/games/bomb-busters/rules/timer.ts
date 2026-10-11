import type { MissionRule } from "./types";

/** Mission 10: a countdown starts when setup ends; the bomb explodes when it runs out. */
export interface TimerState {
  /** Epoch ms when time runs out; null until play begins. */
  endsAt: number | null;
}
type Params = { minutes: number; twoPlayerMinutes: number };

export const timer: MissionRule<Params, TimerState> = {
  id: "timer",
  describe: ({ minutes, twoPlayerMinutes }) => `Defuse the bomb within ${minutes} minutes (${twoPlayerMinutes} with 2 players).`,
  setup: (built) => ({ built, state: { endsAt: null } }),
  onPlay: ({ game, params, now }) => ({
    state: { endsAt: now + (game.playerOrder.length === 2 ? params.twoPlayerMinutes : params.minutes) * 60_000 },
  }),
  checkLoss: ({ state, now }) => (state.endsAt !== null && now >= state.endsAt ? "Time ran out." : null),
};
