// Take Time — cooperative celestial card game
// Two suits (Solar, Lunar), values 1–12, placed around a 6-segment clock.

/* ---------- tokens ---------- */
const TT = {
  // Solar (light) palette
  solarPaper:  '#F6EAC9',
  solarPaperHi:'#FBF3DE',
  solarPaperLo:'#E5D3A4',
  solarMist:   '#D9E6EC',  // pale blue cloud wash
  solarInk:    '#3A2B16',
  // Lunar (dark) palette
  lunarDeep:   '#0C1F3D',
  lunarMid:    '#173663',
  lunarStar:   '#E5C57E',
  // Gold
  goldDeep:    '#9C6E20',
  goldMid:     '#C99339',
  goldLight:   '#E5C57E',
  goldGlow:    '#F4DA9A',
  // Shared
  ink:         '#1F1410',
  jade:        '#2E8F75',  // boba accent, used for live hand/UI accents
  peach:       '#E8A487',
};

/* ===========================================================
   CARD — celestial design (solar & lunar variants, 1–12)
   ----------
   Single shared template, only suit colors + numeral change.
   Drawn entirely in SVG so it scales perfectly at any size.
   =========================================================== */
function Card({ suit = 'solar', value = 1, w = 120, h = 168, faceUp = true, tilt = 0, lift = 0 }) {
  if (!faceUp) return <CardBack suit={suit} w={w} h={h} tilt={tilt} lift={lift} />;
  const isSolar = suit === 'solar';
  const bg     = isSolar ? TT.solarPaper : TT.lunarDeep;
  const bgHi   = isSolar ? TT.solarPaperHi : TT.lunarMid;
  const bgLo   = isSolar ? TT.solarPaperLo : '#06122A';
  const numCol = isSolar ? '#5E4220' : TT.goldLight;
  const cornerCol = isSolar ? '#6A4824' : TT.goldLight;
  const goldA  = isSolar ? TT.goldMid : TT.goldLight;
  const goldB  = isSolar ? TT.goldDeep : TT.goldGlow;
  const mist   = isSolar ? TT.solarMist : '#1E3F73';
  const cardId = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 140" width={w} height={h} aria-label={`${suit} ${value}`}
         style={{
           display:'block',
           filter:'drop-shadow(2px 4px 0 rgba(15,10,5,0.22))',
           transform: `translateY(${-lift}px) rotate(${tilt}deg)`,
           transformOrigin: '50% 100%',
           transition:'transform .3s cubic-bezier(.34,1.56,.64,1)',
         }}>
      <defs>
        <radialGradient id={`bg-${cardId}`} cx="50%" cy="45%" r="70%">
          <stop offset="0%"  stopColor={bgHi}/>
          <stop offset="65%" stopColor={bg}/>
          <stop offset="100%" stopColor={bgLo}/>
        </radialGradient>
        <linearGradient id={`gold-${cardId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={goldA}/>
          <stop offset="100%" stopColor={goldB}/>
        </linearGradient>
        <pattern id={`stars-${cardId}`} x="0" y="0" width="20" height="22" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.4" fill={TT.goldLight} opacity="0.55"/>
          <circle cx="14" cy="9" r="0.3" fill={TT.goldLight} opacity="0.4"/>
          <circle cx="8" cy="17" r="0.45" fill={TT.goldLight} opacity="0.6"/>
          <circle cx="17" cy="19" r="0.25" fill={TT.goldLight} opacity="0.35"/>
        </pattern>
        <pattern id={`mist-${cardId}`} x="0" y="0" width="34" height="34" patternUnits="userSpaceOnUse">
          <ellipse cx="10" cy="14" rx="11" ry="3.5" fill={mist} opacity={isSolar ? '0.45' : '0.25'}/>
          <ellipse cx="24" cy="24" rx="9"  ry="3"  fill={mist} opacity={isSolar ? '0.35' : '0.2'}/>
        </pattern>
        <clipPath id={`clip-${cardId}`}>
          <rect x="0" y="0" width="100" height="140" rx="7"/>
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${cardId})`}>
        {/* base */}
        <rect width="100" height="140" fill={`url(#bg-${cardId})`}/>
        {/* atmospheric wash */}
        <rect width="100" height="140" fill={`url(#mist-${cardId})`} opacity="0.7"/>
        {isSolar
          ? null
          : <rect width="100" height="140" fill={`url(#stars-${cardId})`}/>}

        {/* top decorative band — arc of dots + crest */}
        <g fill={`url(#gold-${cardId})`} opacity="0.95">
          <path d="M0 22 Q50 8 100 22 L100 26 Q50 12 0 26 Z"/>
          <path d="M0 30 Q50 18 100 30" stroke={goldA} strokeWidth="0.4" fill="none" opacity="0.7"/>
          {/* crest dots */}
          {[16,28,40,50,60,72,84].map((x,i) => (
            <circle key={i} cx={x} cy={i===3?16:18} r={i===3?1.4:0.7} fill={goldA}/>
          ))}
          {/* central rosette */}
          <g transform="translate(50 18)">
            <circle r="2.2" fill="none" stroke={goldA} strokeWidth="0.5"/>
            <circle r="0.8" fill={goldB}/>
            {[0,60,120,180,240,300].map(a => (
              <line key={a} x1="0" y1="-3" x2="0" y2="-4" stroke={goldA} strokeWidth="0.4"
                    transform={`rotate(${a})`}/>
            ))}
          </g>
        </g>

        {/* bottom decorative band — mirror */}
        <g fill={`url(#gold-${cardId})`} opacity="0.95">
          <path d="M0 118 Q50 132 100 118 L100 114 Q50 128 0 114 Z"/>
          <path d="M0 110 Q50 122 100 110" stroke={goldA} strokeWidth="0.4" fill="none" opacity="0.7"/>
          {[16,28,40,50,60,72,84].map((x,i) => (
            <circle key={i} cx={x} cy={i===3?124:122} r={i===3?1.4:0.7} fill={goldA}/>
          ))}
          <g transform="translate(50 122)">
            <circle r="2.2" fill="none" stroke={goldA} strokeWidth="0.5"/>
            <circle r="0.8" fill={goldB}/>
            {[0,60,120,180,240,300].map(a => (
              <line key={a} x1="0" y1="-3" x2="0" y2="-4" stroke={goldA} strokeWidth="0.4"
                    transform={`rotate(${a})`}/>
            ))}
          </g>
        </g>

        {/* central numeral - elegant serif */}
        <text x="50" y="82" textAnchor="middle"
              fontFamily="'Cormorant Garamond', 'Bricolage Grotesque', serif"
              fontWeight="600" fontSize="48"
              fill={numCol} style={{letterSpacing:'-0.02em'}}>
          {value}
        </text>

        {/* corner numerals (TL, BR rotated 180) */}
        <text x="8" y="14" textAnchor="start"
              fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="10"
              fill={cornerCol}>{value}</text>
        <g transform="translate(92 126) rotate(180)">
          <text x="0" y="0" textAnchor="start"
                fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="10"
                fill={cornerCol}>{value}</text>
        </g>

        {/* inner gold border */}
        <rect x="2.5" y="2.5" width="95" height="135" rx="5"
              fill="none" stroke={goldA} strokeWidth="0.6" opacity="0.8"/>
      </g>
      {/* hard outer ink border — sticker hint to fit the brand */}
      <rect x="0.6" y="0.6" width="98.8" height="138.8" rx="7"
            fill="none" stroke={TT.ink} strokeWidth="1.2"/>
    </svg>
  );
}

