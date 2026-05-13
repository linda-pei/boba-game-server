export type GameKey = "tir" | "scout" | "ww" | "oo" | "ds" | "tt" | "fb" | "su";

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
    badge: "co-op",
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
};

interface Props {
  game: GameKey;
  size?: number;
}

export default function GameIcon({ game, size = 44 }: Props) {
  switch (game) {
    case "tir":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="30" cy="35" r="20" className="nostroke" fill="var(--tir-red)" opacity="0.85" />
          <circle cx="50" cy="35" r="20" className="nostroke" fill="var(--tir-blue)" opacity="0.85" />
          <circle cx="40" cy="55" r="20" className="nostroke" fill="var(--tir-green)" opacity="0.85" />
          <circle cx="30" cy="35" r="20" fill="none" />
          <circle cx="50" cy="35" r="20" fill="none" />
          <circle cx="40" cy="55" r="20" fill="none" />
        </svg>
      );
    case "scout":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <g transform="translate(40 44)">
            <g transform="rotate(-22)">
              <rect x="-10" y="-22" width="20" height="40" rx="3" fill="var(--scout-card-2)" />
            </g>
            <g transform="rotate(-7)">
              <rect x="-10" y="-24" width="20" height="42" rx="3" fill="var(--scout-card-5)" />
            </g>
            <g transform="rotate(8)">
              <rect x="-10" y="-24" width="20" height="42" rx="3" fill="var(--scout-card-7)" />
            </g>
            <g transform="rotate(22)">
              <rect x="-10" y="-22" width="20" height="40" rx="3" fill="var(--scout-card-9)" />
            </g>
          </g>
        </svg>
      );
    case "ww":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="50" cy="30" r="18" fill="var(--ww-moon)" />
          <circle cx="44" cy="26" r="3.5" className="nostroke" fill="rgba(31,20,16,0.18)" />
          <circle cx="55" cy="34" r="2.5" className="nostroke" fill="rgba(31,20,16,0.18)" />
          <path
            d="M16 66 L20 44 L28 50 L32 38 L40 50 L48 38 L52 50 L60 44 L64 66 Z"
            fill="var(--ww-night)"
          />
          <circle cx="34" cy="56" r="2" className="nostroke" fill="var(--ww-moon)" />
          <circle cx="46" cy="56" r="2" className="nostroke" fill="var(--ww-moon)" />
        </svg>
      );
    case "oo":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <rect x="14" y="46" width="52" height="22" rx="4" fill="var(--oo-cafe)" />
          <rect x="18" y="34" width="44" height="14" rx="3" fill="var(--oo-cream)" />
          <path
            d="M40 8 L46 24 L62 26 L50 36 L54 52 L40 44 L26 52 L30 36 L18 26 L34 24 Z"
            fill="var(--honey-500)"
          />
        </svg>
      );
    case "ds":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="22" cy="18" r="4" fill="var(--pearl)" />
          <circle cx="14" cy="28" r="3" fill="var(--pearl)" />
          <circle cx="28" cy="30" r="2.5" fill="var(--pearl)" />
          <rect x="20" y="34" width="40" height="40" rx="20" fill="var(--ds-ocean)" />
          <rect x="32" y="42" width="16" height="10" rx="2" fill="var(--ww-moon)" />
          <circle cx="40" cy="47" r="2" className="nostroke" fill="var(--ds-ocean)" />
        </svg>
      );
    case "tt":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="40" cy="40" r="26" fill="var(--tt-cream)" />
          <path d="M40 40 L40 14 A26 26 0 0 1 62.52 27 Z" className="nostroke" fill="var(--tt-lunar)" />
          <path d="M40 40 L62.52 53 A26 26 0 0 1 40 66 Z" className="nostroke" fill="var(--tt-lunar)" />
          <path d="M40 40 L17.48 27 A26 26 0 0 1 40 14 Z" className="nostroke" fill="var(--tt-lunar)" />
          <g stroke="var(--ink)" strokeWidth="2" fill="none">
            <line x1="40" y1="40" x2="40" y2="14" />
            <line x1="40" y1="40" x2="62.52" y2="27" />
            <line x1="40" y1="40" x2="62.52" y2="53" />
            <line x1="40" y1="40" x2="40" y2="66" />
            <line x1="40" y1="40" x2="17.48" y2="53" />
            <line x1="40" y1="40" x2="17.48" y2="27" />
          </g>
          <circle cx="40" cy="40" r="26" fill="none" />
          <line x1="40" y1="40" x2="27" y2="23" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="40" r="2.5" className="nostroke" fill="var(--ink)" />
        </svg>
      );
    case "su":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          {/* Bowwow Games controller (top-left) */}
          <g transform="translate(2 6) scale(0.38)" fill="var(--su-bowwow)">
            <path className="nostroke" d="M22 38 q-12 -8 -8 -22 q4 -8 14 -4 q4 4 4 16 z" />
            <path className="nostroke" d="M78 38 q12 -8 8 -22 q-4 -8 -14 -4 q-4 4 -4 16 z" />
            <path
              className="nostroke"
              fillRule="evenodd"
              d="M16 40 q0 -8 8 -8 h52 q8 0 8 8 v24 q0 8 -8 8 h-52 q-8 0 -8 -8 z
                 M30 48 h6 v-6 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 z
                 M62 46 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
                 M70 56 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
            />
          </g>
          {/* Elephant Mars Travel helmet (top-right) */}
          <g transform="translate(42 2) scale(0.4)" fill="var(--su-emt)">
            <circle cx="50" cy="44" r="36" fill="none" stroke="var(--su-emt)" strokeWidth="4" className="nostroke" />
            <path className="nostroke" d="M18 76 q4 -8 16 -10 h32 q12 2 16 10 v10 h-64 z" />
            <ellipse className="nostroke" cx="30" cy="46" rx="9" ry="13" transform="rotate(-18 30 46)" />
            <ellipse className="nostroke" cx="70" cy="46" rx="9" ry="13" transform="rotate(18 70 46)" />
            <path
              className="nostroke"
              fillRule="evenodd"
              d="M50 24 q-16 0 -16 18 q0 10 6 14 q-2 8 1 14 q4 6 9 0 q2 -4 2 -8 q3 0 6 0 q0 4 2 8 q5 6 9 0 q3 -6 1 -14 q6 -4 6 -14 q0 -18 -16 -18 z
                 M44 40 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0
                 M51 40 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0"
            />
          </g>
          {/* Hippo Powertech head (bottom-center) */}
          <g transform="translate(14 34) scale(0.52)" fill="var(--su-hippo)">
            <ellipse cx="26" cy="34" rx="6" ry="8" className="nostroke" />
            <ellipse cx="74" cy="34" rx="6" ry="8" className="nostroke" />
            <path
              className="nostroke"
              fillRule="evenodd"
              d="M50 20 c-22 0 -32 14 -32 30 c0 18 14 32 32 32 c18 0 32 -14 32 -32 c0 -16 -10 -30 -32 -30 z
                 M56 32 L36 56 L48 56 L42 76 L66 50 L54 50 L60 32 Z"
            />
            <circle cx="42" cy="72" r="2.5" className="nostroke" />
            <circle cx="58" cy="72" r="2.5" className="nostroke" />
          </g>
        </svg>
      );
    case "fb":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          {/* Three overlapping fruits poking out above a woven market basket */}
          {/* Plum */}
          <circle cx="26" cy="32" r="11" className="nostroke" fill="var(--fb-plum)" />
          <circle cx="26" cy="32" r="11" fill="none" />
          {/* Apple */}
          <path
            d="M52 26 q-7 0 -8 7 q-1 9 8 12 q9 -3 8 -12 q-1 -7 -8 -7 z"
            fill="var(--fb-apple)"
          />
          {/* Tomato (front-center) */}
          <circle cx="40" cy="40" r="10" className="nostroke" fill="var(--fb-tomato)" />
          <circle cx="40" cy="40" r="10" fill="none" />
          <path
            d="M40 27 L43 32 L48 32 L44 35 L46 40 L40 37 L34 40 L36 35 L32 32 L37 32 Z"
            className="nostroke"
            fill="#4a8a3b"
          />
          {/* Basket — trapezoid with weave lines */}
          <path
            d="M14 48 L66 48 L60 70 L20 70 Z"
            fill="var(--syrup-300)"
          />
          <path d="M22 54 L58 54 M22 60 L58 60 M22 66 L58 66" fill="none" strokeWidth="1.8" />
          <path d="M30 48 L30 70 M40 48 L40 70 M50 48 L50 70" fill="none" strokeWidth="1.8" />
          {/* Basket rim */}
          <path d="M12 48 L68 48 L66 52 L14 52 Z" fill="var(--syrup-500)" />
        </svg>
      );
  }
}
