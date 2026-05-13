import type { TakeTimeLevelDef, TakeTimeSegmentRule, TakeTimeBetweenRule } from "../../types";

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
const draw: TakeTimeSegmentRule = { type: "draw" };
const clockwise: TakeTimeSegmentRule = { type: "clockwise" };
const counterClockwise: TakeTimeSegmentRule = { type: "counter-clockwise" };
const blocked: TakeTimeSegmentRule = { type: "blocked" };
const minDiff = (seg: number, diff: number): TakeTimeBetweenRule => ({
  type: "min-diff", segment: seg, minDiff: diff,
});
const equal = (seg: number): TakeTimeBetweenRule => ({
  type: "equal", segment: seg,
});

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
    3: [closestTo(20)],
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

// ---- Chapter IV: Roar ----

const IV1: TakeTimeLevelDef = {
  chapter: 4, test: 1,
  clockRule: "high-to-low",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [turnOrder(1)],
    4: [cardCount(1)],
  },
};

const IV2: TakeTimeLevelDef = {
  chapter: 4, test: 2,
  clockRule: "low-to-high",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [turnOrder(1)],
    2: [max],
  },
};

const IV3: TakeTimeLevelDef = {
  chapter: 4, test: 3,
  clockRule: "locked-order",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [noValues(1, 2, 3)],
    3: [noValues(1, 2, 3)],
    5: [noValues(1, 2, 3)],
  },
};

const IV4: TakeTimeLevelDef = {
  chapter: 4, test: 4,
  clockRule: "locked-order",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [closestTo(12)],
    2: [min],
    3: [max],
  },
};

// ---- Chapter V: Tranquility ----

const V1: TakeTimeLevelDef = {
  chapter: 5, test: 1,
  clockRule: "two-per-segment",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {},
};

const V2: TakeTimeLevelDef = {
  chapter: 5, test: 2,
  clockRule: "two-per-segment",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [min],
    5: [closestTo(15)],
  },
};

const V3: TakeTimeLevelDef = {
  chapter: 5, test: 3,
  clockRule: "two-per-segment",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [min],
    2: [max],
  },
};

const V4: TakeTimeLevelDef = {
  chapter: 5, test: 4,
  clockRule: "two-per-segment",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [turnOrder(3)],
    2: [colorCount(1, 1)],
    3: [colorCount(1, 1)],
    4: [turnOrder(2)],
  },
};

// ---- Chapter VI: As above, so below ----

const VI1: TakeTimeLevelDef = {
  chapter: 6, test: 1,
  clockRule: "difference",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [max],
  },
};

const VI2: TakeTimeLevelDef = {
  chapter: 6, test: 2,
  clockRule: "difference",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [noValues(1, 2, 3)],
    2: [colorCount(1, 1)],
  },
};

const VI3: TakeTimeLevelDef = {
  chapter: 6, test: 3,
  clockRule: "difference",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [closestTo(12)],
    4: [turnOrder(2), turnOrder(3)],
  },
};

const VI4: TakeTimeLevelDef = {
  chapter: 6, test: 4,
  clockRule: "difference",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [colorMax("black")],
    4: [colorMin("white")],
    5: [closestTo(24)],
  },
};

// ---- Chapter VII: Intrusion ----

const VII1: TakeTimeLevelDef = {
  chapter: 7, test: 1,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [draw],
    3: [noValues(7, 8, 9)],
    4: [noValues(7, 8, 9)],
  },
};

const VII2: TakeTimeLevelDef = {
  chapter: 7, test: 2,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [draw],
    4: [draw],
    5: [lastPlay],
  },
};

const VII3: TakeTimeLevelDef = {
  chapter: 7, test: 3,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [colorMin("white"), colorMax("black")],
    2: [draw],
    3: [colorCount(2, 2)],
  },
};

const VII4: TakeTimeLevelDef = {
  chapter: 7, test: 4,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [draw],
    3: [draw],
    5: [draw],
  },
};

// ---- Chapter VIII: Revolution ----

const VIII1: TakeTimeLevelDef = {
  chapter: 8, test: 1,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [clockwise],
    3: [blocked],
    5: [valueRange(16, 20)],
  },
};

const VIII2: TakeTimeLevelDef = {
  chapter: 8, test: 2,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [clockwise],
    3: [blocked],
    4: [clockwise],
    5: [blocked],
    6: [blocked],
  },
};

const VIII3: TakeTimeLevelDef = {
  chapter: 8, test: 3,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [cardCount(1)],
    2: [clockwise],
    3: [clockwise],
    4: [clockwise],
    5: [cardCount(2)],
  },
};

const VIII4: TakeTimeLevelDef = {
  chapter: 8, test: 4,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  handRotatesWithBoard: true,
  segmentRules: {
    1: [clockwise],
    2: [clockwise],
    5: [counterClockwise],
    6: [counterClockwise],
  },
};

// ---- Chapter IX: Unity ----

const IX1: TakeTimeLevelDef = {
  chapter: 9, test: 1,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    2: [max],
  },
  betweenRules: [minDiff(1, 6)],
};

const IX2: TakeTimeLevelDef = {
  chapter: 9, test: 2,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {},
  betweenRules: [
    minDiff(1, 2), minDiff(2, 2), minDiff(3, 2),
    minDiff(4, 2), minDiff(5, 2), minDiff(6, 2),
  ],
};