/* ===========================================================
   CARD BACK — visible during placement; suit color shows
   so opponents can read solar/lunar without seeing value.
   =========================================================== */
function CardBack({ suit = 'solar', w = 120, h = 168, tilt = 0, lift = 0 }) {
  const isSolar = suit === 'solar';
  const bg     = isSolar ? TT.solarPaper : TT.lunarDeep;
  const bgHi   = isSolar ? TT.solarPaperHi : TT.lunarMid;
  const bgLo   = isSolar ? TT.solarPaperLo : '#06122A';
  const goldA  = isSolar ? TT.goldMid : TT.goldLight;
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 140" width={w} height={h} aria-label={`${suit} card back`}
         style={{
           display:'block',
           filter:'drop-shadow(2px 4px 0 rgba(15,10,5,0.22))',
           transform: `translateY(${-lift}px) rotate(${tilt}deg)`,
           transformOrigin: '50% 100%',
           transition:'transform .3s cubic-bezier(.34,1.56,.64,1)',
         }}>
      <defs>
        <radialGradient id={`bgb-${id}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={bgHi}/>
          <stop offset="70%" stopColor={bg}/>
          <stop offset="100%" stopColor={bgLo}/>
        </radialGradient>
        <clipPath id={`bclip-${id}`}>
          <rect x="0" y="0" width="100" height="140" rx="7"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#bclip-${id})`}>
        <rect width="100" height="140" fill={`url(#bgb-${id})`}/>
        <g transform="translate(50 70)" stroke={goldA} fill="none">
          {isSolar ? (
            /* sun-burst: rays + concentric rings */
            <>
              <circle r="32" strokeWidth="0.5" opacity="0.55"/>
              <circle r="26" strokeWidth="0.6" opacity="0.75"/>
              <circle r="20" strokeWidth="0.5" opacity="0.6"/>
              <circle r="14" strokeWidth="0.4" opacity="0.5"/>
              {Array.from({length:36}).map((_,i) => (
                <line key={i} x1="0" y1="-14" x2="0" y2="-32"
                      strokeWidth={i%3===0 ? 0.7 : 0.35}
                      transform={`rotate(${i*10})`}
                      opacity={i%3===0 ? 0.95 : 0.55}/>
              ))}
              <circle r="6"  fill={goldA} stroke="none" opacity="0.85"/>
              <circle r="3"  fill={TT.solarPaperHi} stroke="none"/>
              {/* tiny ringed planets */}
              {[0,72,144,216,288].map(a => (
                <g key={a} transform={`rotate(${a}) translate(0 -36)`}>
                  <circle r="1.4" fill={goldA} stroke="none"/>
                </g>
              ))}
            </>
          ) : (
            /* moon-phases: ring of crescents around a central moon */
            <>
              <circle r="36" strokeWidth="0.4" opacity="0.4"/>
              <circle r="30" strokeWidth="0.55" opacity="0.7"/>
              <circle r="20" strokeWidth="0.4" opacity="0.45"/>
              {/* central moon — crescent */}
              <circle r="11" fill={TT.goldGlow} stroke="none" opacity="0.95"/>
              <circle r="11" cx="4" cy="-2" fill={TT.lunarDeep} stroke="none"/>
              {/* 12 moon phase dots */}
              {Array.from({length:12}).map((_,i) => {
                const a = i*30, cov = (i%6)/5;
                return (
                  <g key={i} transform={`rotate(${a}) translate(0 -30)`}>
                    <circle r="1.6" fill={TT.goldGlow} stroke="none" opacity="0.9"/>
                    <circle r="1.6" cx={1.6-cov*3.2} fill={TT.lunarDeep} stroke="none"/>
                  </g>
                );
              })}
              {/* constellation lines */}
              {[20,140,260].map(a => (
                <g key={a} transform={`rotate(${a})`}>
                  <line x1="14" y1="0" x2="26" y2="-6" strokeWidth="0.3" opacity="0.7"/>
                  <circle cx="14" cy="0" r="0.5" fill={TT.goldLight} stroke="none"/>
                  <circle cx="26" cy="-6" r="0.5" fill={TT.goldLight} stroke="none"/>
                </g>
              ))}
            </>
          )}
        </g>

        {/* top + bottom bands echoing the front */}
        <g fill={goldA} opacity="0.9">
          <path d="M0 22 Q50 8 100 22 L100 26 Q50 12 0 26 Z"/>
          <path d="M0 118 Q50 132 100 118 L100 114 Q50 128 0 114 Z"/>
        </g>
        <rect x="2.5" y="2.5" width="95" height="135" rx="5"
              fill="none" stroke={goldA} strokeWidth="0.6" opacity="0.8"/>
      </g>
      <rect x="0.6" y="0.6" width="98.8" height="138.8" rx="7"
            fill="none" stroke={TT.ink} strokeWidth="1.2"/>
    </svg>
  );
}

/* ===========================================================
   CLOCK — 6 segments, rotating Hand, rule glyph per segment.
   Pure SVG so rotation is buttery and proportional at any size.
   Hand is a rotating <g> with spring transition.
   =========================================================== */

// Rule glyphs — placeholder icons for the per-segment rules.
const RULE_GLYPHS = {
  solar:  ({c}) => <g><circle r="6" fill={c} opacity="0.9"/><g stroke={c} strokeWidth="1.2">
    {Array.from({length:8}).map((_,i) => <line key={i} x1="0" y1="-8" x2="0" y2="-11" transform={`rotate(${i*45})`}/>)}
  </g></g>,
  lunar:  ({c}) => <g><circle r="7" fill={c}/><circle r="7" cx="2.5" cy="-1" fill={TT.solarPaper}/></g>,
  pair:   ({c}) => <g fill={c}><circle cx="-3" cy="0" r="3"/><circle cx="3" cy="0" r="3"/></g>,
  three:  ({c}) => <g fill={c}><circle cx="-4" cy="2" r="2.5"/><circle cx="0" cy="-2" r="2.5"/><circle cx="4" cy="2" r="2.5"/></g>,
  max:    ({c}) => <text textAnchor="middle" y="3" fontFamily="'Cormorant Garamond', serif"
    fontWeight="600" fontSize="14" fill={c}>≤8</text>,
  ban:    ({c}) => <g><circle r="7" fill="none" stroke={c} strokeWidth="1.6"/>
    <line x1="-5" y1="-5" x2="5" y2="5" stroke={c} strokeWidth="1.6"/></g>,
};

