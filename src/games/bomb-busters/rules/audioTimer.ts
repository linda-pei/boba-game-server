import type { MissionRule } from "./types";

/**
 * Mission 19: no special rules; the mission's audio track is the timer. It's linked from the
 * publisher's CDN (not copied into the repo). The track starts when play begins; when it ends
 * before the bomb is defused, the mission is lost (reported by a listening client).
 */
export interface AudioTimerState {
  startedAt: number | null;
}
type Params = { url: string };

export const audioTimer: MissionRule<Params, AudioTimerState> = {
  id: "audioTimer",
  describe: () => "Play the mission audio: it's your timer. Defuse the bomb before it ends.",
  setup: (built) => ({ built, state: { startedAt: null } }),
  onPlay: ({ state, now }) => ({ state: { ...state, startedAt: now } }),
};
