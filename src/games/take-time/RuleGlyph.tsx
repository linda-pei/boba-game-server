import { TT } from "./theme";
import type { TakeTimeSegmentRule, TakeTimeBetweenRule } from "../../types";

function describeRuleLong(rule: TakeTimeSegmentRule): string {
  switch (rule.type) {
    case "color-count": {
      const parts: string[] = [];
      if (rule.whiteCount) parts.push(`${rule.whiteCount} solar`);
      if (rule.blackCount) parts.push(`${rule.blackCount} lunar`);
      return parts.join(", ") + " card(s) only";
    }
    case "card-count":
      return `Exactly ${rule.cardCount} cards`;
    case "value-range":
      return rule.range![0] === rule.range![1]
        ? `Sum must equal ${rule.range![0]}`
        : `Sum between ${rule.range![0]}–${rule.range![1]}`;
    case "no-values":
      return `No cards of value ${rule.excludedValues!.join(", ")}`;
    case "turn-order":
      return `Must contain card played on turn ${rule.turnNumber}`;
    case "closest-to":
      return `Sum closest to ${rule.targetValue}`;
    case "max":
      return `Must contain the highest card`;
    case "min":
      return `Must contain the lowest card`;
    case "color-max":
      return `Must contain the highest ${rule.color === "black" ? "lunar" : "solar"} card`;
    case "color-min":
      return `Must contain the lowest ${rule.color === "black" ? "lunar" : "solar"} card`;
    case "last-play":
      return `Must contain the last card played`;
    case "draw":
      return `Draw a card from the deck when placing here`;
    case "clockwise":
      return `Rotate the clock clockwise when placing here`;
    case "counter-clockwise":
      return `Rotate the clock counter-clockwise when placing here`;
    case "blocked":
      return `Cannot place cards here directly`;
    default:
      return rule.type;
  }
}

// ---- Tiny helpers ----

function MiniCard({
  suit = "white",
  x = 0,
  y = 0,
  w = 10,
  h = 14,
  rot = 0,
  value,
  dim = false,
}: {
  suit?: "white" | "black" | "neutral";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rot?: number;
  value?: number;
  dim?: boolean;
}) {
  const bg = suit === "white" ? TT.solarPaperHi
    : suit === "black" ? TT.lunarDeep
    : TT.solarPaperLo;
  const fg = suit === "white" ? TT.ink
    : suit === "black" ? TT.goldGlow
    : TT.solarInk;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={dim ? 0.4 : 1}>
      <rect
        x={-w / 2} y={-h / 2} width={w} height={h} rx={1.6}
        fill={bg} stroke={TT.ink} strokeWidth="0.9"
      />
      {value != null && (
        <text
          x="0" y={h / 2 - h * 0.18} textAnchor="middle"
          fontFamily="'Cormorant Garamond', serif"
          fontWeight="600" fontSize={h * 0.6} fill={fg}
        >
          {value}
        </text>
      )}
    </g>
  );
}

function GlyphFrame({
  size = 44,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="-25 -25 50 50" width={size} height={size} style={{ display: "block" }}>
      <circle r="22" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.4" />
      <circle r="20" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      {children}
    </svg>
  );
}

// ---- Individual glyphs ----

