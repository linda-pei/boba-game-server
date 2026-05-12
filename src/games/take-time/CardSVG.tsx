import { useId } from "react";
import { TT } from "./theme";

interface CardProps {
  suit: "solar" | "lunar";
  value?: number;
  faceUp?: boolean;
  w?: number;
  h?: number;
  tilt?: number;
  lift?: number;
}

export default function CardSVG({
  suit,
  value = 1,
  faceUp = true,
  w = 120,
  h = 168,
  tilt = 0,
  lift = 0,
}: CardProps) {
  if (!faceUp) return <CardBack suit={suit} w={w} h={h} tilt={tilt} lift={lift} />;

  const isSolar = suit === "solar";
  const bg = isSolar ? TT.solarPaper : TT.lunarDeep;
  const bgHi = isSolar ? TT.solarPaperHi : TT.lunarMid;
  const bgLo = isSolar ? TT.solarPaperLo : "#06122A";
  const numCol = isSolar ? "#5E4220" : TT.goldLight;
  const cornerCol = isSolar ? "#6A4824" : TT.goldLight;
  const goldA = isSolar ? TT.goldMid : TT.goldLight;
  const goldB = isSolar ? TT.goldDeep : TT.goldGlow;
  const mist = isSolar ? TT.solarMist : "#1E3F73";

  const rawId = useId();
  const cardId = rawId.replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 140"
      width={w}
      height={h}
      aria-label={`${suit} ${value}`}
      style={{
        display: "block",
        filter: "drop-shadow(2px 4px 0 rgba(15,10,5,0.22))",
        transform: `translateY(${-lift}px) rotate(${tilt}deg)`,
        transformOrigin: "50% 100%",
        transition: "transform .3s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <defs>
        <radialGradient id={`bg-${cardId}`} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor={bgHi} />
          <stop offset="65%" stopColor={bg} />
          <stop offset="100%" stopColor={bgLo} />
        </radialGradient>
        <linearGradient id={`gold-${cardId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={goldA} />
          <stop offset="100%" stopColor={goldB} />
        </linearGradient>
        <pattern
          id={`stars-${cardId}`}
          x="0" y="0" width="20" height="22"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="4" r="0.4" fill={TT.goldLight} opacity="0.55" />
          <circle cx="14" cy="9" r="0.3" fill={TT.goldLight} opacity="0.4" />
          <circle cx="8" cy="17" r="0.45" fill={TT.goldLight} opacity="0.6" />
          <circle cx="17" cy="19" r="0.25" fill={TT.goldLight} opacity="0.35" />
        </pattern>
        <pattern
          id={`mist-${cardId}`}
          x="0" y="0" width="34" height="34"
          patternUnits="userSpaceOnUse"
        >
          <ellipse
            cx="10" cy="14" rx="11" ry="3.5"
            fill={mist} opacity={isSolar ? "0.45" : "0.25"}
          />
          <ellipse
            cx="24" cy="24" rx="9" ry="3"
            fill={mist} opacity={isSolar ? "0.35" : "0.2"}
          />
        </pattern>
        <clipPath id={`clip-${cardId}`}>
          <rect x="0" y="0" width="100" height="140" rx="7" />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${cardId})`}>
        {/* base */}
        <rect width="100" height="140" fill={`url(#bg-${cardId})`} />
        {/* atmospheric wash */}
        <rect width="100" height="140" fill={`url(#mist-${cardId})`} opacity="0.7" />
        {/* star field (lunar only) */}
        {!isSolar && (
          <rect width="100" height="140" fill={`url(#stars-${cardId})`} />
        )}

        {/* top decorative band */}
        <g fill={`url(#gold-${cardId})`} opacity="0.95">
          <path d="M0 22 Q50 8 100 22 L100 26 Q50 12 0 26 Z" />
          <path
            d="M0 30 Q50 18 100 30"
            stroke={goldA} strokeWidth="0.4" fill="none" opacity="0.7"
          />
          {[16, 28, 40, 50, 60, 72, 84].map((x, i) => (
            <circle key={i} cx={x} cy={i === 3 ? 16 : 18} r={i === 3 ? 1.4 : 0.7} fill={goldA} />
          ))}
          {/* central rosette */}
          <g transform="translate(50 18)">
            <circle r="2.2" fill="none" stroke={goldA} strokeWidth="0.5" />
            <circle r="0.8" fill={goldB} />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a} x1="0" y1="-3" x2="0" y2="-4"
                stroke={goldA} strokeWidth="0.4" transform={`rotate(${a})`}
              />
            ))}
          </g>
        </g>

        {/* bottom decorative band */}
        <g fill={`url(#gold-${cardId})`} opacity="0.95">
          <path d="M0 118 Q50 132 100 118 L100 114 Q50 128 0 114 Z" />
          <path
            d="M0 110 Q50 122 100 110"
            stroke={goldA} strokeWidth="0.4" fill="none" opacity="0.7"
          />
          {[16, 28, 40, 50, 60, 72, 84].map((x, i) => (
            <circle key={i} cx={x} cy={i === 3 ? 124 : 122} r={i === 3 ? 1.4 : 0.7} fill={goldA} />
          ))}
          <g transform="translate(50 122)">
            <circle r="2.2" fill="none" stroke={goldA} strokeWidth="0.5" />
            <circle r="0.8" fill={goldB} />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a} x1="0" y1="-3" x2="0" y2="-4"
                stroke={goldA} strokeWidth="0.4" transform={`rotate(${a})`}
              />
            ))}
          </g>
        </g>

        {/* central numeral */}
        <text
          x="50" y="82" textAnchor="middle"
          fontFamily="'Cormorant Garamond', 'Bricolage Grotesque', serif"
          fontWeight="600" fontSize="48"
          fill={numCol} style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </text>

        {/* corner numerals */}
        <text
          x="8" y="14" textAnchor="start"
          fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="10"
          fill={cornerCol}
        >
          {value}
        </text>
        <g transform="translate(92 126) rotate(180)">
          <text
            x="0" y="0" textAnchor="start"
            fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="10"
            fill={cornerCol}
          >
            {value}
          </text>
        </g>

        {/* inner gold border */}
        <rect
          x="2.5" y="2.5" width="95" height="135" rx="5"
          fill="none" stroke={goldA} strokeWidth="0.6" opacity="0.8"
        />
      </g>

      {/* outer ink border */}
      <rect
        x="0.6" y="0.6" width="98.8" height="138.8" rx="7"
        fill="none" stroke={TT.ink} strokeWidth="1.2"
      />
    </svg>
  );
}

