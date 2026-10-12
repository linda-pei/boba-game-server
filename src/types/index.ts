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
  /** Take Time: gain an extra reminder token each time you fail a test (max 3). */
  bonusTokensEnabled?: boolean;
  /** Robotrick: 4 face-up hangar slots instead of 3 (rulebook-recommended for new players). */
  robotrickMoreHangars?: boolean;
  /** Robotrick: reuse round 1's AI card for all three rounds. */
  robotrickFixedAiCard?: boolean;
  /** Bomb Busters: mission to play next (1–8). */
  bombBustersMission?: number;
  /** Bomb Busters: missions this room has won. */
  bombBustersCompleted?: number[];
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
  /** Whether the bonus-token-on-fail setting is enabled for this game. */
  bonusTokensEnabled?: boolean;
  /** Extra reminder tokens earned by failing (capped at 3). Added to faceUpRemaining at setup. */
  bonusTokens?: number;
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
  /** 5 cards removed at setup. Hidden during play; revealed one-by-one at round end. */
  removedCards: StartupsCard[];
  /** How many of the removed cards have been flipped face-up during the round-end reveal. */
  revealedRemovedCount: number;
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

// ---- Clover types ----

export type CloverPhase =
  | "clue-writing"
  | "waiting-for-clues"
  | "solving-first"
  | "solving-final"
  | "board-result"
  | "finished";

export type CloverSlot = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type CloverRotation = 0 | 90 | 180 | 270;
export type CloverClueZone = "top" | "right" | "bottom" | "left";

export interface CloverCard {
  id: string;
  words: [string, string, string, string];
}

export interface CloverPlacement {
  slot: CloverSlot;
  rotation: CloverRotation;
}

export interface CloverPrivateBoard {
  ownerUid: string;
  sourceCards: CloverCard[];
  candidateCards: CloverCard[];
  answerPlacement: Record<string, CloverPlacement>;
  clues: Record<CloverClueZone, string>;
  submittedAt: number | null;
}

export interface CloverPublishedRound {
  spectatorUid: string;
  clues: Record<CloverClueZone, string>;
  candidateCards: CloverCard[];
  /** Shared starting rotation for each candidate card while it sits in the tray. */
  trayRotations?: Record<string, CloverRotation>;
}

export interface CloverSharedRound {
  spectatorUid: string;
  clues: Record<CloverClueZone, string>;
  candidateCards: CloverCard[];
  trayRotations?: Record<string, CloverRotation>;
  sharedPlacement: Record<string, CloverPlacement>;
  lockedCorrectCardIds: string[];
  attempt: 1 | 2;
  isLockedForVerification: boolean;
}

export interface CloverBoardResult {
  score: number;
  firstAttemptPerfect: boolean;
  correctCardIds: string[];
  /** Revealed once the board is resolved (absent on boards resolved before this was stored). */
  answerPlacement?: Record<string, CloverPlacement>;
  guessPlacement?: Record<string, CloverPlacement>;
}

export interface CloverGame {
  gameType: "clover";
  phase: CloverPhase;
  playerOrder: string[];
  activeSpectatorUid: string | null;
  activeDecisionMakerUid: string | null;
  submittedClueUids: string[];
  completedSpectatorUids: string[];
  publishedRounds: Record<string, CloverPublishedRound>;
  activeRound: CloverSharedRound | null;
  teamScore: number;
  boardResults: Record<string, CloverBoardResult>;
  lastAction: string | null;
}

// ---- Robotrick types ----

export type RobotrickType = "A" | "B" | "C" | "D";

export interface RobotrickCard {
  /** e.g. "B11" */
  id: string;
  type: RobotrickType;
  strength: number;
  vp: number;
}

/** A human uid, or "droco" for the automated fourth seat. */
export type RobotrickSeat = string;

export type RobotrickCriterion = "high" | "low" | "long" | "short";
export type RobotrickColumn = "lead" | "follow" | "unfollow";

export interface RobotrickAiCard {
  id: number;
  lead: [RobotrickCriterion, RobotrickCriterion?];
  follow: [RobotrickCriterion, RobotrickCriterion?];
  unfollow: [RobotrickCriterion, RobotrickCriterion?];
}

export interface RobotrickPlay {
  seat: RobotrickSeat;
  card: RobotrickCard;
}

export type RobotrickPhase = "passing" | "playing" | "trick-result" | "round-end" | "finished";

export interface RobotrickGame {
  gameType: "robotrick";
  phase: RobotrickPhase;
  round: number;
  /** Humans, host first, clockwise. */
  playerOrder: string[];
  /** The four seats this round, with Droco inserted per the rulebook's seating. */
  seatOrder: RobotrickSeat[];
  options: { hangars: number; fixedAiCard: boolean };
  aiCardId: number;
  /** The flipped card; its type is trump for the round. */
  trump: RobotrickCard;
  drocoHand: RobotrickCard[];
  passSubmitted: string[];
  trickNumber: number;
  leader: RobotrickSeat;
  turn: RobotrickSeat;
  currentTrick: RobotrickPlay[];
  /** Why Droco played its card in the current trick (null until it has played). */
  drocoReason: string | null;
  lastTrick: { plays: RobotrickPlay[]; winner: RobotrickSeat; drocoReason: string | null } | null;
  /** Face-up captured cards (score +). */
  hangars: Record<string, RobotrickCard[]>;
  /** Face-down cards (score −). */
  penalties: Record<string, RobotrickCard[]>;
  handCounts: Record<string, number>;
  /** One entry per finished round, per uid. */
  roundScores: Record<string, number[]>;
  lastAction: string | null;
}

