/** Game identity shared by icons, stickers, banners and the lobby. */
export type GameKey = "tir" | "scout" | "ww" | "oo" | "ds" | "tt" | "fb" | "su" | "clover" | "rt";

export const GAME_META: Record<
  GameKey,
  { id: string; name: string; tagline: string; players: string; badge: string }
> = {
  tir: {
    id: "things-in-rings",
    name: "Things in Rings",
    tagline: "Deduce the secret categories.",
    players: "3–7 players",
    badge: "deduction",
  },
  scout: {
    id: "scout",
    name: "Scout",
    tagline: "Play sets to dump your hand fast.",
    players: "3–5 players",
    badge: "tactical",
  },
  ww: {
    id: "werewords",
    name: "Werewords",
    tagline: "Guess the secret word. Spot the wolf.",
    players: "4–11 players",
    badge: "social",
  },
  oo: {
    id: "order-overload",
    name: "Order Overload",
    tagline: "Race the clock. Sort the orders.",
    players: "2–6 players",
    badge: "co-op memory",
  },
  ds: {
    id: "deep-sea",
    name: "Deep Sea Adventure",
    tagline: "Push your luck. Don't lose the air.",
    players: "2–6 players",
    badge: "push-your-luck",
  },
  tt: {
    id: "take-time",
    name: "Take Time",
    tagline: "Co-op puzzle. Read the clock. Place the card.",
    players: "2–4 players",
    badge: "co-op puzzle",
  },
  fb: {
    id: "fruit-boss",
    name: "Fruit Boss",
    tagline: "Stack fruits. Topple rivals. Score the market.",
    players: "2–4 players",
    badge: "set collection",
  },
  su: {
    id: "startups",
    name: "Startups",
    tagline: "Corner the market. Cash in the shares.",
    players: "3–6 players",
    badge: "share holding",
  },
  clover: {
    id: "clover",
    name: "Clover",
    tagline: "Write the link. Rebuild the Clover.",
    players: "3–6 players",
    badge: "co-op word play",
  },
  rt: {
    id: "robotrick",
    name: "Robotrick",
    tagline: "Outwit Droco. Salvage the best robots.",
    players: "3 players",
    badge: "trick-taking",
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
