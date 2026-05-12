import type { TakeTimePlacedCard, TakeTimeSegmentRule } from "../../types";
import { RuleGlyph, CenterGlyph } from "./RuleGlyph";
import CardSlot from "./CardSlot";
import { TT } from "./theme";

interface Props {
  segments: Record<number, TakeTimePlacedCard[]>;
  segmentRules: Record<number, TakeTimeSegmentRule[]>;
  clockRotation: number;
  clockRule: "normal" | "infinity";
  chapter?: number;
  test?: number;
  specialRules?: string[];
  highlightSegment?: number | null;
  revealedUpTo?: number;
  showSums?: boolean;
  interactive?: boolean;
  onSegmentClick?: (segIndex: number) => void;
}

// SVG viewBox dimensions
const VB = 500;
const CX = VB / 2;
const CY = VB / 2;
const R = 180;       // outer dial radius
const RINNER = 56;   // hub radius
const RRIM = R + 14; // outer rim band

const SEGMENT_COUNT = 6;
const ANGLE_STEP = (2 * Math.PI) / SEGMENT_COUNT;

const toRoman = (n: number) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? String(n);

function getWedgePath(i: number): string {
  const a0 = (i * 60 - 90) * Math.PI / 180;
  const a1 = ((i + 1) * 60 - 90) * Math.PI / 180;
  const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
  const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
  return `M${CX},${CY} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`;
}

const segFill = (i: number) => i % 2 === 0 ? "#F2E2BA" : "#EBD7A4";

