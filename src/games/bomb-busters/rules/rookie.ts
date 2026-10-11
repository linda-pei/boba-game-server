import { rotateToRandomCaptain, type SecretRoleState } from "./secretRole";
import type { MissionRule } from "./types";

/** Mission 14: the Rookie (random Captain-card holder) explodes the bomb on any failed Dual Cut and can't use the Stabilizer. */
export const rookie: MissionRule<Record<string, never>, SecretRoleState> = {
  id: "rookie",
  describe: () => "The Rookie's failed Dual Cut explodes the bomb, and the Rookie can't use the Stabilizer. Leave them the easy cuts!",
  choosePlayerOrder: (order, { random }) => rotateToRandomCaptain(order, random),
  setup: (built) => ({ built, state: { uid: built.game.captain } }),
  onWrongGuess: ({ state, by }) => (by === state.uid ? "explode" : undefined),
  canUseEquipment: (uid, cardId, { state }) => (uid === state.uid && cardId === 9 ? "The Rookie can't use the Stabilizer." : null),
};
