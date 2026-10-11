import type { GameKey } from "./gameMeta";

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
          {/* Fan of two-tone Scout cards, numbers at opposite corners like the real deck */}
          <g transform="translate(40 44)">
            <g transform="rotate(-32)">
              <rect x="-14.0" y="-19" width="28" height="38" rx="3.5" fill="var(--scout-card-body)" />
              <rect x="-12.5" y="-17.5" width="25" height="17.5" rx="2.5" className="nostroke" fill="var(--scout-card-2)" />
              <rect x="-12.5" y="0.0" width="25" height="17.5" rx="2.5" className="nostroke" fill="var(--scout-card-9)" />
            </g>
            <g transform="rotate(-11)">
              <rect x="-14.0" y="-21" width="28" height="40" rx="3.5" fill="var(--scout-card-body)" />
              <rect x="-12.5" y="-19.5" width="25" height="18.5" rx="2.5" className="nostroke" fill="var(--scout-card-5)" />
              <rect x="-12.5" y="-1.0" width="25" height="18.5" rx="2.5" className="nostroke" fill="var(--scout-card-8)" />
            </g>
            <g transform="rotate(11)">
              <rect x="-14.0" y="-21" width="28" height="40" rx="3.5" fill="var(--scout-card-body)" />
              <rect x="-12.5" y="-19.5" width="25" height="18.5" rx="2.5" className="nostroke" fill="var(--scout-card-10)" />
              <rect x="-12.5" y="-1.0" width="25" height="18.5" rx="2.5" className="nostroke" fill="var(--scout-card-4)" />
            </g>
            <g transform="rotate(32)">
              <rect x="-14.0" y="-19" width="28" height="38" rx="3.5" fill="var(--scout-card-body)" />
              <rect x="-12.5" y="-17.5" width="25" height="17.5" rx="2.5" className="nostroke" fill="var(--scout-card-7)" />
              <rect x="-12.5" y="0.0" width="25" height="17.5" rx="2.5" className="nostroke" fill="var(--scout-card-3)" />
              <text x="-7.0" y="-10" className="scout-icon-num">7</text>
              <text x="7.0" y="10" className="scout-icon-num" transform="rotate(180 7.0 10)">3</text>
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
          {/* Watch crown */}
          <rect x="35" y="5" width="10" height="6" rx="1.5" fill="var(--tt-lunar)" />
          {/* Bezel + face */}
          <circle cx="40" cy="42" r="30" fill="var(--tt-lunar)" />
          <circle cx="40" cy="42" r="25" fill="var(--tt-cream)" />
          {/* Hour ticks — heavier at 12/3/6/9 */}
          <g transform="translate(0 2)">
            <line x1="40.00" y1="21.00" x2="40.00" y2="16.00" className="tt-tick tt-tick--major" />
            <line x1="50.50" y1="21.81" x2="52.00" y2="19.22" className="tt-tick" />
            <line x1="58.19" y1="29.50" x2="60.78" y2="28.00" className="tt-tick" />
            <line x1="59.00" y1="40.00" x2="64.00" y2="40.00" className="tt-tick tt-tick--major" />
            <line x1="58.19" y1="50.50" x2="60.78" y2="52.00" className="tt-tick" />
            <line x1="50.50" y1="58.19" x2="52.00" y2="60.78" className="tt-tick" />
            <line x1="40.00" y1="59.00" x2="40.00" y2="64.00" className="tt-tick tt-tick--major" />
            <line x1="29.50" y1="58.19" x2="28.00" y2="60.78" className="tt-tick" />
            <line x1="21.81" y1="50.50" x2="19.22" y2="52.00" className="tt-tick" />
            <line x1="21.00" y1="40.00" x2="16.00" y2="40.00" className="tt-tick tt-tick--major" />
            <line x1="21.81" y1="29.50" x2="19.22" y2="28.00" className="tt-tick" />
            <line x1="29.50" y1="21.81" x2="28.00" y2="19.22" className="tt-tick" />
          </g>
          {/* Hands: hour → ~10, minute → ~2 */}
          <line x1="40" y1="42" x2="30" y2="35" className="tt-hand tt-hand--hour" />
          <line x1="40" y1="42" x2="54" y2="27" className="tt-hand" />
          <circle cx="40" cy="42" r="3" className="nostroke" fill="var(--tt-lunar)" />
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
          <path d="M22 54 L58 54 M22 60 L58 60 M22 66 L58 66" fill="none" className="tt-tick" />
          <path d="M30 48 L30 70 M40 48 L40 70 M50 48 L50 70" fill="none" className="tt-tick" />
          {/* Basket rim */}
          <path d="M12 48 L68 48 L66 52 L14 52 Z" fill="var(--syrup-500)" />
        </svg>
      );
    case "clover":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          <path d="M40 41 C24 36 21 16 34 13 C44 11 49 22 40 41 Z" fill="var(--jade-300)" />
          <path d="M40 41 C44 25 62 19 67 31 C72 43 55 50 40 41 Z" fill="var(--jade-500)" />
          <path d="M40 41 C56 45 59 63 47 68 C35 73 28 56 40 41 Z" fill="var(--jade-300)" />
          <path d="M40 41 C34 57 16 60 12 48 C8 36 25 31 40 41 Z" fill="var(--jade-500)" />
          <path d="M40 41 C40 51 38 59 31 66" fill="none" stroke="var(--jade-700)" className="tt-tick tt-tick--major" />
          <circle cx="40" cy="41" r="5.5" fill="var(--honey-500)" />
        </svg>
      );
    case "rt":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          {/* Droco: a boxy robot head with antenna, visor eyes and a card-type grille */}
          <line x1="40" y1="8" x2="40" y2="18" />
          <circle cx="40" cy="8" r="4" fill="var(--rt-d)" />
          <rect x="12" y="34" width="6" height="16" rx="2" fill="var(--rt-steel-dark)" />
          <rect x="62" y="34" width="6" height="16" rx="2" fill="var(--rt-steel-dark)" />
          <rect x="17" y="18" width="46" height="46" rx="9" fill="var(--rt-steel)" />
          <rect x="24" y="28" width="32" height="13" rx="6" fill="var(--rt-steel-dark)" />
          <circle cx="33" cy="34.5" r="3.5" className="nostroke" fill="var(--rt-c)" />
          <circle cx="47" cy="34.5" r="3.5" className="nostroke" fill="var(--rt-c)" />
          <rect x="25" y="49" width="7" height="8" rx="1.5" className="nostroke" fill="var(--rt-a)" />
          <rect x="32.5" y="49" width="7" height="8" rx="1.5" className="nostroke" fill="var(--rt-b)" />
          <rect x="40" y="49" width="7" height="8" rx="1.5" className="nostroke" fill="var(--rt-c)" />
          <rect x="47.5" y="49" width="7" height="8" rx="1.5" className="nostroke" fill="var(--rt-d)" />
        </svg>
      );
    case "bb":
      return (
        <svg className="gicon" viewBox="0 0 80 80" width={size} height={size}>
          {/* A round bomb with a lit fuse, and three wires: blue, yellow, red */}
          <path d="M52 22 Q60 12 68 14" fill="none" />
          <circle cx="69" cy="13" r="4" className="nostroke" fill="var(--bb-spark)" />
          <rect x="44" y="20" width="12" height="9" rx="2" fill="var(--bb-shell-dark)" transform="rotate(30 50 24)" />
          <circle cx="38" cy="46" r="24" fill="var(--bb-shell)" />
          <circle cx="30" cy="38" r="5" className="nostroke" fill="rgba(255,255,255,0.35)" />
          <path d="M20 54 C30 46 44 62 56 50" fill="none" className="bb-wire bb-wire--blue" />
          <path d="M18 46 C30 40 42 52 58 42" fill="none" className="bb-wire bb-wire--yellow" />
          <path d="M22 62 C32 56 44 68 54 58" fill="none" className="bb-wire bb-wire--red" />
        </svg>
      );
  }
}