const Glyphs: Record<string, React.FC<{ rule: GlyphRule; size: number }>> = {
  "color-exact": ({ rule, size }) => {
    const { white = 0, black = 0 } = rule;
    const cards: string[] = [];
    for (let i = 0; i < white; i++) cards.push("w");
    for (let i = 0; i < black; i++) cards.push("b");
    const N = cards.length;
    return (
      <GlyphFrame size={size}>
        {cards.map((c, i) => {
          const off = (i - (N - 1) / 2) * 9;
          return (
            <MiniCard
              key={i} suit={c === "w" ? "white" : "black"}
              x={off} y={2} w={11} h={15} rot={(i - (N - 1) / 2) * -4}
            />
          );
        })}
      </GlyphFrame>
    );
  },

  count: ({ rule, size }) => {
    const N = rule.n ?? 3;
    return (
      <GlyphFrame size={size}>
        {Array.from({ length: N }).map((_, i) => {
          const off = (i - (N - 1) / 2) * 9;
          return (
            <MiniCard
              key={i} suit="neutral"
              x={off} y={2} w={11} h={15} rot={(i - (N - 1) / 2) * -6}
            />
          );
        })}
      </GlyphFrame>
    );
  },

  "sum-range": ({ rule, size }) => (
    <GlyphFrame size={size}>
      <text
        x="0" y="-3" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
        fontWeight="600" fontSize="11" fill={TT.ink} style={{ fontStyle: "italic" }}
      >
        Σ
      </text>
      <text
        x="0" y="13" textAnchor="middle" fontFamily="Inter,sans-serif"
        fontWeight="700" fontSize="9" fill={TT.ink}
      >
        {rule.min}–{rule.max}
      </text>
    </GlyphFrame>
  ),

  "sum-exact": ({ rule, size }) => (
    <GlyphFrame size={size}>
      <text
        x="0" y="3" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
        fontWeight="600" fontSize="16" fill={TT.ink}
      >
        {rule.value}
      </text>
      <text
        x="0" y="14" textAnchor="middle" fontFamily="Inter,sans-serif"
        fontWeight="700" fontSize="6" fill={TT.goldDeep}
        style={{ letterSpacing: "0.1em" }}
      >
        SUM
      </text>
    </GlyphFrame>
  ),

  turn: ({ rule, size }) => (
    <GlyphFrame size={size}>
      <circle r="13" fill="none" stroke={TT.goldDeep} strokeWidth="0.8" />
      <path
        d="M 0 -13 A 13 13 0 0 1 11 -7"
        stroke={TT.goldMid} strokeWidth="2.2" fill="none" strokeLinecap="round"
      />
      <text
        x="0" y="4" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
        fontWeight="700" fontSize="14" fill={TT.ink}
      >
        T{rule.n}
      </text>
    </GlyphFrame>
  ),

  "turn-last": ({ size }) => (
    <GlyphFrame size={size}>
      <circle r="13" fill="none" stroke={TT.goldDeep} strokeWidth="0.8" />
      <path
        d="M 0 -13 A 13 13 0 1 1 -2 -13"
        stroke={TT.goldMid} strokeWidth="2.2" fill="none" strokeLinecap="round"
      />
      <polygon points="-4,-13 0,-9 -4,-5" fill={TT.goldMid} />
      <text
        x="0" y="5" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
        fontWeight="700" fontSize="9" fill={TT.ink}
      >
        LAST
      </text>
    </GlyphFrame>
  ),

  "closest-to": ({ rule, size }) => (
    <GlyphFrame size={size}>
      <text
        x="0" y="6" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
        fontWeight="700" fontSize="22" fill={TT.ink}
      >
        {rule.value}
      </text>
      <path
        d="M-18 0 L-12 0 M-15 -3 L-12 0 L-15 3"
        stroke={TT.goldMid} strokeWidth="1.8" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M18 0 L12 0 M15 -3 L12 0 L15 3"
        stroke={TT.goldMid} strokeWidth="1.8" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </GlyphFrame>
  ),

  "forbidden-values": ({ rule, size }) => {
    const v = rule.values || [];
    return (
      <GlyphFrame size={size}>
        {v.map((val, i) => {
          const off = (i - (v.length - 1) / 2) * 9;
          return (
            <g key={i} transform={`translate(${off} -2)`}>
              <text
                x="0" y="2" textAnchor="middle"
                fontFamily="'Cormorant Garamond',serif"
                fontWeight="600" fontSize="9" fill={TT.ink}
              >
                {val}
              </text>
            </g>
          );
        })}
        <circle r="15" fill="none" stroke={TT.red} strokeWidth="2.4" opacity="0.92" />
        <line
          x1="-11" y1="11" x2="11" y2="-11"
          stroke={TT.red} strokeWidth="2.4" strokeLinecap="round" opacity="0.92"
        />
      </GlyphFrame>
    );
  },

  "group-max": ({ size }) => (
    <GlyphFrame size={size}>
      <path
        d="M 0 -14 L 6 -8 L 2 -8 L 2 6 L -2 6 L -2 -8 L -6 -8 Z"
        fill={TT.goldMid} stroke={TT.ink} strokeWidth="0.7"
      />
      <text
        x="0" y="16" textAnchor="middle" fontFamily="Inter,sans-serif"
        fontWeight="800" fontSize="7" fill={TT.ink} style={{ letterSpacing: "0.1em" }}
      >
        MAX
      </text>
    </GlyphFrame>
  ),

  "group-min": ({ size }) => (
    <GlyphFrame size={size}>
      <path
        d="M 0 14 L 6 8 L 2 8 L 2 -6 L -2 -6 L -2 8 L -6 8 Z"
        fill={TT.goldMid} stroke={TT.ink} strokeWidth="0.7"
      />
      <text
        x="0" y="-9" textAnchor="middle" fontFamily="Inter,sans-serif"
        fontWeight="800" fontSize="7" fill={TT.ink} style={{ letterSpacing: "0.1em" }}
      >
        MIN
      </text>
    </GlyphFrame>
  ),

  "suit-max": ({ rule, size }) => (
    <GlyphFrame size={size}>
      <MiniCard suit={rule.suit} x={0} y={2} w={14} h={20} />
      <path
        d="M 0 -14 L 5 -9 L 2 -9 L 2 -5 L -2 -5 L -2 -9 L -5 -9 Z"
        fill={rule.suit === "white" ? TT.goldMid : TT.goldGlow}
        stroke={TT.ink} strokeWidth="0.6"
      />
    </GlyphFrame>
  ),

  "suit-min": ({ rule, size }) => (
    <GlyphFrame size={size}>
      <MiniCard suit={rule.suit} x={0} y={-2} w={14} h={20} />
      <path
        d="M 0 14 L 5 9 L 2 9 L 2 5 L -2 5 L -2 9 L -5 9 Z"
        fill={rule.suit === "white" ? TT.goldMid : TT.goldGlow}
        stroke={TT.ink} strokeWidth="0.6"
      />
    </GlyphFrame>
  ),

  draw: ({ size }) => (
    <GlyphFrame size={size}>
      {/* Stack of cards (deck) */}
      <MiniCard suit="neutral" x={-3} y={-1} w={11} h={15} rot={-3} />
      <MiniCard suit="neutral" x={0} y={-2} w={11} h={15} />
      {/* Arrow coming from deck */}
      <path
        d="M 6 4 L 14 4 L 14 0 L 19 6 L 14 12 L 14 8 L 6 8 Z"
        fill={TT.goldMid} stroke={TT.ink} strokeWidth="0.6"
      />
    </GlyphFrame>
  ),

  clockwise: ({ size }) => (
    <GlyphFrame size={size}>
      {/* Circular arrow clockwise */}
      <path
        d="M 0 -14 A 14 14 0 1 1 -10 10"
        fill="none" stroke={TT.goldMid} strokeWidth="2.5" strokeLinecap="round"
      />
      <polygon points="-14,6 -6,10 -10,14" fill={TT.goldMid} />
    </GlyphFrame>
  ),

  "counter-clockwise": ({ size }) => (
    <GlyphFrame size={size}>
      {/* Circular arrow counter-clockwise */}
      <path
        d="M 0 -14 A 14 14 0 1 0 10 10"
        fill="none" stroke={TT.goldMid} strokeWidth="2.5" strokeLinecap="round"
      />
      <polygon points="14,6 6,10 10,14" fill={TT.goldMid} />
    </GlyphFrame>
  ),

  blocked: ({ size }) => (
    <GlyphFrame size={size}>
      {/* X mark */}
      <line x1="-10" y1="-10" x2="10" y2="10" stroke={TT.red} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="10" y1="-10" x2="-10" y2="10" stroke={TT.red} strokeWidth="3.5" strokeLinecap="round" />
    </GlyphFrame>
  ),
};