function ClockSegment({i, cx, cy, r, fill, stroke, onHover}) {
  const a0 = (i*60 - 90) * Math.PI/180;
  const a1 = ((i+1)*60 - 90) * Math.PI/180;
  const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0);
  const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
  return <path d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Z`}
    fill={fill} stroke={stroke} strokeWidth="1"
    onMouseEnter={onHover}
    style={{cursor:'pointer', transition:'fill .2s'}}/>;
}

function Clock({ size = 480, handPos = 0, onRotate, rules = ['solar','pair','three','lunar','max','ban'] }) {
  const VB = 500;
  const cx = VB/2, cy = VB/2;
  const R = 180;        // outer dial radius
  const Rinner = 56;    // central hub radius
  const Rrim = R + 14;  // outer rim
  const handLen = R - 6;

  // Segment fills alternate to subtly separate them
  const segFill = (i) => i % 2 === 0 ? '#F2E2BA' : '#EBD7A4';
  const handDeg = handPos * 60;

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} style={{display:'block'}}>
      <defs>
        <radialGradient id="tt-dial" cx="50%" cy="50%" r="60%">
          <stop offset="0%"  stopColor="#FBF3DE"/>
          <stop offset="75%" stopColor="#EAD8A8"/>
          <stop offset="100%" stopColor="#D9BE7F"/>
        </radialGradient>
        <radialGradient id="tt-hub" cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#FCF6E3"/>
          <stop offset="100%" stopColor="#D9BE7F"/>
        </radialGradient>
        <linearGradient id="tt-hand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TT.goldGlow}/>
          <stop offset="50%" stopColor={TT.goldMid}/>
          <stop offset="100%" stopColor={TT.goldDeep}/>
        </linearGradient>
      </defs>

      {/* outer rim band */}
      <circle cx={cx} cy={cy} r={Rrim} fill="#E5C57E" stroke={TT.ink} strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={Rrim-2.5} fill="none" stroke={TT.goldDeep} strokeWidth="0.6"/>
      {/* hour-tick marks around the rim */}
      {Array.from({length:60}).map((_,i) => {
        const a = (i*6 - 90) * Math.PI/180;
        const isMajor = i % 5 === 0;
        const x0 = cx + (Rrim-1)*Math.cos(a), y0 = cy + (Rrim-1)*Math.sin(a);
        const x1 = cx + (Rrim-(isMajor?7:3.5))*Math.cos(a), y1 = cy + (Rrim-(isMajor?7:3.5))*Math.sin(a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
          stroke={TT.ink} strokeWidth={isMajor ? 1.2 : 0.5} opacity={isMajor ? 0.9 : 0.55}/>;
      })}

      {/* dial face */}
      <circle cx={cx} cy={cy} r={R} fill="url(#tt-dial)" stroke={TT.ink} strokeWidth="1.4"/>

      {/* 6 segments */}
      {Array.from({length:6}).map((_,i) => (
        <ClockSegment key={i} i={i} cx={cx} cy={cy} r={R}
          fill={segFill(i)} stroke={TT.goldDeep}/>
      ))}

      {/* radial dividers — heavier than the segment edges */}
      {Array.from({length:6}).map((_,i) => {
        const a = (i*60 - 90) * Math.PI/180;
        const x = cx + R*Math.cos(a), y = cy + R*Math.sin(a);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke={TT.ink} strokeWidth="1.4" opacity="0.55"/>;
      })}

      {/* segment glyphs & numbers — placed at the midline of each sector */}
      {Array.from({length:6}).map((_,i) => {
        const mid = ((i+0.5)*60 - 90) * Math.PI/180;
        const gx = cx + (R-32)*Math.cos(mid);
        const gy = cy + (R-32)*Math.sin(mid);
        const nx = cx + (R-12)*Math.cos(mid);
        const ny = cy + (R-12)*Math.sin(mid);
        const Glyph = RULE_GLYPHS[rules[i]] || RULE_GLYPHS.solar;
        return (
          <g key={i}>
            <g transform={`translate(${gx} ${gy})`}>
              <circle r="14" fill="#FBF3DE" stroke={TT.goldDeep} strokeWidth="0.8"/>
              <Glyph c={TT.ink}/>
            </g>
            <text x={nx} y={ny+2} textAnchor="middle"
              fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="10"
              fill={TT.ink} opacity="0.55">{i+1}</text>
          </g>
        );
      })}

      {/* hub */}
      <circle cx={cx} cy={cy} r={Rinner+4} fill={TT.ink}/>
      <circle cx={cx} cy={cy} r={Rinner} fill="url(#tt-hub)" stroke={TT.goldDeep} strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={Rinner-6} fill="none" stroke={TT.goldDeep} strokeWidth="0.5"/>
      <text x={cx} y={cy-4} textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif" fontWeight="500" fontSize="10"
        fill={TT.solarInk} opacity="0.7" style={{letterSpacing:'0.18em'}}>CHAPTER</text>
      <text x={cx} y={cy+22} textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="36"
        fill={TT.solarInk}>1</text>

      {/* hand — rotates about hub */}
      <g style={{
            transform: `rotate(${handDeg}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform .7s cubic-bezier(.34,1.56,.64,1)',
         }}>
        <path d={`M${cx} ${cy-handLen}
                  L${cx-7} ${cy-handLen+18}
                  L${cx-3} ${cy-handLen+18}
                  L${cx-3} ${cy+10}
                  L${cx+3} ${cy+10}
                  L${cx+3} ${cy-handLen+18}
                  L${cx+7} ${cy-handLen+18} Z`}
          fill="url(#tt-hand)" stroke={TT.ink} strokeWidth="1"/>
        <circle cx={cx} cy={cy-handLen+30} r="5"
          fill={TT.goldGlow} stroke={TT.ink} strokeWidth="0.8"/>
        <circle cx={cx} cy={cy} r="9" fill={TT.ink}/>
        <circle cx={cx} cy={cy} r="5" fill={TT.goldMid}/>
        <circle cx={cx} cy={cy} r="1.5" fill={TT.ink}/>
      </g>
    </svg>
  );
}

