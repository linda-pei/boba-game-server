import { useEffect, useRef, useState } from "react";
import type { TakeTimePlacedCard, TakeTimeSegmentRule, TakeTimeBetweenRule, TakeTimeLevelDef } from "../../types";
import { RuleGlyph, CenterGlyph, BetweenRuleGlyph, type CenterGlyphType } from "./RuleGlyph";
import CardSlot from "./CardSlot";
import { TT } from "./theme";
import { describeClockRule } from "./levels";

interface Props {
  segments: Record<number, TakeTimePlacedCard[]>;
  segmentRules: Record<number, TakeTimeSegmentRule[]>;
  clockRotation: number;
  clockRule: TakeTimeLevelDef["clockRule"];
  maxSpread?: number;
  chapter?: number;
  test?: number;
  specialRules?: string[];
  highlightSegment?: number | null;
  revealedUpTo?: number;
  showSums?: boolean;
  interactive?: boolean;
  onSegmentClick?: (segIndex: number) => void;
  playerNames?: Record<string, string>;
  uid?: string;
  blockedSegments?: Set<number>;
  boardRotation?: number;
  secondHandPosition?: number;
  hourHand?: number;
  betweenRules?: TakeTimeBetweenRule[];
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
  playerNames,
  uid,
  blockedSegments,
  boardRotation,
  secondHandPosition,
  hourHand,
  betweenRules,
  maxSpread,
}: Props) {
  // Cumulative hand angle: when clockRotation wraps (5 → 0), animate +60° clockwise
  // rather than -300° backwards. Tracks the shortest signed delta across renders.
  const [handDeg, setHandDeg] = useState(() => clockRotation * 60);
  const lastRotRef = useRef(clockRotation);
  useEffect(() => {
    if (lastRotRef.current === clockRotation) return;
    let delta = clockRotation - lastRotRef.current;
    if (delta > 3) delta -= 6;
    if (delta < -3) delta += 6;
    setHandDeg((prev) => prev + delta * 60);
    lastRotRef.current = clockRotation;
  }, [clockRotation]);

  // Same shortest-path treatment for the second hand (level X) which also wraps 6 → 1
  const [secondHandDeg, setSecondHandDeg] = useState(() =>
    secondHandPosition !== undefined ? (secondHandPosition - 0.5) * 60 : 0
  );
  const lastSecondRef = useRef(secondHandPosition);
  useEffect(() => {
    if (secondHandPosition === undefined) return;
    if (lastSecondRef.current === undefined) {
      setSecondHandDeg((secondHandPosition - 0.5) * 60);
      lastSecondRef.current = secondHandPosition;
      return;
    }
    if (lastSecondRef.current === secondHandPosition) return;
    let delta = secondHandPosition - lastSecondRef.current;
    if (delta > 3) delta -= 6;
    if (delta < -3) delta += 6;
    setSecondHandDeg((prev) => prev + delta * 60);
    lastSecondRef.current = secondHandPosition;
  }, [secondHandPosition]);
  const handLen = R - 6;

  // For card/glyph positioning outside the SVG
  // Container is sized by CSS; we use percentage-based positioning
  const clockRuleToCenterGlyph: Record<string, CenterGlyphType> = {
    infinity: "no-24-cap",
    "high-to-low": "high-to-low",
    "low-to-high": "low-to-high",
    "locked-order": "locked-order",
    "two-per-segment": "two-per-segment",
    difference: "difference",
    "max-spread": "max-spread",
  };
  let centerRuleType: CenterGlyphType | null = clockRuleToCenterGlyph[clockRule] ?? null;
  let centerTooltip: string | undefined = describeClockRule(clockRule, maxSpread) ?? undefined;
  if (!centerRuleType && specialRules?.includes("no-faceup")) {
    centerRuleType = "no-faceup";
    centerTooltip = "No cards may be played face-up this test.";
  } else if (centerRuleType && specialRules?.includes("no-faceup")) {
    centerTooltip = (centerTooltip ? centerTooltip + " " : "") + "No cards may be played face-up this test.";
  }

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

          {/* Rotating clock face: wedges, dividers, segment numbers */}
          <g
            style={{
              transform: `rotate(${(boardRotation ?? 0) * 60}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform .6s cubic-bezier(.34,1.56,.64,1)",
            }}
            pointerEvents="none"
          >
            {/* 6 segment wedges (decorative) */}
            {Array.from({ length: 6 }).map((_, i) => (
              <path
                key={i}
                d={getWedgePath(i)}
                fill={segFill(i)}
                stroke={TT.goldDeep}
                strokeWidth="1"
              />
            ))}

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
                  fontFamily="'Cormorant Garamond', serif" fontWeight="700" fontSize="26"
                  fill={TT.ink} opacity="0.6"
                >
                  {i + 1}
                </text>
              );
            })}
          </g>

          {/* Interactive click targets (fixed at physical positions) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const seg = i + 1;
            const isBlocked = blockedSegments?.has(seg);
            const isHighlighted = !isBlocked && (highlightSegment === seg || highlightSegment === -1);
            const revealOrder = ((seg - 1 - clockRotation + 600) % 6);
            const isNext = revealedUpTo !== undefined && revealOrder === revealedUpTo;
            const segInteractive = interactive && !isBlocked;

            return (
              <path
                key={`click-${i}`}
                d={getWedgePath(i)}
                fill={
                  isBlocked
                    ? "rgba(120,100,80,0.35)"
                    : isHighlighted
                    ? "rgba(201,147,57,0.2)"
                    : isNext
                    ? "rgba(201,147,57,0.1)"
                    : "transparent"
                }
                stroke="none"
                className={[
                  "tt-segment",
                  segInteractive ? "tt-segment-interactive" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => segInteractive && onSegmentClick?.(seg)}
              />
            );
          })}

          {/* Rule glyphs rendered as HTML overlay below */}

          {/* Hub */}
          <circle cx={CX} cy={CY} r={RINNER + 4} fill={TT.ink} />
          <circle cx={CX} cy={CY} r={RINNER} fill="url(#tt-hub)" stroke={TT.goldDeep} strokeWidth="1" />
          <circle cx={CX} cy={CY} r={RINNER - 6} fill="none" stroke={TT.goldDeep} strokeWidth="0.5" />

          {/* Center glyph is rendered as HTML overlay (below) so tooltips work without SVG clipping. */}

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
          {/* Hour hand (X) — a shorter, thicker hand */}
          {hourHand !== undefined && (() => {
            const hourDeg = (hourHand - 1) * 60;
            const hourLen = R * 0.55;
            return (
              <g
                style={{
                  transform: `rotate(${hourDeg}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                }}
              >
                <path
                  d={`M${CX} ${CY - hourLen}
                      L${CX - 5} ${CY - hourLen + 14}
                      L${CX - 4} ${CY - hourLen + 14}
                      L${CX - 4} ${CY + 6}
                      L${CX + 4} ${CY + 6}
                      L${CX + 4} ${CY - hourLen + 14}
                      L${CX + 5} ${CY - hourLen + 14} Z`}
                  fill={TT.goldDeep} stroke={TT.ink} strokeWidth="0.8" opacity="0.7"
                />
              </g>
            );
          })()}

          {/* Second hand (X) — thin red hand blocking two opposite segments */}
          {secondHandPosition !== undefined && (() => {
            return (
              <g
                style={{
                  transform: `rotate(${secondHandDeg}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: "transform .5s cubic-bezier(.34,1.56,.64,1)",
                }}
              >
                {/* Line through center, both directions */}
                <line
                  x1={CX} y1={CY - R + 10}
                  x2={CX} y2={CY + R - 10}
                  stroke="#C44" strokeWidth="2" opacity="0.7"
                />
                <circle cx={CX} cy={CY - R + 10} r="4" fill="#C44" opacity="0.7" />
                <circle cx={CX} cy={CY + R - 10} r="4" fill="#C44" opacity="0.7" />
              </g>
            );
          })()}
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
          const dist = 37;
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
              <CardSlot cards={cards} angle={angle} revealed={segRevealed} playerNames={playerNames} uid={uid} />
              {showSums && segRevealed && cards.length > 0 && (
                <div className="tt-sum-badge">Σ{sum}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rule glyph overlays — HTML so CSS tooltips work */}
      {/* Glyphs are defined by logical segment but rotate with the board */}
      <div className="tt-slots-overlay">
        {/* Center glyph (clock-wide rule) — sits over the hub */}
        {centerRuleType && (
          <div className="tt-glyph-slot tt-center-glyph-slot" style={{ left: "50%", top: "50%" }}>
            <CenterGlyph type={centerRuleType} size={56} tooltip={centerTooltip} />
          </div>
        )}
        {[1, 2, 3, 4, 5, 6].map((logicalSeg) => {
          const rules = segmentRules[logicalSeg] || [];
          if (rules.length === 0) return null;
          // Map logical segment to physical position accounting for board rotation
          const physicalSeg = ((logicalSeg - 1 + (boardRotation ?? 0) + 600) % 6) + 1;
          const angle = (physicalSeg - 0.5) * 60;
          const rad = (angle - 90) * Math.PI / 180;
          // Position inside the wedge, between hub and rim
          const dist = 18;
          const x = 50 + dist * Math.cos(rad);
          const y = 50 + dist * Math.sin(rad);
          return (
            <div
              key={`glyph-${logicalSeg}`}
              className="tt-glyph-slot"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {rules.map((r, j) => (
                <RuleGlyph key={j} rule={r} size={56} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Between-segment rule glyphs — positioned on the rim at divider lines */}
      {betweenRules && betweenRules.length > 0 && (
        <div className="tt-slots-overlay">
          {betweenRules.map((br, i) => {
            // The divider between logical seg N and N+1 sits at angle N*60°
            // Account for board rotation
            const physicalDivider = ((br.segment - 1 + (boardRotation ?? 0) + 600) % 6) + 1;
            const angle = physicalDivider * 60; // divider is at the end of the segment
            const rad = (angle - 90) * Math.PI / 180;
            // Place at the rim edge (between inner glyphs and outer card slots)
            const dist = 28;
            const x = 50 + dist * Math.cos(rad);
            const y = 50 + dist * Math.sin(rad);
            return (
              <div
                key={`between-${i}`}
                className="tt-glyph-slot"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <BetweenRuleGlyph rule={br} size={32} />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