const IX3: TakeTimeLevelDef = {
  chapter: 9, test: 3,
  clockRule: "normal",
  handAdjustable: true,
  startSegment: 1,
  segmentRules: {
    1: [min],
    4: [min],
  },
  betweenRules: [equal(1), equal(4)],
};

const IX4: TakeTimeLevelDef = {
  chapter: 9, test: 4,
  clockRule: "max-spread",
  handAdjustable: true,
  startSegment: 1,
  maxSpread: 4,
  segmentRules: {},
};

// ---- Chapter X: Cohesiveness ----

const X1: TakeTimeLevelDef = {
  chapter: 10, test: 1,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  hourHand: 6,
  segmentRules: {},
};

const X2: TakeTimeLevelDef = {
  chapter: 10, test: 2,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  hourHand: 5,
  segmentRules: {
    2: [cardCount(2)],
  },
};

const X3: TakeTimeLevelDef = {
  chapter: 10, test: 3,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  hourHand: 4,
  segmentRules: {
    2: [turnOrder(1)],
    5: [lastPlay],
  },
};

const X4: TakeTimeLevelDef = {
  chapter: 10, test: 4,
  clockRule: "normal",
  handAdjustable: false,
  startSegment: 1,
  hourHand: 2,
  secondHand: 6,
  segmentRules: {},
};

// ---- Registry ----

export const LEVELS: TakeTimeLevelDef[] = [
  I1, I2, I3, I4,
  II1, II2, II3, II4,
  III1, III2, III3, III4,
  IV1, IV2, IV3, IV4,
  V1, V2, V3, V4,
  VI1, VI2, VI3, VI4,
  VII1, VII2, VII3, VII4,
  VIII1, VIII2, VIII3, VIII4,
  IX1, IX2, IX3, IX4,
  X1, X2, X3, X4,
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
export const DEFINED_CHAPTERS = 10;
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

/** Get explanatory hints for levels with unique rules */
/** One-sentence description of a clock-wide rule. Used for both the
 *  in-game hint banner ("Clock Rule: …") and the center-glyph hover tooltip. */
export function describeClockRule(
  clockRule: TakeTimeLevelDef["clockRule"],
  maxSpread?: number
): string | null {
  switch (clockRule) {
    case "infinity":
      return "Segment values may exceed 24.";
    case "high-to-low":
      return "On your turn, you must play the highest value card in your hand.";
    case "low-to-high":
      return "On your turn, you must play the lowest value card in your hand.";
    case "locked-order":
      return "You must always play the leftmost card in your hand. Card order is locked after discussion.";
    case "two-per-segment":
      return "Each segment must have exactly 2 cards.";
    case "difference":
      return "Each segment must have exactly 2 cards. Segment value = difference between the two cards (not the sum). Values must still increase clockwise.";
    case "max-spread":
      return `The difference between the highest and lowest segment values cannot exceed ${maxSpread ?? 4}.`;
    default:
      return null;
  }
}

export function getLevelHints(def: TakeTimeLevelDef): string[] {
  const hints: string[] = [];

  // Clock rule
  const clockRuleText = describeClockRule(def.clockRule, def.maxSpread);
  if (clockRuleText) hints.push(`Clock Rule: ${clockRuleText}`);

  // Special rules
  if (def.specialRules?.includes("no-faceup")) {
    hints.push("No cards may be played face-up this test.");
  }

  // Draw mechanic
  const hasDrawRule = Object.values(def.segmentRules).some(
    (rules) => rules.some((r) => r.type === "draw")
  );
  if (hasDrawRule) {
    hints.push("Draw segments: when you place a card here, immediately draw a card from the deck. Play continues until all hands are empty.");
  }

  // Rotation mechanic
  const hasRotation = Object.values(def.segmentRules).some(
    (rules) => rules.some((r) => r.type === "clockwise" || r.type === "counter-clockwise")
  );
  const hasBlocked = Object.values(def.segmentRules).some(
    (rules) => rules.some((r) => r.type === "blocked")
  );
  if (hasRotation) {
    hints.push("Rotation segments: placing a card here rotates the clock face. Cards and clock hand stay in place.");
  }
  if (hasBlocked) {
    hints.push("Blocked segments (✕) cannot receive cards directly — you must rotate the clock to move cards there.");
  }
  if (def.handRotatesWithBoard) {
    hints.push("The clock hand rotates along with the board when the clock is rotated.");
  }

  // Between-segment rules
  if (def.betweenRules && def.betweenRules.length > 0) {
    const hasMinDiff = def.betweenRules.some((r) => r.type === "min-diff");
    const hasEqual = def.betweenRules.some((r) => r.type === "equal");
    if (hasMinDiff) {
      hints.push("Some adjacent segments must differ by at least a minimum value (shown between segments).");
    }
    if (hasEqual) {
      hints.push("Some adjacent segments must have equal values (shown between segments).");
    }
  }

  // Hour hand
  if (def.hourHand !== undefined) {
    hints.push("Hour hand: starting from the hour hand and going clockwise, the first card placed in each segment must be in ascending order.");
  }

  // Second hand
  if (def.secondHand !== undefined) {
    hints.push("Second hand: you cannot place cards on the two segments it points to. It rotates one segment clockwise after each turn.");
  }

  return hints;
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
    case "draw":
      return "Draw";
    case "clockwise":
      return "↻";
    case "counter-clockwise":
      return "↺";
    case "blocked":
      return "✕";
    default:
      return "?";
  }
}
