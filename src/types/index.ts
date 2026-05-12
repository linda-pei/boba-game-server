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
  | "last-play";

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

export interface TakeTimeLevelDef {
  chapter: number;
  test: number;
  clockRule: "normal" | "infinity";
  handAdjustable: boolean;
  startSegment: number;
  segmentRules: Record<number, TakeTimeSegmentRule[]>;
  specialRules?: string[];
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