// ---- Center glyphs (clock-wide rules) ----

const CenterGlyphs: Record<string, React.FC<{ size: number }>> = {
  "no-24-cap": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      <path
        d="M -16 0 C -16 -10 -6 -10 -6 0 C -6 10 -16 10 -16 0 Z
           M  16 0 C  16  10  6  10  6 0 C  6 -10  16 -10  16 0 Z
           M  -6 0 L 6 0"
        fill="none" stroke={TT.goldDeep} strokeWidth="3" strokeLinecap="round"
      />
      <path
        d="M -16 0 C -16 -10 -6 -10 -6 0 C -6 10 -16 10 -16 0 Z
           M  16 0 C  16  10  6  10  6 0 C  6 -10  16 -10  16 0 Z"
        fill="none" stroke={TT.goldMid} strokeWidth="1" strokeLinecap="round"
      />
    </svg>
  ),

  "no-faceup": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      <path
        d="M -18 0 Q 0 -14 18 0 Q 0 14 -18 0 Z"
        fill="none" stroke={TT.ink} strokeWidth="1.4"
      />
      <circle r="6" fill={TT.ink} />
      <circle r="2.5" fill={TT.goldGlow} />
      <line
        x1="-20" y1="20" x2="20" y2="-20"
        stroke={TT.red} strokeWidth="3.2" strokeLinecap="round"
      />
    </svg>
  ),

  "high-to-low": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      {/* Descending arrow: + to - */}
      <text x="-10" y="-6" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="14" fill={TT.ink}>+</text>
      <path d="M 0 -4 L 0 12" stroke={TT.goldMid} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="-5,8 0,15 5,8" fill={TT.goldMid} />
      <text x="10" y="12" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="14" fill={TT.ink}>−</text>
    </svg>
  ),

  "low-to-high": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      {/* Ascending arrow: - to + */}
      <text x="-10" y="-6" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="14" fill={TT.ink}>−</text>
      <path d="M 0 12 L 0 -4" stroke={TT.goldMid} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="-5,-1 0,-8 5,-1" fill={TT.goldMid} />
      <text x="10" y="12" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="14" fill={TT.ink}>+</text>
    </svg>
  ),

  "locked-order": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      {/* Lock icon */}
      <rect x="-10" y="-2" width="20" height="14" rx="2" fill={TT.goldMid} stroke={TT.ink} strokeWidth="1" />
      <path d="M -6 -2 L -6 -8 A 6 6 0 0 1 6 -8 L 6 -2" fill="none" stroke={TT.ink} strokeWidth="2" strokeLinecap="round" />
      {/* Arrow */}
      <path d="M 12 5 L 20 5" stroke={TT.ink} strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="18,2 22,5 18,8" fill={TT.ink} />
    </svg>
  ),

  "two-per-segment": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      <MiniCard suit="neutral" x={-7} y={0} w={12} h={17} rot={-4} />
      <MiniCard suit="neutral" x={7} y={0} w={12} h={17} rot={4} />
    </svg>
  ),

  difference: ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      <MiniCard suit="neutral" x={-9} y={0} w={11} h={15} />
      <text x="0" y="4" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="14" fill={TT.ink}>−</text>
      <MiniCard suit="neutral" x={9} y={0} w={11} h={15} />
    </svg>
  ),

  "max-spread": ({ size }) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.5" />
      <circle r="23" fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />
      {/* Double-headed arrow with number */}
      <path d="M -16 0 L 16 0" stroke={TT.goldMid} strokeWidth="2" strokeLinecap="round" />
      <polygon points="-16,-4 -22,0 -16,4" fill={TT.goldMid} />
      <polygon points="16,-4 22,0 16,4" fill={TT.goldMid} />
      <text x="0" y="-8" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontWeight="700" fontSize="12" fill={TT.ink}>
        ≤4
      </text>
    </svg>
  ),
};

