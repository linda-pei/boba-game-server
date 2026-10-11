/** Game identity shared by icons, stickers, banners and the lobby. */
export type GameKey = "tir" | "scout" | "ww" | "oo" | "ds" | "tt" | "fb" | "su" | "clover" | "rt";

export type GameMode = "co-op" | "competitive";

export interface GameMetaEntry {
  id: string;
  name: string;
  tagline: string;
  players: string;
  badge: string;
  /** Used by the lobby filters. Things in Rings supports both. */
  modes: GameMode[];
  minPlayers: number;
  maxPlayers: number;
}

export const GAME_META: Record<GameKey, GameMetaEntry> = {
  tir: {
    id: "things-in-rings",
    name: "Things in Rings",
    tagline: "Deduce the secret categories.",
    players: "3–7 players",
    badge: "deduction",
    modes: ["co-op", "competitive"],
    minPlayers: 3,
    maxPlayers: 7,
  },
  scout: {
    id: "scout",
    name: "Scout",
    tagline: "Play sets to dump your hand fast.",
    players: "3–5 players",
    badge: "tactical",
    modes: ["competitive"],
    minPlayers: 3,
    maxPlayers: 5,
  },
  ww: {
    id: "werewords",
    name: "Werewords",
    tagline: "Guess the secret word. Spot the wolf.",
    players: "4–11 players",
    badge: "social",
    modes: ["competitive"],
    minPlayers: 4,
    maxPlayers: 11,
  },
  oo: {
    id: "order-overload",
    name: "Order Overload",
    tagline: "Race the clock. Sort the orders.",
    players: "2–6 players",
    badge: "co-op memory",
    modes: ["co-op"],
    minPlayers: 2,
    maxPlayers: 6,
  },
  ds: {
    id: "deep-sea",
    name: "Deep Sea Adventure",
    tagline: "Push your luck. Don't lose the air.",
    players: "2–6 players",
    badge: "push-your-luck",
    modes: ["competitive"],
    minPlayers: 2,
    maxPlayers: 6,
  },
  tt: {
    id: "take-time",
    name: "Take Time",
    tagline: "Co-op puzzle. Read the clock. Place the card.",
    players: "2–4 players",
    badge: "co-op puzzle",
    modes: ["co-op"],
    minPlayers: 2,
    maxPlayers: 4,
  },
  fb: {
    id: "fruit-boss",
    name: "Fruit Boss",
    tagline: "Stack fruits. Topple rivals. Score the market.",
    players: "2–4 players",
    badge: "set collection",
    modes: ["competitive"],
    minPlayers: 2,
    maxPlayers: 4,
  },
  su: {
    id: "startups",
    name: "Startups",
    tagline: "Corner the market. Cash in the shares.",
    players: "3–6 players",
    badge: "share holding",
    modes: ["competitive"],
    minPlayers: 3,
    maxPlayers: 6,
  },
  clover: {
    id: "clover",
    name: "Clover",
    tagline: "Write the link. Rebuild the Clover.",
    players: "3–6 players",
    badge: "co-op word play",
    modes: ["co-op"],
    minPlayers: 3,
    maxPlayers: 6,
  },
  rt: {
    id: "robotrick",
    name: "Robotrick",
    tagline: "Outwit Droco. Salvage the best robots.",
    players: "3 players",
    badge: "trick-taking",
    modes: ["competitive"],
    minPlayers: 3,
    maxPlayers: 3,
  },
};

export const GAME_ID_TO_KEY: Record<string, GameKey> = {
  "things-in-rings": "tir",
  scout: "scout",
  werewords: "ww",
  "order-overload": "oo",
  "deep-sea": "ds",
  "take-time": "tt",
  "fruit-boss": "fb",
  startups: "su",
  clover: "clover",
  robotrick: "rt",
};
