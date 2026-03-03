export interface Player {
  name: string;
  order: number;
}

export interface RoomSettings {
  numRings: number;
  knower?: string;
  mode?: "competitive" | "coop";
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