// ---- Adapter: app rule type → glyph props ----

interface GlyphRule {
  type: string;
  white?: number;
  black?: number;
  n?: number;
  min?: number;
  max?: number;
  value?: number;
  values?: number[];
  suit?: "white" | "black";
}

export function mapRuleToGlyph(rule: TakeTimeSegmentRule): GlyphRule {
  switch (rule.type) {
    case "color-count":
      return {
        type: "color-exact",
        white: rule.whiteCount ?? 0,
        black: rule.blackCount ?? 0,
      };
    case "card-count":
      return { type: "count", n: rule.cardCount };
    case "value-range": {
      const [lo, hi] = rule.range!;
      return lo === hi
        ? { type: "sum-exact", value: lo }
        : { type: "sum-range", min: lo, max: hi };
    }
    case "no-values":
      return { type: "forbidden-values", values: rule.excludedValues };
    case "turn-order":
      return { type: "turn", n: rule.turnNumber };
    case "last-play":
      return { type: "turn-last" };
    case "closest-to":
      return { type: "closest-to", value: rule.targetValue };
    case "max":
      return { type: "group-max" };
    case "min":
      return { type: "group-min" };
    case "color-max":
      return { type: "suit-max", suit: rule.color };
    case "color-min":
      return { type: "suit-min", suit: rule.color };
    case "draw":
      return { type: "draw" };
    case "clockwise":
      return { type: "clockwise" };
    case "counter-clockwise":
      return { type: "counter-clockwise" };
    case "blocked":
      return { type: "blocked" };
    default:
      return { type: rule.type };
  }
}