export default function ClockDisplay({
  segments,
  segmentRules,
  clockRotation,
  clockRule,
  chapter,
  test,
  specialRules,
  highlightSegment,
  revealedUpTo,
  showSums,
  interactive,
  onSegmentClick,
}: Props) {
  const handDeg = clockRotation * 60;
  const handLen = R - 6;

  // For card/glyph positioning outside the SVG
  // Container is sized by CSS; we use percentage-based positioning
  const hasCenterRule = clockRule === "infinity" || specialRules?.includes("no-faceup");
  const centerRuleType = clockRule === "infinity" ? "no-24-cap" as const
    : specialRules?.includes("no-faceup") ? "no-faceup" as const
    : null;

  return (
    <div className="tt-board-container">
      {/* SVG clock face */}
      <div className="tt-clock-container">
        <svg viewBox={`0 0 ${VB} ${VB}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="tt-dial" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FBF3DE" />
              <stop offset="75%" stopColor="#EAD8A8" />
              <stop offset="100%" stopColor="#D9BE7F" />
            </radialGradient>
            <radialGradient id="tt-hub" cx="40%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#FCF6E3" />
              <stop offset="100%" stopColor="#D9BE7F" />
            </radialGradient>
            <linearGradient id="tt-hand-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TT.goldGlow} />
              <stop offset="50%" stopColor={TT.goldMid} />
              <stop offset="100%" stopColor={TT.goldDeep} />
            </linearGradient>
          </defs>

          {/* Outer rim band */}
          <circle cx={CX} cy={CY} r={RRIM} fill={TT.goldLight} stroke={TT.ink} strokeWidth="2" />
          <circle cx={CX} cy={CY} r={RRIM - 2.5} fill="none" stroke={TT.goldDeep} strokeWidth="0.6" />

          {/* Tick marks around rim */}
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * 6 - 90) * Math.PI / 180;
            const isMajor = i % 5 === 0;
            const x0 = CX + (RRIM - 1) * Math.cos(a);
            const y0 = CY + (RRIM - 1) * Math.sin(a);
            const x1 = CX + (RRIM - (isMajor ? 7 : 3.5)) * Math.cos(a);
            const y1 = CY + (RRIM - (isMajor ? 7 : 3.5)) * Math.sin(a);
            return (
              <line
                key={i} x1={x0} y1={y0} x2={x1} y2={y1}
                stroke={TT.ink} strokeWidth={isMajor ? 1.2 : 0.5}
                opacity={isMajor ? 0.9 : 0.55}
              />
            );
          })}

          {/* Dial face */}
          <circle cx={CX} cy={CY} r={R} fill="url(#tt-dial)" stroke={TT.ink} strokeWidth="1.4" />

          {/* 6 segment wedges */}
          {Array.from({ length: 6 }).map((_, i) => {
            const seg = i + 1;
            const isHighlighted = highlightSegment === seg || highlightSegment === -1;
            const revealOrder = ((seg - 1 - clockRotation + 600) % 6);
            const isNext = revealedUpTo !== undefined && revealOrder === revealedUpTo;

            return (
              <path
                key={i}
                d={getWedgePath(i)}
                fill={
                  isHighlighted
                    ? "rgba(201,147,57,0.2)"
                    : isNext
                    ? "rgba(201,147,57,0.1)"
                    : segFill(i)
                }
                stroke={TT.goldDeep}
                strokeWidth="1"
                className={[
                  "tt-segment",
                  interactive ? "tt-segment-interactive" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => interactive && onSegmentClick?.(seg)}
              />
            );
          })}

          {/* Radial dividers */}
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i * 60 - 90) * Math.PI / 180;
            const x = CX + R * Math.cos(a);
            const y = CY + R * Math.sin(a);
            return (
              <line
                key={i} x1={CX} y1={CY} x2={x} y2={y}
                stroke={TT.ink} strokeWidth="1.4" opacity="0.55"
              />
            );
          })}

          {/* Segment numbers near rim edge */}
          {Array.from({ length: 6 }).map((_, i) => {
            const mid = ((i + 0.5) * 60 - 90) * Math.PI / 180;
            const nx = CX + (R - 14) * Math.cos(mid);
            const ny = CY + (R - 14) * Math.sin(mid);
            return (
              <text
                key={i} x={nx} y={ny + 2} textAnchor="middle"
                fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="11"
                fill={TT.ink} opacity="0.55"
              >
                {i + 1}
              </text>
            );
          })}

          {/* Rule glyphs inside segments */}
          {Array.from({ length: 6 }).map((_, i) => {
            const seg = i + 1;
            const rules = segmentRules[seg] || [];
            if (rules.length === 0) return null;
            const mid = ((i + 0.5) * 60 - 90) * Math.PI / 180;
            const glyphR = (R + RINNER) / 2; // midpoint between hub and rim
            const gx = CX + glyphR * Math.cos(mid);
            const gy = CY + glyphR * Math.sin(mid);
            const glyphSize = 48;
            const totalH = rules.length * (glyphSize + 4) - 4;
            return (
              <foreignObject
                key={`glyph-${seg}`}
                x={gx - glyphSize / 2}
                y={gy - totalH / 2}
                width={glyphSize}
                height={totalH + 4}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {rules.map((r, j) => (
                    <RuleGlyph key={j} rule={r} size={glyphSize} />
                  ))}
                </div>
              </foreignObject>
            );
          })}

          {/* Hub */}
          <circle cx={CX} cy={CY} r={RINNER + 4} fill={TT.ink} />
          <circle cx={CX} cy={CY} r={RINNER} fill="url(#tt-hub)" stroke={TT.goldDeep} strokeWidth="1" />
          <circle cx={CX} cy={CY} r={RINNER - 6} fill="none" stroke={TT.goldDeep} strokeWidth="0.5" />

          {/* Hub content: center glyph or chapter/test */}
          {centerRuleType ? (
            <foreignObject x={CX - 30} y={CY - 30} width={60} height={60}>
              <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CenterGlyph type={centerRuleType} size={56} />
              </div>
            </foreignObject>
          ) : (
            <>
              {chapter && (
                <text
                  x={CX} y={CY - 6} textAnchor="middle"
                  fontFamily="'Cormorant Garamond', serif" fontWeight="500" fontSize="11"
                  fill={TT.solarInk} opacity="0.65" style={{ letterSpacing: "0.18em" }}
                >
                  {toRoman(chapter)}
                </text>
              )}
              {test && (
                <text
                  x={CX} y={CY + 22} textAnchor="middle"
                  fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="30"
                  fill={TT.solarInk}
                >
                  {test}
                </text>
              )}
            </>
          )}

          {/* Clock hand — rotates to point at starting segment */}
          <g
            style={{
              transform: `rotate(${handDeg}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform .7s cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            <path
              d={`M${CX} ${CY - handLen}
                  L${CX - 7} ${CY - handLen + 18}
                  L${CX - 3} ${CY - handLen + 18}
                  L${CX - 3} ${CY + 10}
                  L${CX + 3} ${CY + 10}
                  L${CX + 3} ${CY - handLen + 18}
                  L${CX + 7} ${CY - handLen + 18} Z`}
              fill="url(#tt-hand-grad)" stroke={TT.ink} strokeWidth="1"
            />
            <circle cx={CX} cy={CY - handLen + 30} r="5" fill={TT.goldGlow} stroke={TT.ink} strokeWidth="0.8" />
            <circle cx={CX} cy={CY} r="9" fill={TT.ink} />
            <circle cx={CX} cy={CY} r="5" fill={TT.goldMid} />
            <circle cx={CX} cy={CY} r="1.5" fill={TT.ink} />
          </g>
        </svg>
      </div>

      {/* Card slots — positioned outside the clock */}
      <div className="tt-slots-overlay">
        {[1, 2, 3, 4, 5, 6].map((seg) => {
          const cards = segments[seg] || [];
          if (cards.length === 0) return null;
          const angle = (seg - 0.5) * 60; // midpoint of segment
          const rad = (angle - 90) * Math.PI / 180;
          // Distance from center as percentage of container
          // Pull lower-half cards closer to avoid overlapping the hand
          const sinVal = Math.sin(rad);
          const dist = sinVal > 0.25 ? 36 : 42; // closer for bottom segments
          const x = 50 + dist * Math.cos(rad);
          const y = 50 + dist * Math.sin(rad);

          const revealOrder = ((seg - 1 - clockRotation + 600) % 6);
          const segRevealed = revealedUpTo !== undefined && revealOrder < revealedUpTo;
          const sum = cards.reduce((a, c) => a + c.value, 0);

          return (
            <div
              key={seg}
              className="tt-card-slot"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <CardSlot cards={cards} angle={angle} revealed={segRevealed} />
              {showSums && segRevealed && cards.length > 0 && (
                <div className="tt-sum-badge">Σ{sum}</div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
