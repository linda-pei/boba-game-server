import type { ScoutCard } from "../../types";
import { shuffled } from "../../utils/shuffle";

/** Generate all 45 unique pair cards: C(10,2) combinations of 1–10. */
export function generateScoutDeck(): ScoutCard[] {
  const cards: ScoutCard[] = [];
  for (let i = 1; i <= 10; i++) {
    for (let j = i + 1; j <= 10; j++) {
      cards.push({ id: `${i}-${j}`, top: j, bottom: i });
    }
  }
  return cards;
}

/** Remove cards based on player count:
 *  3p: remove the 9-10 card (44 cards)
 *  4p: remove all cards containing 10 (36 cards)
 *  5p: all 45 cards
 */
export function filterDeckForPlayerCount(
  deck: ScoutCard[],
  playerCount: number
): ScoutCard[] {
  if (playerCount === 3) {
    return deck.filter((c) => c.top !== 10 && c.bottom !== 10);
  }
  if (playerCount === 4) {
    return deck.filter((c) => c.id !== "9-10");
  }
  return deck; // 5 players: all 45
}

/** Swap top and bottom of a single card. */
export function flipCard(card: ScoutCard): ScoutCard {
  return { id: card.id, top: card.bottom, bottom: card.top };
}

/** Flip entire hand: swap top/bottom on every card AND reverse order. */
export function flipHand(cards: ScoutCard[]): ScoutCard[] {
  return [...cards].reverse().map(flipCard);
}

/** Shuffle and deal cards evenly. Returns array of hands; remainder discarded. */
export function dealCards(
  deck: ScoutCard[],
  playerCount: number
): ScoutCard[][] {
  const shuffledDeck = shuffled(deck);
  const handSize = Math.floor(shuffledDeck.length / playerCount);
  const hands: ScoutCard[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(shuffledDeck.slice(i * handSize, (i + 1) * handSize));
  }
  return hands;
}

export type PlayType = "match" | "straight";

export interface PlayValidation {
  valid: boolean;
  type: PlayType | null;
  value: number;
  length: number;
}

/** Validate that selected cards form a legal play (match or straight). */
export function validatePlay(cards: ScoutCard[]): PlayValidation {
  const invalid: PlayValidation = { valid: false, type: null, value: 0, length: 0 };

  if (cards.length === 0) return invalid;

  // Single card is always valid — treated as a match of 1
  if (cards.length === 1) {
    return { valid: true, type: "match", value: cards[0].top, length: 1 };
  }

  // Check match: all top values the same
  const allSameTop = cards.every((c) => c.top === cards[0].top);
  if (allSameTop) {
    return { valid: true, type: "match", value: cards[0].top, length: cards.length };
  }

  // Check straight: consecutive top values (ascending or descending)
  const tops = cards.map((c) => c.top);

  // Ascending?
  let isAscending = true;
  for (let i = 1; i < tops.length; i++) {
    if (tops[i] !== tops[i - 1] + 1) {
      isAscending = false;
      break;
    }
  }
  if (isAscending) {
    // Value of a straight is its highest card
    return { valid: true, type: "straight", value: Math.max(...tops), length: cards.length };
  }

  // Descending?
  let isDescending = true;
  for (let i = 1; i < tops.length; i++) {
    if (tops[i] !== tops[i - 1] - 1) {
      isDescending = false;
      break;
    }
  }
  if (isDescending) {
    return { valid: true, type: "straight", value: Math.max(...tops), length: cards.length };
  }

  return invalid;
}

/** Compare a challenger play against the current center pile.
 *  Returns true if challenger beats incumbent.
 *  Hierarchy:
 *    1. More cards beats fewer (regardless of type)
 *    2. Same count: matches beat straights
 *    3. Same count + same type: higher value wins (strictly greater)
 */
export function beatsCurrentPile(
  challenger: PlayValidation,
  incumbent: PlayValidation
): boolean {
  if (!challenger.valid || !incumbent.valid) return false;

  // 1. More cards wins
  if (challenger.length > incumbent.length) return true;
  if (challenger.length < incumbent.length) return false;

  // 2. Same count: match beats straight
  if (challenger.type === "match" && incumbent.type === "straight") return true;
  if (challenger.type === "straight" && incumbent.type === "match") return false;

  // 3. Same count + same type: strictly higher value wins
  return challenger.value > incumbent.value;
}