// ---- Public components ----

export function RuleGlyph({
  rule,
  size = 44,
}: {
  rule: TakeTimeSegmentRule;
  size?: number;
}) {
  const glyphRule = mapRuleToGlyph(rule);
  const G = Glyphs[glyphRule.type];
  const tooltip = describeRuleLong(rule);
  if (!G) {
    return (
      <div className="tt-glyph-tip" data-tip={tooltip}>
        <GlyphFrame size={size}>
          <text
            x="0" y="4" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="700" fontSize="8" fill={TT.red}
          >
            ?
          </text>
        </GlyphFrame>
      </div>
    );
  }
  return (
    <div className="tt-glyph-tip" data-tip={tooltip}>
      <G rule={glyphRule} size={size} />
    </div>
  );
}

export type CenterGlyphType =
  | "no-24-cap"
  | "no-faceup"
  | "high-to-low"
  | "low-to-high"
  | "locked-order"
  | "two-per-segment"
  | "difference"
  | "max-spread";

export function CenterGlyph({
  type,
  size = 80,
}: {
  type: CenterGlyphType;
  size?: number;
}) {
  const G = CenterGlyphs[type];
  if (!G) return null;
  return <G size={size} />;
}

// ---- Between-segment rule glyph ----

function describeBetweenRule(rule: TakeTimeBetweenRule): string {
  const seg2 = (rule.segment % 6) + 1;
  if (rule.type === "min-diff") {
    return `Difference between segments ${rule.segment} and ${seg2} must be ≥ ${rule.minDiff}`;
  }
  return `Segments ${rule.segment} and ${seg2} must be equal`;
}

export function BetweenRuleGlyph({
  rule,
  size = 32,
}: {
  rule: TakeTimeBetweenRule;
  size?: number;
}) {
  const tooltip = describeBetweenRule(rule);
  return (
    <div className="tt-glyph-tip" data-tip={tooltip}>
      <svg viewBox="-18 -18 36 36" width={size} height={size} style={{ display: "block" }}>
        <circle r="15" fill={TT.solarPaperHi} stroke={TT.ink} strokeWidth="1.2" />
        <circle r="13.5" fill="none" stroke={TT.goldDeep} strokeWidth="0.5" />
        {rule.type === "min-diff" ? (
          <>
            {/* Double-headed arrow with min diff number */}
            <path
              d="M -9 2 L 9 2"
              stroke={TT.goldMid} strokeWidth="1.8" strokeLinecap="round"
            />
            <polygon points="-9,-1 -13,2 -9,5" fill={TT.goldMid} />
            <polygon points="9,-1 13,2 9,5" fill={TT.goldMid} />
            <text
              x="0" y="-3" textAnchor="middle"
              fontFamily="'Cormorant Garamond',serif"
              fontWeight="700" fontSize="10" fill={TT.ink}
            >
              ≥{rule.minDiff}
            </text>
          </>
        ) : (
          <>
            {/* Equals sign */}
            <line x1="-7" y1="-3" x2="7" y2="-3" stroke={TT.ink} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-7" y1="3" x2="7" y2="3" stroke={TT.ink} strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}
