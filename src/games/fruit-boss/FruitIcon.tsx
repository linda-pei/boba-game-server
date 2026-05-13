import type { FruitSuit } from "../../types";

interface Props {
  suit: FruitSuit | "star" | "cat";
  size?: number;
  /** When true, drops shadows and outlines for very small inline use. */
  flat?: boolean;
}

/**
 * Hand-drawn sticker icons for each fruit suit, plus star fruit and cat.
 * Chunky black outlines + flat fills, matching the design-system iconography style.
 * viewBox is normalized to 0..40 with origin top-left.
 */
export default function FruitIcon({ suit, size = 24 }: Props) {
  const STROKE = "#1f1410";
  const sw = 2; // stroke-width in viewBox units
  const common = {
    viewBox: "0 0 40 40",
    width: size,
    height: size,
    style: { display: "block" as const },
  };

  switch (suit) {
    case "plum":
      return (
        <svg {...common}>
          <ellipse cx="20" cy="22" rx="13" ry="13" fill="var(--fb-plum)" stroke={STROKE} strokeWidth={sw} />
          <path d="M19 10 q1 -5 6 -6" fill="none" stroke="#2f5f30" strokeWidth={sw} strokeLinecap="round" />
          <path d="M25 5 q4 -1 5 3 q-3 3 -6 0 z" fill="#4a8a3b" stroke={STROKE} strokeWidth={sw - 0.4} />
          <path d="M14 17 q3 -2 6 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "apple":
      return (
        <svg {...common}>
          <path
            d="M20 12 q-9 0 -10 9 q-1 11 10 14 q11 -3 10 -14 q-1 -9 -10 -9 z"
            fill="var(--fb-apple)"
            stroke={STROKE}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M20 12 q0 -3 2 -5" fill="none" stroke={STROKE} strokeWidth={sw} strokeLinecap="round" />
          <path d="M22 9 q4 -3 7 -1 q-1 4 -5 4 q-2 0 -2 -3 z" fill="#4a8a3b" stroke={STROKE} strokeWidth={sw - 0.4} />
          <path d="M15 18 q3 -2 5 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "orange":
      return (
        <svg {...common}>
          <circle cx="20" cy="22" r="12.5" fill="var(--fb-orange)" stroke={STROKE} strokeWidth={sw} />
          <circle cx="20" cy="22" r="6.5" fill="none" stroke={STROKE} strokeWidth="1.2" />
          <line x1="20" y1="9.5" x2="20" y2="14.5" stroke={STROKE} strokeWidth="1.2" />
          <line x1="20" y1="29.5" x2="20" y2="34.5" stroke={STROKE} strokeWidth="1.2" />
          <line x1="7.5" y1="22" x2="13.5" y2="22" stroke={STROKE} strokeWidth="1.2" />
          <line x1="26.5" y1="22" x2="32.5" y2="22" stroke={STROKE} strokeWidth="1.2" />
          <path d="M18 7 q3 -3 7 -1 q-1 4 -5 4 q-3 0 -2 -3 z" fill="#4a8a3b" stroke={STROKE} strokeWidth={sw - 0.4} />
        </svg>
      );
    case "tomato":
      return (
        <svg {...common}>
          <circle cx="20" cy="23" r="13" fill="var(--fb-tomato)" stroke={STROKE} strokeWidth={sw} />
          {/* Star calyx */}
          <path
            d="M20 6 L23 11 L29 11 L24 14 L26 19 L20 16 L14 19 L16 14 L11 11 L17 11 Z"
            fill="#4a8a3b"
            stroke={STROKE}
            strokeWidth={sw - 0.4}
            strokeLinejoin="round"
          />
          <circle cx="20" cy="12" r="1.4" fill={STROKE} />
          <path d="M14 19 q3 -2 6 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "watermelon":
      return (
        <svg {...common}>
          {/* Wedge — rind, flesh, seeds */}
          <path d="M5 32 q15 -22 30 0 z" fill="var(--fb-watermelon)" stroke={STROKE} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M5 32 q15 -22 30 0" fill="none" stroke="#fff" strokeWidth="1.3" />
          <path d="M6.5 32 q14 -19 27 0" fill="none" stroke="#4a8a3b" strokeWidth="2.2" />
          {/* Seeds */}
          <ellipse cx="15" cy="26" rx="1.2" ry="1.8" fill={STROKE} />
          <ellipse cx="25" cy="26" rx="1.2" ry="1.8" fill={STROKE} />
          <ellipse cx="20" cy="22" rx="1.2" ry="1.8" fill={STROKE} />
        </svg>
      );
    case "lemon":
      return (
        <svg {...common}>
          <ellipse
            cx="20"
            cy="22"
            rx="10"
            ry="13"
            transform="rotate(-18 20 22)"
            fill="var(--fb-lemon)"
            stroke={STROKE}
            strokeWidth={sw}
          />
          {/* Tip nubs */}
          <circle cx="11" cy="13" r="1.5" fill="var(--fb-lemon)" stroke={STROKE} strokeWidth={sw - 0.4} />
          <circle cx="29" cy="31" r="1.5" fill="var(--fb-lemon)" stroke={STROKE} strokeWidth={sw - 0.4} />
          <path d="M14 17 q3 -2 6 0" fill="none" stroke="rgba(31,20,16,0.35)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "pear":
      return (
        <svg {...common}>
          <path
            d="M20 13 q-3 0 -4 4 q-1 4 -5 8 q-2 4 0 8 q3 4 9 4 q6 0 9 -4 q2 -4 0 -8 q-4 -4 -5 -8 q-1 -4 -4 -4 z"
            fill="var(--fb-pear)"
            stroke={STROKE}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M20 13 q0 -3 1 -5" fill="none" stroke={STROKE} strokeWidth={sw} strokeLinecap="round" />
          <path d="M21 8 q4 -2 6 0 q-2 3 -5 3 q-1 0 -1 -3 z" fill="#4a8a3b" stroke={STROKE} strokeWidth={sw - 0.4} />
          <path d="M15 22 q3 -2 5 0" fill="none" stroke="rgba(31,20,16,0.3)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          {/* 5-point star fruit */}
          <path
            d="M20 4 L24 16 L36 16 L26 23 L30 35 L20 28 L10 35 L14 23 L4 16 L16 16 Z"
            fill="var(--fb-star)"
            stroke={STROKE}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path
            d="M20 8 L22.5 16.5 L31 17 L23.5 21.5 L26 30 L20 25 L14 30 L16.5 21.5 L9 17 L17.5 16.5 Z"
            fill="none"
            stroke="rgba(31,20,16,0.45)"
            strokeWidth="0.8"
          />
        </svg>
      );
    case "cat":
      return (
        <svg {...common}>
          {/* Maneki-neko head: round white face with pink ears + waving paw vibe */}
          <path
            d="M9 13 L13 7 L17 13 Z"
            fill="#fff"
            stroke={STROKE}
            strokeWidth={sw - 0.4}
            strokeLinejoin="round"
          />
          <path
            d="M23 13 L27 7 L31 13 Z"
            fill="#fff"
            stroke={STROKE}
            strokeWidth={sw - 0.4}
            strokeLinejoin="round"
          />
          <ellipse cx="20" cy="22" rx="13" ry="12" fill="#fff" stroke={STROKE} strokeWidth={sw} />
          {/* Inner ear pink */}
          <path d="M11 11 L13 9 L15 11 Z" fill="#f7a8b3" stroke="none" />
          <path d="M25 11 L27 9 L29 11 Z" fill="#f7a8b3" stroke="none" />
          {/* Eyes */}
          <circle cx="15.5" cy="21" r="1.4" fill={STROKE} />
          <circle cx="24.5" cy="21" r="1.4" fill={STROKE} />
          {/* Nose + mouth */}
          <path d="M19 25 L21 25 L20 26 Z" fill={STROKE} />
          <path d="M20 26 q-2 2 -4 1 M20 26 q2 2 4 1" fill="none" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
          {/* Collar bell */}
          <circle cx="20" cy="33" r="1.8" fill="var(--fb-cat-bell)" stroke={STROKE} strokeWidth="1" />
        </svg>
      );
  }
}
