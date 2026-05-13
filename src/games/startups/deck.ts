import type { StartupsCard, StartupsCompany } from "../../types";

/** Standard company order — used for sorting portfolios + rendering. */
export const COMPANIES: StartupsCompany[] = [
  "giraffe",
  "bowwow",
  "flamingo",
  "octo",
  "hippo",
  "emt",
];

export const COMPANY_LABEL: Record<StartupsCompany, string> = {
  giraffe: "Giraffe Beer",
  bowwow: "Bowwow Games",
  flamingo: "Flamingo Soft",
  octo: "Octo Coffee",
  hippo: "Hippo Powertech",
  emt: "Elephant Mars Travel",
};

export const COMPANY_SHORT: Record<StartupsCompany, string> = {
  giraffe: "Giraffe",
  bowwow: "Bowwow",
  flamingo: "Flamingo",
  octo: "Octo",
  hippo: "Hippo",
  emt: "EMT",
};

/** Total cards per company in the full deck. */
export const COMPANY_COUNT: Record<StartupsCompany, number> = {
  giraffe: 5,
  bowwow: 6,
  flamingo: 7,
  octo: 8,
  hippo: 9,
  emt: 10,
};

/** Per-company accent colour for the card body. */
export const COMPANY_COLOR: Record<StartupsCompany, string> = {
  giraffe: "var(--su-giraffe)",
  bowwow: "var(--su-bowwow)",
  flamingo: "var(--su-flamingo)",
  octo: "var(--su-octo)",
  hippo: "var(--su-hippo)",
  emt: "var(--su-emt)",
};

/** Ink colour over each company body (white over dark, dark over light). */
export const COMPANY_INK: Record<StartupsCompany, string> = {
  giraffe: "var(--ink)",
  bowwow: "#fff",
  flamingo: "#fff",
  octo: "#fff",
  hippo: "#fff",
  emt: "var(--ink)",
};

/** Emoji glyph stand-ins for each company icon. */
export const COMPANY_GLYPH: Record<StartupsCompany, string> = {
  giraffe: "🦒",
  bowwow: "🐶",
  flamingo: "🦩",
  octo: "🐙",
  hippo: "🦛",
  emt: "🐘",
};

/** Cards removed face-down at setup (kept hidden the whole game). */
export const REMOVED_AT_SETUP = 5;

/** Cards dealt to each player at setup. */
export const STARTING_HAND = 3;

/** Starting silver capital chips per player. */
export const STARTING_SILVER = 10;

export function buildDeck(): StartupsCard[] {
  const cards: StartupsCard[] = [];
  for (const company of COMPANIES) {
    const n = COMPANY_COUNT[company];
    for (let i = 1; i <= n; i++) {
      cards.push({ id: `${company}-${i}`, company, number: i });
    }
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
