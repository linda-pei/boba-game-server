import type { TakeTimeLevelDef, TakeTimeSegmentRule } from "../../types";

// Helper to build rules concisely
const colorCount = (w: number, b: number): TakeTimeSegmentRule => ({
  type: "color-count", whiteCount: w, blackCount: b,
});
const cardCount = (n: number): TakeTimeSegmentRule => ({
  type: "card-count", cardCount: n,
});
const valueRange = (min: number, max: number): TakeTimeSegmentRule => ({
  type: "value-range", range: [min, max],
});
const noValues = (...vals: number[]): TakeTimeSegmentRule => ({
  type: "no-values", excludedValues: vals,
});
const turnOrder = (t: number): TakeTimeSegmentRule => ({
  type: "turn-order", turnNumber: t,
});
const closestTo = (v: number): TakeTimeSegmentRule => ({
  type: "closest-to", targetValue: v,
});
const max: TakeTimeSegmentRule = { type: "max" };
const min: TakeTimeSegmentRule = { type: "min" };
const colorMax = (c: "black" | "white"): TakeTimeSegmentRule => ({
  type: "color-max", color: c,
});
const colorMin = (c: "black" | "white"): TakeTimeSegmentRule => ({
  type: "color-min", color: c,
});
const lastPlay: TakeTimeSegmentRule = { type: "last-play" };

// ---- Chapter I: Awakening ----

const I1: TakeTimeLevelDef = {
  chapter: 1, test: 1,
  clockRule: "infinity",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    1: [colorCount(1, 0)],
    6: [cardCount(3)],
  },
};

const I2: TakeTimeLevelDef = {
  chapter: 1, test: 2,
  clockRule: "infinity",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    3: [valueRange(8, 12)],
    4: [cardCount(3)],
  },
};

const I3: TakeTimeLevelDef = {
  chapter: 1, test: 3,
  clockRule: "infinity",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    2: [turnOrder(2)],
    3: [turnOrder(1)],
    6: [valueRange(20, 30)],
  },
};

const I4: TakeTimeLevelDef = {
  chapter: 1, test: 4,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    1: [closestTo(6)],
    4: [colorCount(1, 1)],
  },
};

// ---- Chapter II: Limitation ----

const II1: TakeTimeLevelDef = {
  chapter: 2, test: 1,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    1: [noValues(1, 2, 3)],
    2: [noValues(1, 2, 3)],
    3: [noValues(1, 2, 3)],
  },
};

const II2: TakeTimeLevelDef = {
  chapter: 2, test: 2,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    3: [noValues(7, 8, 9)],
    4: [noValues(7, 8, 9)],
  },
};

const II3: TakeTimeLevelDef = {
  chapter: 2, test: 3,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {
    1: [noValues(1, 2, 3)],
    3: [noValues(4, 5, 6)],
    4: [noValues(7, 8, 9)],
    6: [noValues(10, 11, 12)],
  },
};

const II4: TakeTimeLevelDef = {
  chapter: 2, test: 4,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  segmentRules: {},
  specialRules: ["no-faceup"],
};

// ---- Chapter III: As within, so without ----

const III1: TakeTimeLevelDef = {
  chapter: 3, test: 1,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [max],
    3: [valueRange(20, 20)],
  },
};

const III2: TakeTimeLevelDef = {
  chapter: 3, test: 2,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [min],
    2: [lastPlay],
    4: [min],
  },
};

const III3: TakeTimeLevelDef = {
  chapter: 3, test: 3,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [max],
    3: [min],
    4: [turnOrder(1), turnOrder(2)],
  },
};

const III4: TakeTimeLevelDef = {
  chapter: 3, test: 4,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [colorMax("black")],
    3: [cardCount(2)],
    4: [closestTo(6)],
    5: [colorMin("white")],
  },
};

// ---- Registry ----

export const LEVELS: TakeTimeLevelDef[] = [
  I1, I2, I3, I4,
  II1, II2, II3, II4,
  III1, III2, III3, III4,
];

export function getLevel(chapter: number, test: number): TakeTimeLevelDef | undefined {
  return LEVELS.find((l) => l.chapter === chapter && l.test === test);
}

export function getLevelLabel(chapter: number, test: number): string {
  return `${toRoman(chapter)}-${test}`;
}

export function toRoman(n: number): string {
  const numerals: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let remaining = n;
  for (const [value, numeral] of numerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

/** How many chapters are currently defined */
export const DEFINED_CHAPTERS = 3;
export const TESTS_PER_CHAPTER = 4;

/** Get the next level after the given one, or null if it's the last defined */
export function getNextLevel(chapter: number, test: number): { chapter: number; test: number } | null {
  if (test < TESTS_PER_CHAPTER) {
    const next = getLevel(chapter, test + 1);
    if (next) return { chapter, test: test + 1 };
  }
  const next = getLevel(chapter + 1, 1);
  if (next) return { chapter: chapter + 1, test: 1 };
  return null;
}

/** Get human-readable description of a segment rule */
export function describeRule(rule: TakeTimeSegmentRule): string {
  switch (rule.type) {
    case "color-count": {
      const parts: string[] = [];
      if (rule.whiteCount) parts.push(`${rule.whiteCount}W`);
      if (rule.blackCount) parts.push(`${rule.blackCount}B`);
      return parts.join(" ") + " only";
    }
    case "card-count":
      return `${rule.cardCount} cards`;
    case "value-range":
      return rule.range![0] === rule.range![1]
        ? `= ${rule.range![0]}`
        : `[${rule.range![0]}, ${rule.range![1]}]`;
    case "no-values":
      return `✕ ${rule.excludedValues!.join(",")}`;
    case "turn-order":
      return `T${rule.turnNumber}`;
    case "closest-to":
      return `|${rule.targetValue}|`;
    case "max":
      return "Max";
    case "min":
      return "Min";
    case "color-max":
      return rule.color === "black" ? "BMax" : "WMax";
    case "color-min":
      return rule.color === "black" ? "BMin" : "WMin";
    case "last-play":
      return "TLast";
    default:
      return "?";
  }
}