export interface RobotrickHand {
  ownerUid: string;
  cards: RobotrickCard[];
  /** The 2 cards this player passed (kept for display until the round ends). */
  passOut: RobotrickCard[] | null;
  /** Cards passed to this player; merged into `cards` on their first play. */
  incoming: RobotrickCard[];
}

// ---- Bomb Busters types ----

export type BBColor = "blue" | "red" | "yellow";

/** One wire tile. Blue sortKey = its value (1–12); red is n.5, yellow n.1 (used only for sorting). */
export interface BBWire {
  id: string;
  color: BBColor;
  sortKey: number;
}

/** A wire in a player's hand; positions never change, cut wires stay in place face up. */
export interface BBHandWire extends BBWire {
  cut: boolean;
}

/** What a Dual Cut names: a blue value 1–12, or "yellow". Red is never named. */
export type BBDeclared = number | "yellow";

export interface BBInfoToken {
  color: "blue" | "yellow";
  /** Blue value shown on the token (undefined for a yellow token). */
  value?: number;
}

/** Public view of one slot on someone's stand. */
export interface BBPublicSlot {
  cut: boolean;
  /** Set once the wire is cut (or revealed). */
  revealed?: { color: BBColor; sortKey: number };
  info?: BBInfoToken;
}

export interface BBWireDraw {
  count: number;
  /** "count out of outOf": outOf candidates are revealed, count go into play unseen. */
  outOf?: number;
  /** Limit candidates to this sortKey range (e.g. 1.5–9.5). */
  from?: number;
  to?: number;
}

/** A mission's special rule: a registered rule module id plus its parameters. */
export interface BBRuleRef {
  id: string;
  params?: Record<string, number | string | boolean>;
}

export interface BBMission {
  id: number;
  name: string;
  subtitle: string;
  blue: { from: number; to: number };
  red: BBWireDraw;
  yellow: BBWireDraw;
  /** `falseBottom` adds equipment #13 (False Bottom) to the pool (missions 9+). */
  equipment: { count: "players" | 0; exclude?: number[]; falseBottom?: boolean };
  twoPlayer?: { red?: BBWireDraw; yellow?: BBWireDraw };
  rules: BBRuleRef[];
}

/** A red/yellow marker on the board: a value that is (or might be) in play. */
export interface BBMarker {
  color: "red" | "yellow";
  sortKey: number;
  /** True for "N out of M" candidates: this value might not be in play. */
  uncertain: boolean;
}

/** Double = character card; Triple (#3) and Super (#5) are equipment. */
export type BBDetector = "none" | "double" | "triple" | "super";

/** A ≠ (#1) or = (#12) label between two adjacent wires of one player (`at` = left wire's flat index). */
export interface BBLabel {
  uid: string;
  at: number;
  kind: "neq" | "eq";
}

export type BBPhase = "setup-info" | "playing" | "resolving" | "mission-won" | "mission-lost";

/**
 * A Dual Cut in progress. Stands are owner-only, so it resolves in two steps:
 * the target's client checks the pointed wire(s) ("dual-cut"); on success the active
 * player's client turns up their own matching wire ("own-cut").
 */
export type BBPendingAction =
  | {
      kind: "dual-cut";
      by: string;
      target: string;
      /** Flat slot indices across the target's stands: 1, or 2/3/all with a detector. */
      slots: number[];
      declared: BBDeclared;
      /** Second value from the X or Y Ray (#10). */
      alsoDeclared?: BBDeclared;
      detector: BBDetector;
    }
  | { kind: "own-cut"; by: string; declared: BBDeclared }
  /** Mission 13: wires picked on other stands; each owner's client checks (and cuts) its own. */
  | { kind: "red-alert"; by: string; picks: { uid: string; slot: number }[]; confirmed: string[] };

export interface BBGame {
  gameType: "bomb-busters";
  missionId: number;
  phase: BBPhase;
  /** Clockwise from the captain. */
  playerOrder: string[];
  captain: string;
  /** Per player, one entry per stand (wrapped: Firestore can't store nested arrays). */
  stands: Record<string, { slots: BBPublicSlot[] }[]>;
  turn: string;
  /** Players who have placed their setup info token(s) (everyone places at once). */
  setupDone: string[];
  /** How many setup info tokens each player has placed so far (some rules allow more than one). */
  setupPlaced?: Record<string, number>;
  /** Setup info tokens a player couldn't place (no matching wire), shown face up beside their stand. */
  besideTokens?: Record<string, number>;
  dial: { wrongGuesses: number; limit: number };
  markers: BBMarker[];
  wireTotals: { blue: Record<string, number>; red: number; yellow: number };
  cutCounts: { blue: Record<string, number>; red: number; yellow: number };
  validated: number[];
  equipment: { id: number; unlocked: boolean; used: boolean }[];
  characters: Record<string, { used: boolean }>;
  pendingAction: BBPendingAction | null;
  labels: BBLabel[];
  /** General Radar (#8) in progress: each player's client answers from its own stand. */
  radar: { by: string; value: number; answers: Record<string, boolean | null> } | null;
  /** Stabilizer (#9) is active for the current player's Dual Cut. */
  stabilized: boolean;
  /** Walkie-Talkies (#2): `by` has handed a wire to `to`, who must hand one back. */
  pendingSwap: { by: string; to: string; fromSlot: number; stage: "await-target" | "await-return" } | null;
  /** Per-rule state, keyed by rule id; each rule module owns and types its own entry. */
  ruleState: Record<string, unknown>;
  log: { at: number; text: string }[];
  result: { outcome: "won" | "lost"; reason: string } | null;
}

export interface BBHand {
  ownerUid: string;
  /** One entry per stand, sorted ascending by sortKey; mirrors the public slots. */
  stands: { wires: BBHandWire[] }[];
  /** Walkie-Talkies: a wire handed to this player, merged into their stand by their own client. */
  incoming?: BBWire[];
}
