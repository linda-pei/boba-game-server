export interface Player {
  name: string;
  order: number;
}

export interface RoomSettings {
  numRings: number;
  knower?: string;
  mode?: "competitive" | "coop";
  limitedTokens?: boolean;
  chapter?: number;
  testNumber?: number;
  deckId?: string;
  difficulty?: "easy" | "medium" | "hard" | "impossible";
  timerMinutes?: number;
  mayor?: string;
  /** Startups: enable the optional 4-round variant. */
  roundsEnabled?: boolean;
}

export interface Room {
  host: string;
  status: "lobby" | "in-progress" | "finished";
  gameType: string;
  settings: RoomSettings;
  players: Record<string, Player>;
  maxPlayers: number;
  createdAt: Date;
}

export interface PendingPlay {
  cardId: string;
  playedBy: string;
  rings: number[];
}

export interface PlayedCard {
  playedBy: string;
  rings: number[];
}

export interface Game {
  gameType: string;
  mode: "competitive" | "coop";
  status: "knower-setup" | "in-progress" | "finished";
  knower: string;
  numRings: number;
  rings: { label: string }[];
  ringAssignments: Record<string, number[]>;
  playedCards: Record<string, PlayedCard>;
  playOrder: string[];
  pendingPlay: PendingPlay | null;
  deck: string[];
  turnOrder: string[];
  currentTurn: number;
  numSetupCards: number;
  winner: string | null;
}

export interface Hand {
  cards: string[];
}

// ---- Werewords types ----

export type WerewordsRole = "seer" | "werewolf" | "villager";
export type WerewordsStatus =
  | "role-reveal"
  | "word-setup"
  | "word-reveal"
  | "in-progress"
  | "werewolf-guess"
  | "voting"
  | "finished";
export type GuessResponse = "yes" | "no" | "maybe" | "so-close" | "correct";

export interface WerewordsGame {
  gameType: "werewords";
  status: WerewordsStatus;
  mayor: string;
  turnOrder: string[];
  magicWord: string;
  guesses: Record<string, GuessResponse[]>;
  soCloseUsed: boolean;
  wayOff: boolean;
  correctGuesser: string | null;
  werewolfGuess: string | null;
  votes: Record<string, string>;
  winner: "villagers" | "werewolves" | null;
  winReason: string | null;
  roleRevealed: Record<string, boolean>;
  revealedRoles: Record<string, WerewordsRole> | null;
  limitedTokens: boolean;
  wordChoices: string[];
  timerMinutes: number;
  timerStartedAt: number | null;
  wordRevealed: Record<string, boolean>;
}

export interface WerewordsHand {
  role: WerewordsRole;
  fellowWerewolves: string[];
}

// ---- Scout types ----

export interface ScoutCard {
  id: string;    // always "low-high", e.g. "3-7"
  top: number;
  bottom: number;
}

export interface ScoutHand {
  cards: ScoutCard[];
  hasUsedScoutPlay: boolean;
}

export interface ScoutGame {
  gameType: "scout";
  status: "setup" | "in-progress" | "round-end" | "finished";
  turnOrder: string[];
  currentTurn: number;
  dealerIndex: number;
  roundNumber: number;
  centerPile: { cards: ScoutCard[]; playedBy: string } | null;
  consecutiveScouts: number;
  scores: Record<string, { capturedCount: number; dollarTokens: number }>;
  cumulativeScores: Record<string, number>;
  setupConfirmed: Record<string, boolean>;
  roundEndReason: "hand-emptied" | "uncontested" | null;
  roundEndPlayer: string | null;
  winner: string | null;
  lastAction: string | null;
}

// ---- Order Overload types ----

export type OrderOverloadAbility = "discard" | "first-letter" | "last-letter";

export interface OrderOverloadGame {
  gameType: "order-overload";
  deckId: string;
  status: "reading" | "playing" | "level-complete" | "finished";
  level: number;
  turnOrder: string[];
  currentTurn: number;
  orderTakerIndex: number;

  // Reading phase
  readingIndex: number;
  totalOrdersForLevel: number;