/* ===========================================================
   CARD SLOT — fans up to 4 cards next to a segment.
   Position computed by parent (radial layout around clock).
   =========================================================== */
function CardSlot({ cards = [], angle = 0, faceUp = false }) {
  // The slot's local frame is rotated to the segment's radial direction.
  // Cards sit with their top edge facing the clock, fanned slightly.
  const N = Math.min(cards.length, 4);
  const FAN = N === 1 ? 0 : 6; // degrees between cards
  return (
    <div style={{position:'absolute', width:0, height:0,
                 transform:`rotate(${angle}deg)`,
                 transformOrigin:'0 0'}}>
      <div style={{
        position:'absolute',
        transform: 'translate(-50%, 0)',
        width: 90, height: 0,
      }}>
        {cards.slice(0, 4).map((c, i) => {
          const offset = i - (N-1)/2;
          const rot = offset * FAN;
          const dx = offset * 16;
          const dy = Math.abs(offset) * 3;
          return (
            <div key={i} style={{
              position:'absolute',
              left: '50%',
              top: 0,
              transform:`translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot - angle}deg)`,
              transformOrigin:'50% 0%',
            }}>
              <Card suit={c.suit} value={c.value} faceUp={c.faceUp ?? faceUp} w={62} h={86}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===========================================================
   CLOCK BOARD — clock + 6 card-slot positions + caption row
   =========================================================== */
function ClockBoard({ size = 700, handPos = 0, placements = [], rules }) {
  const R = 180; const Rrim = R + 14;
  // Place slots just past the rim, at the angular midpoint of each segment.
  const slotDist = (Rrim + 86) * (size/500);
  return (
    <div style={{position:'relative', width:size, height:size,
                 display:'flex', alignItems:'center', justifyContent:'center'}}>
      <Clock size={size} handPos={handPos} rules={rules}/>
      {/* slot overlay */}
      <div style={{position:'absolute', left:'50%', top:'50%'}}>
        {placements.map((cards, i) => {
          const angle = (i+0.5)*60; // 30, 90, 150, 210, 270, 330
          const rad = (angle - 90) * Math.PI/180;
          const x = slotDist * Math.cos(rad);
          const y = slotDist * Math.sin(rad);
          return (
            <div key={i} style={{
              position:'absolute',
              transform:`translate(calc(${x}px - 0px), calc(${y}px - 0px))`,
            }}>
              <CardSlot cards={cards} angle={angle}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===========================================================
   PLAYER HAND — fanned cards at bottom of viewport
   =========================================================== */
function PlayerHand({ cards = [], hovered = -1, onHover }) {
  const N = cards.length;
  return (
    <div style={{display:'flex', alignItems:'flex-end', justifyContent:'center',
                 height: 200, position:'relative'}}>
      {cards.map((c, i) => {
        const offset = i - (N-1)/2;
        const tilt = offset * 4;
        const dy = Math.abs(offset) * 6;
        const isHov = i === hovered;
        return (
          <div key={i}
               onMouseEnter={() => onHover && onHover(i)}
               onMouseLeave={() => onHover && onHover(-1)}
               style={{
                 marginLeft: i===0 ? 0 : -42,
                 transform: `translateY(${dy + (isHov?-28:0)}px) rotate(${tilt}deg)`,
                 transformOrigin: '50% 100%',
                 transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
                 cursor: 'grab', zIndex: isHov ? 20 : i,
               }}>
            <Card suit={c.suit} value={c.value} faceUp w={104} h={146}/>
          </div>
        );
      })}
    </div>
  );
}

/* ===========================================================
   LEVEL CLOCK — renders a clock face from a level definition.
   Uses RuleGlyph + CenterGlyph from take-time-levels.jsx.
   =========================================================== */
function LevelClock({ level, size = 240, handPos = null, showLabel = true, onRotate }) {
  const VB = 500;
  const cx = VB/2, cy = VB/2;
  const R = 180, Rinner = 56, Rrim = R + 14, handLen = R - 6;
  const segFill = (i) => i % 2 === 0 ? '#F2E2BA' : '#EBD7A4';
  const pos = handPos != null ? handPos : 0;
  const handDeg = pos * 60;
  const segs = level.segments || [[],[],[],[],[],[]];
  const handLabel = level.hand === 'discuss' ? 'choose start' :
                    level.hand === 'movable' ? 'movable' : 'fixed';

  return (
    <div style={{position:'relative', width:size, height:size,
                 display:'flex', alignItems:'center', justifyContent:'center',
                 cursor: onRotate ? 'pointer' : 'default'}}
         onClick={onRotate}>
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size}>
        <defs>
          <radialGradient id={`lc-dial-${level.id}`} cx="50%" cy="50%" r="60%">
            <stop offset="0%"  stopColor="#FBF3DE"/>
            <stop offset="75%" stopColor="#EAD8A8"/>
            <stop offset="100%" stopColor="#D9BE7F"/>
          </radialGradient>
          <radialGradient id={`lc-hub-${level.id}`} cx="40%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#FCF6E3"/>
            <stop offset="100%" stopColor="#D9BE7F"/>
          </radialGradient>
          <linearGradient id={`lc-hand-${level.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TT.goldGlow}/>
            <stop offset="50%" stopColor={TT.goldMid}/>
            <stop offset="100%" stopColor={TT.goldDeep}/>
          </linearGradient>
        </defs>

        {/* outer rim */}
        <circle cx={cx} cy={cy} r={Rrim} fill="#E5C57E" stroke={TT.ink} strokeWidth="2"/>
        <circle cx={cx} cy={cy} r={Rrim-2.5} fill="none" stroke={TT.goldDeep} strokeWidth="0.6"/>
        {Array.from({length:60}).map((_,i) => {
          const a = (i*6 - 90) * Math.PI/180;
          const isMajor = i % 5 === 0;
          const x0 = cx + (Rrim-1)*Math.cos(a), y0 = cy + (Rrim-1)*Math.sin(a);
          const x1 = cx + (Rrim-(isMajor?7:3.5))*Math.cos(a), y1 = cy + (Rrim-(isMajor?7:3.5))*Math.sin(a);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
            stroke={TT.ink} strokeWidth={isMajor ? 1.2 : 0.5} opacity={isMajor ? 0.9 : 0.55}/>;
        })}

        <circle cx={cx} cy={cy} r={R} fill={`url(#lc-dial-${level.id})`}
                stroke={TT.ink} strokeWidth="1.4"/>

        {/* segments */}
        {Array.from({length:6}).map((_,i) => {
          const a0 = (i*60 - 90) * Math.PI/180;
          const a1 = ((i+1)*60 - 90) * Math.PI/180;
          const x0 = cx + R*Math.cos(a0), y0 = cy + R*Math.sin(a0);
          const x1 = cx + R*Math.cos(a1), y1 = cy + R*Math.sin(a1);
          return <path key={i} d={`M${cx},${cy} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`}
            fill={segFill(i)} stroke={TT.goldDeep} strokeWidth="1"/>;
        })}

        {/* radial dividers */}
        {Array.from({length:6}).map((_,i) => {
          const a = (i*60 - 90) * Math.PI/180;
          const x = cx + R*Math.cos(a), y = cy + R*Math.sin(a);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
            stroke={TT.ink} strokeWidth="1.4" opacity="0.55"/>;
        })}

        {/* per-segment number */}
        {Array.from({length:6}).map((_,i) => {
          const mid = ((i+0.5)*60 - 90) * Math.PI/180;
          const nx = cx + (R-12)*Math.cos(mid);
          const ny = cy + (R-12)*Math.sin(mid);
          return <text key={i} x={nx} y={ny+2} textAnchor="middle"
            fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="11"
            fill={TT.ink} opacity="0.55">{i+1}</text>;
        })}

        {/* hub: center rule glyph if any, else chapter Roman + test */}
        <circle cx={cx} cy={cy} r={Rinner+4} fill={TT.ink}/>
        <circle cx={cx} cy={cy} r={Rinner} fill={`url(#lc-hub-${level.id})`}
                stroke={TT.goldDeep} strokeWidth="1"/>
        <circle cx={cx} cy={cy} r={Rinner-6} fill="none" stroke={TT.goldDeep} strokeWidth="0.5"/>
        {level.center ? (
          <g transform={`translate(${cx} ${cy})`}>
            <foreignObject x="-30" y="-30" width="60" height="60">
              <div style={{width:60, height:60, display:'flex',
                           alignItems:'center', justifyContent:'center'}}>
                <CenterGlyph rule={level.center} size={60}/>
              </div>
            </foreignObject>
          </g>
        ) : (
          <React.Fragment>
            <text x={cx} y={cy-6} textAnchor="middle"
              fontFamily="'Cormorant Garamond', serif" fontWeight="500" fontSize="11"
              fill={TT.solarInk} opacity="0.65" style={{letterSpacing:'0.18em'}}>
              {level.chapter}
            </text>
            <text x={cx} y={cy+22} textAnchor="middle"
              fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="30"
              fill={TT.solarInk}>{level.test}</text>
          </React.Fragment>
        )}

        {/* hand */}
        <g style={{
              transform: `rotate(${handDeg}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform .7s cubic-bezier(.34,1.56,.64,1)',
           }}>
          <path d={`M${cx} ${cy-handLen}
                    L${cx-7} ${cy-handLen+18}
                    L${cx-3} ${cy-handLen+18}
                    L${cx-3} ${cy+10}
                    L${cx+3} ${cy+10}
                    L${cx+3} ${cy-handLen+18}
                    L${cx+7} ${cy-handLen+18} Z`}
            fill={`url(#lc-hand-${level.id})`} stroke={TT.ink} strokeWidth="1"/>
          <circle cx={cx} cy={cy-handLen+30} r="5"
            fill={TT.goldGlow} stroke={TT.ink} strokeWidth="0.8"/>
          <circle cx={cx} cy={cy} r="9" fill={TT.ink}/>
          <circle cx={cx} cy={cy} r="5" fill={TT.goldMid}/>
          <circle cx={cx} cy={cy} r="1.5" fill={TT.ink}/>
        </g>
      </svg>

      {/* per-segment rule glyphs — positioned just outside the rim */}
      {segs.map((rules, i) => {
        if (!rules || rules.length === 0) return null;
        const mid = ((i+0.5)*60 - 90) * Math.PI/180;
        const dist = (size/VB) * (Rrim + 30);
        const x = (size/2) + dist * Math.cos(mid);
        const y = (size/2) + dist * Math.sin(mid);
        const glyphSize = Math.max(28, size * 0.13);
        return (
          <div key={i} style={{position:'absolute',
            left: x, top: y, transform:'translate(-50%, -50%)',
            display:'flex', flexDirection:'column', gap:4, alignItems:'center'}}>
            {rules.map((r, j) => (
              <RuleGlyph key={j} rule={r} size={glyphSize}/>
            ))}
          </div>
        );
      })}

      {showLabel && (
        <div style={{position:'absolute', top: 4, left: 4,
                     padding:'3px 9px', borderRadius:14,
                     background: TT.ink, color: TT.goldGlow,
                     font:"600 11px 'Cormorant Garamond', serif",
                     letterSpacing:'0.12em',
                     border:`1.5px solid ${TT.goldDeep}`}}>
          {level.id} · {handLabel}
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   LOBBY TILE — small chapter/test selector cell
   =========================================================== */
function LobbyTile({ level, status = 'available', onClick }) {
  // status: 'locked' | 'available' | 'cleared'
  const bg = status === 'cleared' ? '#E8D89A'
           : status === 'locked'  ? '#D9CFB8'
           :                        '#FBF3DE';
  const dim = status === 'locked';
  return (
    <button onClick={onClick} style={{
      all:'unset',
      cursor: dim ? 'not-allowed' : 'pointer',
      width: 168, padding:'10px 10px 8px',
      background: bg,
      border: `2px solid ${TT.ink}`,
      borderRadius: 10,
      boxShadow: dim ? 'none' : '3px 4px 0 rgba(15,10,5,0.35)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
      opacity: dim ? 0.55 : 1,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', width:'100%',
                   font:"600 10px Inter,sans-serif", color: TT.solarInk,
                   letterSpacing:'0.08em'}}>
        <span>{level.id}</span>
        <span style={{opacity:0.6}}>
          {status==='cleared'?'✦ cleared':status==='locked'?'locked':''}
        </span>
      </div>
      <LevelClock level={level} size={140} showLabel={false}/>
      <div style={{font:"500 11px Inter,sans-serif", color: TT.solarInk,
                   textAlign:'center', minHeight:14, opacity:0.78,
                   lineHeight:1.2, padding:'0 4px'}}>
        {level.chapterName}
      </div>
    </button>
  );
}

/* ===========================================================
   APP — design canvas with focused sections
   =========================================================== */
function App() {
  /* ----- demo state ----- */
  const [hand1, setHand1] = React.useState(0);
  const [hand2, setHand2] = React.useState(2);
  const [hand3, setHand3] = React.useState(4);
  const [hovered, setHovered] = React.useState(-1);

  /* ----- sample placements ----- */
  const placementsA = [
    [{suit:'solar', value:3, faceUp:true}],
    [{suit:'solar', value:5}, {suit:'lunar', value:6}],
    [{suit:'lunar', value:9}, {suit:'solar', value:2}, {suit:'solar', value:1}],
    [{suit:'solar', value:11}, {suit:'lunar', value:7}],
    [{suit:'lunar', value:12, faceUp:true}, {suit:'solar', value:8}, {suit:'lunar', value:4}],
    [{suit:'solar', value:10}, {suit:'lunar', value:8}, {suit:'solar', value:6}, {suit:'lunar', value:2}],
  ];

  /* ----- sample hand for the full-board view ----- */
  const sampleHand = [
    {suit:'solar', value:7},
    {suit:'lunar', value:3},
    {suit:'solar', value:11},
    {suit:'lunar', value:9},
  ];

  return (
    <DesignCanvas title="Take Time — design exploration">

      {/* ============ LOBBY ============ */}
      <DCSection id="lobby" title="Lobby — chapter & test select"
        subtitle="10 chapters × 4 tests · clear in order · roman numerals match the rulebook">

        <DCArtboard id="lobby-full" label="Full lobby · chapters I–X"
          width={1340} height={840}>
          <div style={{padding:'30px 40px', background:'#F0EEE9',
                       width:'100%', height:'100%', overflow:'auto',
                       fontFamily:"'Cormorant Garamond', serif"}}>
            {/* header */}
            <div style={{display:'flex', justifyContent:'space-between',
                         alignItems:'flex-end', marginBottom:24}}>
              <div>
                <div style={{font:"500 13px Inter,sans-serif", color: TT.solarInk,
                             opacity:0.6, letterSpacing:'0.18em',
                             textTransform:'uppercase'}}>Take Time</div>
                <div style={{font:"600 36px 'Cormorant Garamond',serif",
                             color: TT.ink, marginTop:4}}>Choose your test</div>
              </div>
              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                <Token kind="reminder" count={3} state="on" label="3 players"/>
                <div style={{padding:'8px 14px', background: TT.ink,
                             color: TT.goldGlow, borderRadius:8,
                             font:"600 12px Inter,sans-serif",
                             letterSpacing:'0.1em'}}>
                  PROGRESS · 4 / 40
                </div>
              </div>
            </div>

            {/* chapters */}
            {(() => {
              const all = [];
              for (let c = 1; c <= 10; c++) {
                const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][c-1];
                const chapterLevels = LEVELS.filter(l => l.chapter === roman);
                const placeholderName = {
                  IV:'Inversion', V:'Sequence', VI:'Threshold',
                  VII:'Equilibrium', VIII:'Reflection', IX:'Convergence', X:'Rebirth'
                }[roman];
                const name = chapterLevels[0]?.chapterName || placeholderName || '—';
                const isImplemented = chapterLevels.length > 0;
                all.push(
                  <div key={roman} style={{marginBottom:22}}>
                    <div style={{display:'flex', alignItems:'baseline', gap:14,
                                 marginBottom:10, paddingLeft:4}}>
                      <span style={{font:"600 28px 'Cormorant Garamond',serif",
                                    color: TT.ink, letterSpacing:'0.05em'}}>
                        Chapter {roman}
                      </span>
                      <span style={{font:"italic 500 18px 'Cormorant Garamond',serif",
                                    color: TT.solarInk, opacity:0.7}}>
                        {name}
                      </span>
                      {!isImplemented && (
                        <span style={{padding:'2px 10px', borderRadius:10,
                                      background:'#D9CFB8', color:TT.solarInk,
                                      font:"500 10px Inter,sans-serif",
                                      letterSpacing:'0.1em',
                                      textTransform:'uppercase', opacity:0.7}}>
                          locked
                        </span>
                      )}
                    </div>
                    <div style={{display:'flex', gap:14, flexWrap:'wrap'}}>
                      {isImplemented ? chapterLevels.map((lv, i) => {
                        // demo statuses: I-1 to I-2 cleared, I-3 current, rest available
                        const status = (roman==='I' && i<2) ? 'cleared'
                                     : (roman==='I' && i===2) ? 'available'
                                     : (roman==='I') ? 'available'
                                     : (roman==='II'||roman==='III') ? 'available'
                                     : 'locked';
                        return <LobbyTile key={lv.id} level={lv} status={status}/>;
                      }) : Array.from({length:4}).map((_,i) => (
                        <div key={i} style={{
                          width:168, height:188, borderRadius:10,
                          border:`2px dashed ${TT.goldDeep}`,
                          background:'rgba(215,196,148,0.18)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          font:"italic 500 13px 'Cormorant Garamond',serif",
                          color: TT.solarInk, opacity:0.55,
                        }}>{roman}-{i+1}</div>
                      ))}
                    </div>
                  </div>
                );
              }
              return all;
            })()}
          </div>
        </DCArtboard>
      </DCSection>

      {/* ============ CHAPTERS I–III ============ */}
      <DCSection id="chapters" title="Chapters I–III · all 12 tests"
        subtitle="Each clock shows segment rules outside the rim and any clock-wide rule in the hub">

        {[
          ['I','Awakening'],
          ['II','Limitation'],
          ['III','As within, so without'],
        ].map(([roman, name]) => (
          <DCArtboard key={roman} id={`ch-${roman}`}
            label={`Chapter ${roman} · ${name}`}
            width={1300} height={420}>
            <div style={{padding:'30px 40px', background:'#F0EEE9',
                         width:'100%', height:'100%', display:'flex',
                         alignItems:'center', gap:20}}>
              {/* chapter spine */}
              <div style={{display:'flex', flexDirection:'column',
                           justifyContent:'center', alignItems:'flex-start',
                           gap:8, minWidth:170, padding:'20px 0'}}>
                <div style={{font:"500 12px Inter,sans-serif", color: TT.solarInk,
                             opacity:0.6, letterSpacing:'0.18em',
                             textTransform:'uppercase'}}>Chapter</div>
                <div style={{font:"600 88px 'Cormorant Garamond',serif",
                             color: TT.ink, lineHeight:0.85,
                             letterSpacing:'0.03em'}}>{roman}</div>
                <div style={{font:"italic 500 22px 'Cormorant Garamond',serif",
                             color: TT.solarInk, opacity:0.85,
                             maxWidth:160, lineHeight:1.15,
                             textWrap:'pretty'}}>{name}</div>
                {roman === 'III' && (
                  <div style={{marginTop:10, font:"500 11px Inter,sans-serif",
                               color: TT.solarInk, opacity:0.72, maxWidth:160,
                               lineHeight:1.3}}>
                    Hand chosen in Discussion · re-pointable after Resolution
                  </div>
                )}
              </div>
              {/* 4 tests */}
              {LEVELS.filter(l => l.chapter === roman).map(lv => (
                <div key={lv.id} style={{flex:'1 1 0', minWidth:240, maxWidth:280,
                  display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <LevelClock level={lv} size={260}/>
                </div>
              ))}
            </div>
          </DCArtboard>
        ))}
      </DCSection>

      {/* ============ RULE GLYPH LIBRARY ============ */}
      <DCSection id="glyphs" title="Rule glyph library"
        subtitle="Every primitive needed for chapters I–III · used both inside segments and in the rulebook">

        <DCArtboard id="glyph-grid" label="Segment-rule glyphs"
          width={920} height={520}>
          <div style={{padding:'30px 36px', background:'#F0EEE9',
                       width:'100%', height:'100%', overflow:'auto'}}>
            <div style={{display:'grid',
                         gridTemplateColumns:'repeat(5, 1fr)', gap:18}}>
              {ALL_RULES.map((r, i) => (
                <div key={i} style={{display:'flex', flexDirection:'column',
                  alignItems:'center', gap:6, padding:'12px 8px',
                  background:'#FBF3DE', borderRadius:10,
                  border:`1.5px solid ${TT.goldDeep}`}}>
                  <RuleGlyph rule={r} size={54}/>
                  <div style={{font:"500 11px Inter,sans-serif",
                               color: TT.solarInk, textAlign:'center',
                               lineHeight:1.25, minHeight:28,
                               textWrap:'pretty'}}>
                    {describeRule(r)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="center-glyphs" label="Clock-center rules"
          width={460} height={360}>
          <div style={{padding:'30px 36px', background:'#F0EEE9',
                       width:'100%', height:'100%',
                       display:'flex', gap:18, alignItems:'center',
                       justifyContent:'center'}}>
            {ALL_CENTER_RULES.map((r, i) => (
              <div key={i} style={{display:'flex', flexDirection:'column',
                alignItems:'center', gap:10, padding:'18px 16px',
                background:'#FBF3DE', borderRadius:12,
                border:`1.5px solid ${TT.goldDeep}`,
                boxShadow:'3px 4px 0 rgba(15,10,5,0.25)'}}>
                <CenterGlyph rule={r} size={86}/>
                <div style={{font:"500 12px Inter,sans-serif",
                             color: TT.solarInk, textAlign:'center',
                             maxWidth:140, lineHeight:1.3}}>
                  {describeRule(r)}
                </div>
              </div>
            ))}
          </div>
        </DCArtboard>
      </DCSection>

      {/* ============ CARDS ============ */}
      <DCSection id="cards" title="Cards"
        subtitle="24 cards · 12 Solar (light) + 12 Lunar (dark) · values 1–12">

        <DCArtboard id="card-fronts-solar" label="Solar fronts · 1 / 6 / 12"
          width={460} height={260}>
          <div style={{padding:30, display:'flex', gap:18, alignItems:'center',
                       justifyContent:'center', background:'#F0EEE9', height:'100%'}}>
            <Card suit="solar" value={1}  w={120} h={168}/>
            <Card suit="solar" value={6}  w={120} h={168}/>
            <Card suit="solar" value={12} w={120} h={168}/>
          </div>
        </DCArtboard>

        <DCArtboard id="card-fronts-lunar" label="Lunar fronts · 1 / 6 / 12"
          width={460} height={260}>
          <div style={{padding:30, display:'flex', gap:18, alignItems:'center',
                       justifyContent:'center', background:'#1A1410', height:'100%'}}>
            <Card suit="lunar" value={1}  w={120} h={168}/>
            <Card suit="lunar" value={6}  w={120} h={168}/>
            <Card suit="lunar" value={12} w={120} h={168}/>
          </div>
        </DCArtboard>

        <DCArtboard id="card-backs" label="Card backs · suit readable face-down"
          width={460} height={260}>
          <div style={{padding:30, display:'flex', gap:24, alignItems:'center',
                       justifyContent:'center',
                       background:'linear-gradient(135deg,#F0EEE9 50%, #1A1410 50%)',
                       height:'100%'}}>
            <CardBack suit="solar" w={150} h={210}/>
            <CardBack suit="lunar" w={150} h={210}/>
          </div>
        </DCArtboard>

        <DCArtboard id="card-fan" label="Fanned hand · interactive (hover)"
          width={780} height={300}>
          <div style={{padding:'30px 40px 0', background:'#F0EEE9', height:'100%'}}>
            <PlayerHand
              cards={[
                {suit:'solar', value:7},
                {suit:'lunar', value:3},
                {suit:'solar', value:11},
                {suit:'lunar', value:9},
                {suit:'solar', value:1},
                {suit:'lunar', value:12},
              ]}
              hovered={hovered}
              onHover={setHovered}/>
          </div>
        </DCArtboard>

        <DCArtboard id="card-grid" label="Full deck · 1 → 12 both suits"
          width={900} height={420}>
          <div style={{padding:24, background:'#F0EEE9', height:'100%',
                       display:'grid', gridTemplateColumns:'repeat(12, 1fr)',
                       gap:6, alignContent:'center'}}>
            {Array.from({length:12}).map((_,i) =>
              <Card key={`s${i}`} suit="solar" value={i+1} w={64} h={90}/>)}
            {Array.from({length:12}).map((_,i) =>
              <Card key={`l${i}`} suit="lunar" value={i+1} w={64} h={90}/>)}
          </div>
        </DCArtboard>
      </DCSection>

      {/* ============ CLOCK ============ */}
      <DCSection id="clock" title="The clock"
        subtitle="6 segments · rotating Hand · per-segment rule glyph · chapter in the hub">

        <DCArtboard id="clock-alone" label="Clock face · interactive (click to rotate)"
          width={560} height={560}>
          <div style={{position:'relative', width:'100%', height:'100%',
                       display:'flex', alignItems:'center', justifyContent:'center',
                       background:'#F0EEE9'}}
               onClick={() => setHand1((p) => (p+1)%6)}>
            <Clock size={520} handPos={hand1}/>
            <div style={{position:'absolute', bottom:14, left:14,
                         font:'500 12px/1.2 Inter,sans-serif', color:'#5a4a2a',
                         background:'#FBF3DE', padding:'6px 10px', borderRadius:14,
                         border:`1.5px solid ${TT.ink}`}}>
              click → advance Hand to next segment ({hand1+1}/6)
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="clock-with-cards" label="Clock + placements · interactive"
          width={900} height={760}>
          <div style={{position:'relative', width:'100%', height:'100%',
                       display:'flex', alignItems:'center', justifyContent:'center',
                       background:'#F0EEE9'}}
               onClick={() => setHand2((p) => (p+1)%6)}>
            <ClockBoard size={640} handPos={hand2} placements={placementsA}/>
            <div style={{position:'absolute', bottom:14, left:14,
                         font:'500 12px/1.2 Inter,sans-serif', color:'#5a4a2a',
                         background:'#FBF3DE', padding:'6px 10px', borderRadius:14,
                         border:`1.5px solid ${TT.ink}`}}>
              up to 4 cards per segment · faceup cards visible on segments 1, 5
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="clock-fills" label="Clock · early game (sparse placements)"
          width={900} height={760}>
          <div style={{position:'relative', width:'100%', height:'100%',
                       display:'flex', alignItems:'center', justifyContent:'center',
                       background:'#F0EEE9'}}>
            <ClockBoard size={640} handPos={0} placements={[
              [{suit:'solar', value:4, faceUp:true}],
              [],
              [{suit:'lunar', value:8}],
              [],
              [{suit:'solar', value:11}],
              [],
            ]}/>
          </div>
        </DCArtboard>
      </DCSection>

      {/* ============ FULL BOARD ============ */}
      <DCSection id="board" title="Full play surface"
        subtitle="Clock at center · faceup tokens · player hand below · placement phase">

        <DCArtboard id="full-board" label="Mid-placement · player to act"
          width={1280} height={900}>
          <div style={{
            width:'100%', height:'100%',
            background:`
              radial-gradient(ellipse at 50% 30%, #FBF3DE 0%, #E8D9B3 55%, #C9A86A 100%)`,
            display:'flex', flexDirection:'column', alignItems:'center',
            padding:'24px 0 0',
            position:'relative', overflow:'hidden',
          }}>
            {/* corner ornaments */}
            <svg width="120" height="120" viewBox="0 0 100 100"
                 style={{position:'absolute', top:14, left:14, opacity:0.45}}>
              <path d="M5 5 Q50 25 95 5 M5 5 Q25 50 5 95" stroke={TT.goldDeep}
                strokeWidth="0.8" fill="none"/>
              <circle cx="5" cy="5" r="3" fill={TT.goldDeep} opacity="0.6"/>
            </svg>
            <svg width="120" height="120" viewBox="0 0 100 100"
                 style={{position:'absolute', top:14, right:14, opacity:0.45,
                         transform:'scaleX(-1)'}}>
              <path d="M5 5 Q50 25 95 5 M5 5 Q25 50 5 95" stroke={TT.goldDeep}
                strokeWidth="0.8" fill="none"/>
              <circle cx="5" cy="5" r="3" fill={TT.goldDeep} opacity="0.6"/>
            </svg>

            {/* test header */}
            <div style={{display:'flex', alignItems:'center', gap:12,
                         padding:'4px 18px', background:TT.lunarDeep, color:TT.goldLight,
                         border:`2px solid ${TT.ink}`, borderRadius:24,
                         boxShadow:'3px 3px 0 #1F1410',
                         fontFamily:"'Cormorant Garamond', serif"}}>
              <span style={{fontSize:14, letterSpacing:'0.22em', opacity:0.7}}>CHAPTER I</span>
              <span style={{fontSize:18, opacity:0.5}}>·</span>
              <span style={{fontSize:18, fontWeight:600}}>Clock 1 — Awakening</span>
              <span style={{fontSize:18, opacity:0.5}}>·</span>
              <span style={{fontSize:12, fontFamily:'Inter,sans-serif', opacity:0.85,
                            background:'rgba(229,197,126,0.18)', padding:'2px 8px',
                            borderRadius:8}}>placement phase</span>
            </div>

            {/* side tokens — reminder + bonus */}
            <div style={{position:'absolute', left:28, top:120,
                         display:'flex', flexDirection:'column', gap:14}}>
              <Token kind="reminder" count={3} label="3 face-up"/>
              <Token kind="bonus" state="off"/>
              <Token kind="bonus" state="off"/>
              <Token kind="bonus" state="off"/>
            </div>

            {/* turn pill — right */}
            <div style={{position:'absolute', right:28, top:120,
                         display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end'}}>
              <PlayerPip name="Ana"  color={TT.peach} active/>
              <PlayerPip name="Koji" color={TT.jade}/>
              <PlayerPip name="Sam"  color={TT.goldMid}/>
              <PlayerPip name="Lin"  color={TT.lunarMid}/>
            </div>

            {/* clock + placements */}
            <div style={{flex:1, display:'flex', alignItems:'center',
                         justifyContent:'center', marginTop:-10}}
                 onClick={() => setHand3((p) => (p+1)%6)}>
              <ClockBoard size={560} handPos={hand3} placements={placementsA}/>
            </div>

            {/* player hand */}
            <div style={{height:200, width:'100%', display:'flex',
                         alignItems:'flex-end', justifyContent:'center',
                         marginBottom:-30}}>
              <PlayerHand cards={sampleHand} hovered={hovered} onHover={setHovered}/>
            </div>
          </div>
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

/* ===========================================================
   Small bits — tokens, player pips
   =========================================================== */
function Token({ kind, count = 1, state = 'on', label }) {
  const isReminder = kind === 'reminder';
  const lit = state === 'on';
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <div style={{
        width:50, height:50, borderRadius:'50%',
        background: isReminder ? TT.lunarDeep : (lit ? TT.goldMid : '#bcae8c'),
        border:`2px solid ${TT.ink}`,
        boxShadow:'2px 3px 0 rgba(15,10,5,0.35)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: isReminder ? TT.goldLight : TT.ink,
        fontFamily:"'Cormorant Garamond', serif", fontWeight:700, fontSize:20,
      }}>
        {isReminder ? count : (lit ? '✦' : '·')}
      </div>
      {label && <span style={{fontSize:11, fontFamily:'Inter,sans-serif',
                              color:TT.solarInk, opacity:0.7}}>{label}</span>}
    </div>
  );
}

function PlayerPip({ name, color, active }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'4px 12px 4px 4px',
      background: active ? '#FBF3DE' : 'rgba(251,243,222,0.55)',
      border:`2px solid ${active ? TT.ink : 'rgba(31,20,16,0.25)'}`,
      borderRadius:24,
      boxShadow: active ? '2px 3px 0 #1F1410' : 'none',
    }}>
      <div style={{
        width:28, height:28, borderRadius:'50%', background:color,
        border:`1.5px solid ${TT.ink}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', font:'700 12px Inter,sans-serif',
      }}>{name[0]}</div>
      <span style={{font:`${active?700:500} 13px Inter,sans-serif`,
                    color:active ? TT.ink : 'rgba(31,20,16,0.7)'}}>
        {active ? `${name} · to play` : name}
      </span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