function CardBack({
  suit,
  w = 120,
  h = 168,
  tilt = 0,
  lift = 0,
}: {
  suit: "solar" | "lunar";
  w?: number;
  h?: number;
  tilt?: number;
  lift?: number;
}) {
  const isSolar = suit === "solar";
  const bgHi = isSolar ? TT.solarPaperHi : TT.lunarMid;
  const bg = isSolar ? TT.solarPaper : TT.lunarDeep;
  const bgLo = isSolar ? TT.solarPaperLo : "#06122A";
  const goldA = isSolar ? TT.goldMid : TT.goldLight;

  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 140"
      width={w}
      height={h}
      aria-label={`${suit} card back`}
      style={{
        display: "block",
        filter: "drop-shadow(2px 4px 0 rgba(15,10,5,0.22))",
        transform: `translateY(${-lift}px) rotate(${tilt}deg)`,
        transformOrigin: "50% 100%",
        transition: "transform .3s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <defs>
        <radialGradient id={`bgb-${id}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={bgHi} />
          <stop offset="70%" stopColor={bg} />
          <stop offset="100%" stopColor={bgLo} />
        </radialGradient>
        <clipPath id={`bclip-${id}`}>
          <rect x="0" y="0" width="100" height="140" rx="7" />
        </clipPath>
      </defs>

      <g clipPath={`url(#bclip-${id})`}>
        <rect width="100" height="140" fill={`url(#bgb-${id})`} />

        <g transform="translate(50 70)" stroke={goldA} fill="none">
          {isSolar ? (
            <>
              <circle r="32" strokeWidth="0.5" opacity="0.55" />
              <circle r="26" strokeWidth="0.6" opacity="0.75" />
              <circle r="20" strokeWidth="0.5" opacity="0.6" />
              <circle r="14" strokeWidth="0.4" opacity="0.5" />
              {Array.from({ length: 36 }).map((_, i) => (
                <line
                  key={i} x1="0" y1="-14" x2="0" y2="-32"
                  strokeWidth={i % 3 === 0 ? 0.7 : 0.35}
                  transform={`rotate(${i * 10})`}
                  opacity={i % 3 === 0 ? 0.95 : 0.55}
                />
              ))}
              <circle r="6" fill={goldA} stroke="none" opacity="0.85" />
              <circle r="3" fill={TT.solarPaperHi} stroke="none" />
              {[0, 72, 144, 216, 288].map((a) => (
                <g key={a} transform={`rotate(${a}) translate(0 -36)`}>
                  <circle r="1.4" fill={goldA} stroke="none" />
                </g>
              ))}
            </>
          ) : (
            <>
              <circle r="36" strokeWidth="0.4" opacity="0.4" />
              <circle r="30" strokeWidth="0.55" opacity="0.7" />
              <circle r="20" strokeWidth="0.4" opacity="0.45" />
              {/* central crescent moon */}
              <circle r="11" fill={TT.goldGlow} stroke="none" opacity="0.95" />
              <circle r="11" cx="4" cy="-2" fill={TT.lunarDeep} stroke="none" />
              {/* 12 moon phase dots */}
              {Array.from({ length: 12 }).map((_, i) => {
                const cov = (i % 6) / 5;
                return (
                  <g key={i} transform={`rotate(${i * 30}) translate(0 -30)`}>
                    <circle r="1.6" fill={TT.goldGlow} stroke="none" opacity="0.9" />
                    <circle r="1.6" cx={1.6 - cov * 3.2} fill={TT.lunarDeep} stroke="none" />
                  </g>
                );
              })}
              {/* constellation lines */}
              {[20, 140, 260].map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                  <line x1="14" y1="0" x2="26" y2="-6" strokeWidth="0.3" opacity="0.7" />
                  <circle cx="14" cy="0" r="0.5" fill={TT.goldLight} stroke="none" />
                  <circle cx="26" cy="-6" r="0.5" fill={TT.goldLight} stroke="none" />
                </g>
              ))}
            </>
          )}
        </g>

        {/* top + bottom decorative bands */}
        <g fill={goldA} opacity="0.9">
          <path d="M0 22 Q50 8 100 22 L100 26 Q50 12 0 26 Z" />
          <path d="M0 118 Q50 132 100 118 L100 114 Q50 128 0 114 Z" />
        </g>

        {/* inner gold border */}
        <rect
          x="2.5" y="2.5" width="95" height="135" rx="5"
          fill="none" stroke={goldA} strokeWidth="0.6" opacity="0.8"
        />
      </g>

      {/* outer ink border */}
      <rect
        x="0.6" y="0.6" width="98.8" height="138.8" rx="7"
        fill="none" stroke={TT.ink} strokeWidth="1.2"
      />
    </svg>
  );
}