  // Playing phase — currentGuess null = awaiting guess, non-null = responding
  currentGuess: string | null;
  guessingPlayer: string | null;
  respondingOrder: string[];
  respondingIndex: number;
  lastGuessResult: "found" | "not-found" | null;
  foundByPlayer: string | null;

  // Abilities (once per game, used in addition to guessing)
  abilities: Record<string, OrderOverloadAbility>;
  abilitiesUsed: Record<string, boolean>;
  abilityReveals: Array<{
    type: "first-letter" | "last-letter";
    targetUid: string;
    letters: string[];
    usedBy: string;
  }>;

  // Revealed cards per player (shown in player board)
  revealedCards: Record<string, string[]>;

  // Level tracking
  eliminatedPlayers: string[];
  emptiedPlayers: string[];
  emptiedToWin: number;
  levelResult: "pass" | "fail" | null;

  // Progress
  highestLevelPassed: number;
  lastAction: string | null;
}

export interface OrderOverloadHand {
  cards: string[];
  ordersToRead?: string[];
}

// ---- Deep Sea Adventure types ----

export type TreasureLevel = 1 | 2 | 3 | 4;

export interface TreasureChip {
  id: string;
  level: TreasureLevel;
  points: number;
}

export interface PathSpace {
  type: "treasure" | "blank" | "stack";
  level?: TreasureLevel;
  chipId?: string;
  stackChipIds?: string[];
  stackLevels?: TreasureLevel[];   // levels of chips in the stack (for display)
}

export interface DeepSeaDiver {
  position: number;       // -1 = on submarine, 0+ = path index
  direction: "down" | "up";
  carriedCount: number;
  carriedLevels: { levels: TreasureLevel[] }[];  // each entry is a group (single chip or stack)
  returned: boolean;
}

export type DeepSeaPhase =
  | "round-start"
  | "declaring"
  | "rolling"
  | "treasure-action"
  | "round-end"
  | "finished";

export interface DeepSeaGame {
  gameType: "deep-sea";
  status: DeepSeaPhase;
  round: number;
  air: number;
  path: PathSpace[];
  divers: Record<string, DeepSeaDiver>;
  turnOrder: string[];
  currentTurn: number;
  diceResult: [number, number] | null;
  lastAction: string | null;
  scores: Record<string, number>;              // running point totals (updated at round end)
  scoredThisRound: Record<string, { level: TreasureLevel; points: number }[]>;  // treasures scored this round (revealed at round end)
  airOutTurnsLeft: number | null;             // turns remaining after air hit 0 (null = air still positive)
  winner: string | null;
  finalScores: Record<string, number> | null;
  finalTreasures: Record<string, { level: TreasureLevel; points: number }[]> | null;
  tiebreaker: Record<string, number[]> | null;
}

export interface DeepSeaHand {
  carried: TreasureChip[];
  scored: TreasureChip[];
}

// ---- Take Time types ----

export type TakeTimeSegmentRuleType =
  | "color-count"
  | "card-count"
  | "value-range"
  | "no-values"
  | "turn-order"
  | "closest-to"
  | "max"
  | "min"
  | "color-max"
  | "color-min"
  | "last-play"
  | "draw"
  | "clockwise"
  | "counter-clockwise"
  | "blocked";

export interface TakeTimeSegmentRule {
  type: TakeTimeSegmentRuleType;
  whiteCount?: number;
  blackCount?: number;
  cardCount?: number;
  range?: [number, number];
  excludedValues?: number[];
  turnNumber?: number;
  targetValue?: number;
  color?: "black" | "white";
}

/** Rule that applies between two adjacent segments */
export interface TakeTimeBetweenRule {
  type: "min-diff" | "equal";
  /** Segment index of the first segment (rule applies between seg and seg+1, wrapping 6→1) */
  segment: number;
  /** For min-diff: the minimum difference required */
  minDiff?: number;
}

