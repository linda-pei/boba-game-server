import { rotateToRandomCaptain, type SecretRoleState } from "./secretRole";
import type { MissionRule } from "./types";

/**
 * Mission 17: Red Herring (random Captain-card holder) places 2 fake setup info tokens and every info
 * token on their stand is false: a failed Dual Cut on them places a token showing the named (wrong)
 * value. Red Herring can't use equipment, but still takes part in Walkie-Talkies and General Radar.
 */
export const redHerring: MissionRule<Record<string, never>, SecretRoleState> = {
  id: "redHerring",
  describe: () => "All of Red Herring's info tokens are fake. Red Herring can't use equipment.",
  choosePlayerOrder: (order, { random }) => rotateToRandomCaptain(order, random),
  setup: (built) => ({ built, state: { uid: built.game.captain } }),
  setupInfoPolicy: (uid, { state }) => (uid === state.uid ? { count: 2, fake: true } : undefined),
  wrongGuessToken: (_wire, declared, { state, target }) =>
    target !== state.uid ? undefined : declared === "yellow" ? { color: "yellow" } : { color: "blue", value: declared },
  canUseEquipment: (uid, _cardId, { state }) => (uid === state.uid ? "Red Herring can't use equipment." : null),
};
