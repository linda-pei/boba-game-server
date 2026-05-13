import type { FruitCard, FruitSuit } from "../../types";

/** Standard suit order — used for sorting collections and rendering. */
export const SUITS: FruitSuit[] = [
  "plum",
  "apple",
  "orange",
  "tomato",
  "watermelon",
  "lemon",
  "pear",
];

export const SUIT_LABEL: Record<FruitSuit, string> = {
  plum: "Plum",
  apple: "Apple",
  orange: "Orange",
  tomato: "Tomato",
  watermelon: "Watermelon",
  lemon: "Lemon",
  pear: "Pear",
};

/** Per-suit accent color used for chip backgrounds and card fills. */
export const SUIT_COLOR: Record<FruitSuit, string> = {
  plum: "var(--fb-plum)",
  apple: "var(--fb-apple)",
  orange: "var(--fb-orange)",
  tomato: "var(--fb-tomato)",
  watermelon: "var(--fb-watermelon)",
  lemon: "var(--fb-lemon)",
  pear: "var(--fb-pear)",
};

/** Per-suit ink color (for value text on a colored chip). Mostly white over the
 *  saturated suit colors; switched per suit if contrast demands it. */
export const SUIT_INK: Record<FruitSuit, string> = {
  plum: "#fff",
  apple: "#fff",
  orange: "var(--ink)",
  tomato: "#fff",
  watermelon: "#fff",
  lemon: "var(--ink)",
  pear: "var(--ink)",
};

/** Card-count distribution per suit: three 1s, two 2s, one each of 3/4/5 = 8 per suit. */
const VALUE_COUNTS: Record<number, number> = { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1 };

/** Number of star-fruit (wild) cards in the deck. */
export const STAR_COUNT = 3;
/** Number of maneki-neko (cat) cards in the deck. */
export const CAT_COUNT = 3;

/**
 * Build the full 56-fruit + 3-star + 3-cat deck. For 2-player games,
 * tomato is excluded.
 */
export function buildDeck(playerCount: number): FruitCard[] {
  const cards: FruitCard[] = [];
  const suits = playerCount === 2 ? SUITS.filter((s) => s !== "tomato") : SUITS;

  for (const suit of suits) {
    for (const [valueStr, count] of Object.entries(VALUE_COUNTS)) {
      const value = Number(valueStr);
      for (let i = 0; i < count; i++) {
        cards.push({
          id: `${suit}-${value}-${i}`,
          kind: "fruit",
          suit,
          value,
        });
      }
    }
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    // Stars are wild for suit but count as value 1 for scoring + hand-penalty math.
    cards.push({ id: `star-${i}`, kind: "star", value: 1 });
  }
  for (let i = 0; i < CAT_COUNT; i++) {
    cards.push({ id: `cat-${i}`, kind: "cat", value: 0 });
  }

  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Number of stalls in the marketplace. */
export const MARKET_STALLS = 5;

/** Player starting hand size. Drawn back up to this at end of turn. */
export const HAND_LIMIT = 5;

/** Stack size that triggers a topple. */
export const TOPPLE_AT = 5;
