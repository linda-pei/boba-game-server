import type {
  CloverCard,
  CloverClueZone,
  CloverPlacement,
  CloverRotation,
  CloverSlot,
} from "../../types";

export const CLOVER_SLOTS: CloverSlot[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export const CLOVER_CLUE_ZONES: CloverClueZone[] = ["top", "right", "bottom", "left"];

const ROTATIONS: CloverRotation[] = [0, 90, 180, 270];

export interface CloverGuessEvaluation {
  correctCardIds: string[];
  incorrectCardIds: string[];
  isPerfect: boolean;
}

export function isCloverRotation(value: number): value is CloverRotation {
  return ROTATIONS.includes(value as CloverRotation);
}

export function rotateCloverWords(
  words: CloverCard["words"],
  rotation: CloverRotation,
): CloverCard["words"] {
  const turns = rotation / 90;
  const rotated = [...words];

  for (let index = 0; index < turns; index += 1) {
    rotated.unshift(rotated.pop()!);
  }

  return rotated as CloverCard["words"];
}

export function randomCloverRotations(
  cards: CloverCard[],
  random: () => number = Math.random,
): Record<string, CloverRotation> {
  return Object.fromEntries(
    cards.map((card) => [card.id, ROTATIONS[Math.floor(random() * ROTATIONS.length)]]),
  );
}

/** Deal cards onto the Clover in a random order, each with a random rotation (the clue-giver's starting board). */
export function randomCloverPlacement(
  cards: CloverCard[],
  random: () => number = Math.random,
): Record<string, CloverPlacement> {
  const slots = [...CLOVER_SLOTS];
  for (let index = slots.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [slots[index], slots[swap]] = [slots[swap], slots[index]];
  }
  const rotations = randomCloverRotations(cards, random);
  return Object.fromEntries(cards.slice(0, slots.length).map((card, index) => [card.id, { slot: slots[index], rotation: rotations[card.id] }]));
}

export function getCloverCardById(cards: CloverCard[], cardId: string): CloverCard | null {
  return cards.find((card) => card.id === cardId) ?? null;
}

export function isCompleteCloverPlacement(
  placement: Record<string, CloverPlacement>,
  cards: CloverCard[],
): boolean {
  const cardIds = Object.keys(placement);
  if (cardIds.length !== 4 || cards.length < 4) return false;

  const slots = new Set<CloverSlot>();

  return cardIds.every((cardId) => {
    const cardPlacement = placement[cardId];
    if (!cardPlacement || !getCloverCardById(cards, cardId)) return false;
    if (!CLOVER_SLOTS.includes(cardPlacement.slot) || !isCloverRotation(cardPlacement.rotation)) return false;
    if (slots.has(cardPlacement.slot)) return false;
    slots.add(cardPlacement.slot);
    return true;
  });
}

export function getCardIdAtSlot(
  placement: Record<string, CloverPlacement>,
  slot: CloverSlot,
): string | null {
  return Object.entries(placement).find(([, value]) => value.slot === slot)?.[0] ?? null;
}

export function getOuterKeywordPairs(
  cards: CloverCard[],
  placement: Record<string, CloverPlacement>,
): Record<CloverClueZone, [string, string]> | null {
  if (!isCompleteCloverPlacement(placement, cards)) return null;

  const wordsAt = (slot: CloverSlot): CloverCard["words"] | null => {
    const cardId = getCardIdAtSlot(placement, slot);
    if (!cardId) return null;
    const card = getCloverCardById(cards, cardId);
    const cardPlacement = placement[cardId];
    if (!card || !cardPlacement) return null;
    return rotateCloverWords(card.words, cardPlacement.rotation);
  };

  const topLeft = wordsAt("top-left");
  const topRight = wordsAt("top-right");
  const bottomLeft = wordsAt("bottom-left");
  const bottomRight = wordsAt("bottom-right");
  if (!topLeft || !topRight || !bottomLeft || !bottomRight) return null;

  return {
    top: [topLeft[0], topRight[0]],
    right: [topRight[1], bottomRight[1]],
    bottom: [bottomLeft[2], bottomRight[2]],
    left: [topLeft[3], bottomLeft[3]],
  };
}

export function isValidCloverClue(clue: string): boolean {
  const normalized = clue.trim();
  return normalized.length > 0 && normalized.length <= 40 && !/\s/.test(normalized);
}

/** Inline warning for a clue draft, or null when it looks fine (empty drafts aren't flagged). */
export function getCloverClueWarning(clue: string, keywords: string[] = []): string | null {
  const normalized = clue.trim();
  if (!normalized) return null;
  if (/\s/.test(normalized)) return "One word only";
  if (keywords.some((keyword) => keyword.toLowerCase() === normalized.toLowerCase())) {
    return "Can't use a keyword from this pair";
  }
  return null;
}

export function hasValidCloverClues(clues: Record<CloverClueZone, string>): boolean {
  return CLOVER_CLUE_ZONES.every((zone) => isValidCloverClue(clues[zone] ?? ""));
}

export function evaluateCloverGuess(
  answer: Record<string, CloverPlacement>,
  guess: Record<string, CloverPlacement>,
): CloverGuessEvaluation {
  const correctCardIds = Object.keys(answer).filter((cardId) => {
    const expected = answer[cardId];
    const submitted = guess[cardId];
    return submitted?.slot === expected.slot && submitted.rotation === expected.rotation;
  });

  const incorrectCardIds = Object.keys(guess).filter((cardId) => !correctCardIds.includes(cardId));

  return {
    correctCardIds,
    incorrectCardIds,
    isPerfect: correctCardIds.length === 4,
  };
}

export function getCloverScore(evaluation: CloverGuessEvaluation, attempt: 1 | 2): number {
  if (attempt === 1 && evaluation.isPerfect) return 6;
  return evaluation.correctCardIds.length;
}

export function getNextCloverPlayer(playerOrder: string[], uid: string): string | null {
  const currentIndex = playerOrder.indexOf(uid);
  if (currentIndex === -1 || playerOrder.length < 2) return null;
  return playerOrder[(currentIndex + 1) % playerOrder.length] ?? null;
}

export interface CloverRank {
  name: string;
  description: string;
}

const CLOVER_RANKS: CloverRank[] = [
  { name: "Small Sprout", description: "A tiny peek above the soil." },
  { name: "Growth", description: "Bit by bit, an average pace." },
  { name: "First bud", description: "You're starting to bloom." },
  { name: "Blossom", description: "A beautiful score!" },
  { name: "Four-leaf clover", description: "Rare and perfect!" },
];

// Minimum team score for each rank above, keyed by player count (from the rulebook).
const CLOVER_RANK_THRESHOLDS: Record<number, number[]> = {
  3: [0, 7, 11, 15, 18],
  4: [0, 9, 19, 20, 24],
  5: [0, 11, 19, 25, 30],
  6: [0, 13, 23, 30, 36],
};

export function getCloverRank(score: number, playerCount: number): CloverRank {
  const clamped = Math.min(Math.max(playerCount, 3), 6);
  const thresholds = CLOVER_RANK_THRESHOLDS[clamped];
  let rankIndex = 0;
  thresholds.forEach((minimum, index) => {
    if (score >= minimum) rankIndex = index;
  });
  return CLOVER_RANKS[rankIndex];
}