export interface TakeTimeLevelDef {
  chapter: number;
  test: number;
  clockRule: "normal" | "infinity" | "high-to-low" | "low-to-high" | "locked-order" | "two-per-segment" | "difference" | "max-spread";
  handAdjustable: boolean;
  startSegment: number;
  segmentRules: Record<number, TakeTimeSegmentRule[]>;
  specialRules?: string[];
  betweenRules?: TakeTimeBetweenRule[];
  /** For max-spread: max allowed difference between highest and lowest segment values */
  maxSpread?: number;
  /** For chapter X: hour hand starting segment */
  hourHand?: number;
  /** For chapter X: second hand starting segment (blocks this seg and seg+3) */
  secondHand?: number;
  /** Whether the clock hand rotates with board rotations (VIII-4) */
  handRotatesWithBoard?: boolean;
}

export interface TakeTimePlacedCard {
  cardId: string;
  color: "black" | "white";
  value: number;
  faceUp: boolean;
  playedBy: string;
  turnNumber: number;
  revealed: boolean;
}

export type TakeTimeStatus = "discussion" | "placement" | "resolution" | "pass" | "fail";

export interface TakeTimeGame {
  gameType: "take-time";
  status: TakeTimeStatus;
  chapter: number;
  test: number;
  levelDef: TakeTimeLevelDef;
  clockRotation: number;
  turnOrder: string[];
  currentTurn: number;
  firstPlayer: string | null;
  cardsPlayed: number;
  segments: Record<number, TakeTimePlacedCard[]>;
  faceUpRemaining: number;
  readyPlayers: Record<string, boolean>;
  revealIndex: number;
  twoPlayerRevealed: boolean;
  lastAction: string | null;
  /** Remaining deck for draw mechanic (VII) */
  deck?: TakeTimeCard[];
  /** Board rotation offset for clock rotation mechanic (VIII) */
  boardRotation?: number;
  /** Current second hand position for chapter X */
  secondHandPosition?: number;
  /** Track hand sizes for draw mechanic turn skipping */
  handSizes?: Record<string, number>;
  /** Per-player remaining solar (white) / lunar (black) counts. Public so all players see the breakdown. */
  handColorSizes?: Record<string, { white: number; black: number }>;
  /** Per-player hidden pile solar/lunar counts (2-player mode). */
  hiddenColorSizes?: Record<string, { white: number; black: number }>;
}

export interface TakeTimeCard {
  id: string;
  color: "black" | "white";
  value: number;
}

export interface TakeTimeHand {
  cards: TakeTimeCard[];
  hiddenCards?: TakeTimeCard[];
}

// ---- Fruit Boss types ----

export type FruitSuit =
  | "plum"
  | "apple"
  | "orange"
  | "tomato"
  | "watermelon"
  | "lemon"
  | "pear";

export type FruitCardKind = "fruit" | "star" | "cat";

export interface FruitCard {
  id: string;
  kind: FruitCardKind;
  /** Suit for fruit cards; stars and cats omit this until placed. */
  suit?: FruitSuit;
  /** Value 1-5 for fruits; 0 for star + cat. */
  value: number;
}

export interface FruitStack {
  id: string;
  cards: FruitCard[];
  /** Dominant suit of this stack. Null = star-only (pending assignment). */
  suit: FruitSuit | null;
}

export interface FruitScoreBreakdown {
  positive: { stackId: string; suit: FruitSuit; cardCount: number; topValue: number; points: number }[];
  negative: { stackId: string; suit: FruitSuit; cardCount: number; topValue: number; points: number }[];
  handPenalty: number;
  catEatenValue: number;
  total: number;
}

export interface FruitBossGame {
  gameType: "fruit-boss";
  status: "playing" | "fire-sale" | "round-end" | "finished";
  turnOrder: string[];
  currentTurn: number;
  /** Actions remaining on the current player's turn (0..2). Resets to 2 on turn start. */
  actionsLeft: 0 | 1 | 2;
  /** 5 stalls, indexed left to right. null = empty stall. */
  market: (FruitStack | null)[];
  /** Each player's private collection of stacks, sorted by score-value descending. */
  collections: Record<string, FruitStack[]>;
  /** Per-player pending star fruit cards awaiting assignment (when portfolio was empty on collect). */
  pendingStars: Record<string, FruitCard[]>;
  /** Remaining draw deck. Stored publicly for parity with Take Time. */
  deck: FruitCard[];
  /** Discard pile (toppled cards, eaten cards, etc). */
  discard: FruitCard[];
  fireSale: boolean;
  /** When set, this player triggered the round end by emptying their hand during fire sale; others get one more turn. */
  fireSaleEnder: string | null;
  /** Players who have taken their "one more turn" after fireSaleEnder. */
  fireSaleFinalTurnTaken: Record<string, boolean>;
  scores: Record<string, number> | null;
  scoringBreakdowns: Record<string, FruitScoreBreakdown> | null;
  winner: string | null;
  lastAction: string | null;
}

