/**
 * The 12 base equipment cards (see Rules.md → Card Data), each unlocking once 2 wires of its number
 * are cut, plus #13 False Bottom (missions 9+), which unlocks once 2 yellow wires are cut.
 */
export type BBEquipmentTiming = "any-time" | "your-turn" | "start-of-turn";

export interface BBEquipmentCard {
  id: number;
  name: string;
  timing: BBEquipmentTiming;
  effect: string;
}

export const EQUIPMENT: BBEquipmentCard[] = [
  { id: 1, name: "Label ≠", timing: "any-time", effect: "Put the ≠ token in front of 2 of your adjacent wires that have different values." },
  {
    id: 2,
    name: "Walkie-Talkies",
    timing: "any-time",
    effect: "Swap 2 wires with a teammate: each gives the other one uncut wire face down and places the new one in their stand.",
  },
  { id: 3, name: "Triple Detector", timing: "your-turn", effect: "During a Dual Cut, state a value (not yellow) and point at 3 wires on a teammate's stand." },
  { id: 4, name: "Post-it", timing: "any-time", effect: "Put 1 info token in front of one of your blue wires." },
  { id: 5, name: "Super Detector", timing: "your-turn", effect: "During a Dual Cut, state a value (not yellow) and point at a teammate's whole stand." },
  { id: 6, name: "Rewinder", timing: "any-time", effect: "Move the detonator dial back 1 space." },
  {
    id: 7,
    name: "Emergency Batteries",
    timing: "any-time",
    effect: "Flip 1 or 2 used character cards face up: their Double Detector is usable again this mission.",
  },
  {
    id: 8,
    name: "General Radar",
    timing: "any-time",
    effect: "State a number 1–12. Every player says yes if they hold one or more uncut blue wires of that value.",
  },
  {
    id: 9,
    name: "Stabilizer",
    timing: "start-of-turn",
    effect: "Before a Dual Cut: if it fails the dial doesn't move, and if it cuts a red wire the bomb doesn't explode.",
  },
  { id: 10, name: "X or Y Ray", timing: "your-turn", effect: "During a Dual Cut, state 2 values (yellow allowed) while pointing at 1 wire. You must hold both." },
  { id: 11, name: "Coffee Mug", timing: "your-turn", effect: "Skip your turn and choose who the next active player is." },
  { id: 12, name: "Label =", timing: "any-time", effect: "Put the = token in front of 2 of your adjacent wires that have the same value." },
  { id: 13, name: "False Bottom", timing: "any-time", effect: "Draw 2 more equipment cards from the unused pool and add them to the board." },
];

export function getEquipment(id: number): BBEquipmentCard {
  const card = EQUIPMENT.find((item) => item.id === id);
  if (!card) throw new Error(`Unknown equipment ${id}`);
  return card;
}
