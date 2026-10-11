/**
 * Missions 14 & 17: character cards are dealt face down at random; whoever gets the Captain card
 * takes a special role and is also the first player. Rotating the seat order keeps seats clockwise.
 */
export interface SecretRoleState {
  uid: string;
}

export function rotateToRandomCaptain(playerOrder: string[], random: () => number): string[] {
  const index = Math.floor(random() * playerOrder.length);
  return [...playerOrder.slice(index), ...playerOrder.slice(0, index)];
}