export interface FruitBossHand {
  cards: FruitCard[];
}

// ---- Startups types ----

export type StartupsCompany =
  | "giraffe"
  | "bowwow"
  | "flamingo"
  | "octo"
  | "hippo"
  | "emt";

export interface StartupsCard {
  id: string;            // e.g., "octo-3"
  company: StartupsCompany;
  number: number;        // 1..N — flavour for the "3/8 Octo Coffee" feel
}

export interface StartupsMarketStall {
  id: string;
  card: StartupsCard;
  /** Number of silver capital chips sitting on this card. */
  chips: number;
}

export interface StartupsRoundResult {
  /** Player UIDs sorted by final score, highest first. */
  ranking: string[];
  /** Per-player round chips earned this round: +2 (first), +1 (second), -1 (last). */
  awarded: Record<string, { plus2: number; plus1: number; minus1: number }>;
  /** Per-player final round score (silver + 3×gold). */
  scores: Record<string, number>;
}

export interface StartupsScoreBreakdown {
  /** Silver chips at end of game (before payout settlement). */
  startingSilver: number;
  perCompany: Partial<Record<
    StartupsCompany,
    {
      shares: number;
      isMajority: boolean;
      majorityHolder: string | null;
      /** Gold received from non-majority shareholders (only nonzero for majority holder). */
      goldReceived: number;
      /** Gold owed to majority holder (only nonzero for non-majority shareholders). */
      goldOwed: number;
    }
  >>;
  /** Silver chips remaining after settlement (may be 0 if all flipped to gold). */
  finalSilver: number;
  /** Gold chips after settlement. */
  finalGold: number;
  /** Total points (silver + 3×gold). */
  totalPoints: number;
}

export interface StartupsGame {
  gameType: "startups";
  status: "playing" | "round-end" | "finished";
  /** Whether the 4-round variant is enabled. */
  roundsEnabled: boolean;
  /** Current round (1-indexed). When roundsEnabled=false, always 1. */
  currentRound: number;
  /** Total rounds (4 if rounds variant, 1 otherwise). */
  totalRounds: number;
  turnOrder: string[];
  currentTurn: number;
  /** "take" first half of turn, "place" second half. */
  actionPhase: "take" | "place";
  /** If non-null, current player took from market this turn and can't return this company to market. */
  tookFromMarketCompany: StartupsCompany | null;
  market: StartupsMarketStall[];
  /** Deck stored on the game doc (private game state). */
  deck: StartupsCard[];
  /** 5 cards removed at setup (hidden, revealed at game end if you want; we keep them hidden). */
  removedCount: number;
  /** Public portfolios: cards each player has placed in front of them. */
  portfolios: Record<string, StartupsCard[]>;
  /** Public silver chip counts. */
  silver: Record<string, number>;
  /** Public gold chip counts. Only nonzero during/after payout. */
  gold: Record<string, number>;
  /** Public hand sizes. */
  handSizes: Record<string, number>;
  /** Current AM chip holder per company (null = no shares of this company played yet). */
  antiMonopoly: Record<StartupsCompany, string | null>;
  /** Round chips accumulated per player across rounds (only used when roundsEnabled). */
  roundChips: Record<string, { plus2: number; plus1: number; minus1: number }>;
  /** Per-round results history. */
  roundHistory: StartupsRoundResult[];
  /** Per-player scoring breakdown for the most recent round (rendered on the round-end / finished screen). */
  scoreBreakdowns: Record<string, StartupsScoreBreakdown> | null;
  /** Players who have acknowledged the round-end screen (continues to next round / game-over). */
  roundEndReady: Record<string, boolean>;
  /** Final winner UID. */
  winner: string | null;
  lastAction: string | null;
}

export interface StartupsHand {
  cards: StartupsCard[];
}
