/* take-time-levels.jsx
 * Rule glyph library + level data for chapters I–III.
 * Exposes on window:
 *   LEVELS       — array of level objects, each with rules per segment
 *   RuleGlyph    — <RuleGlyph rule={...} size={...}/> renders the right icon
 *   CenterGlyph  — same for clock-center rules
 *   ALL_RULES    — every rule type used so far, for the design catalog
 *   describeRule — human-readable label
 */

const TTL = {
  ink:       '#1F1410',
  paper:     '#FBF3DE',
  paperDeep: '#E5D3A4',
  gold:      '#C99339',
  goldDeep:  '#9C6E20',
  goldGlow:  '#F4DA9A',
  navy:      '#0C1F3D',
  navyMid:   '#173663',
  red:       '#C23A2A', // forbidden markers
  jade:      '#2E8F75',
};

/* tiny inline card icon used inside glyphs */
function MiniCard({suit='white', x=0, y=0, w=10, h=14, rot=0, value, dim=false}){
  const isW = suit === 'white';
  const bg = isW ? TTL.paper : TTL.navy;
  const fg = isW ? TTL.ink   : TTL.goldGlow;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={dim?0.4:1}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={1.6}
            fill={bg} stroke={TTL.ink} strokeWidth="0.9"/>
      {value != null && (
        <text x="0" y={h/2 - h*0.18} textAnchor="middle"
              fontFamily="'Cormorant Garamond', serif"
              fontWeight="600" fontSize={h*0.6} fill={fg}>{value}</text>
      )}
    </g>
  );
}

/* shared chrome behind every glyph */
function GlyphFrame({size=44, children, tone='paper'}){
  const bg  = tone === 'navy' ? TTL.navy : TTL.paper;
  const brd = TTL.goldDeep;
  return (
    <svg viewBox="-25 -25 50 50" width={size} height={size} style={{display:'block'}}>
      <circle r="22" fill={bg} stroke={TTL.ink} strokeWidth="1.4"/>
      <circle r="20" fill="none" stroke={brd} strokeWidth="0.6"/>
      {children}
    </svg>
  );
}

/* ============== INDIVIDUAL GLYPHS ============== */

const Glyphs = {
  // color-exact: e.g. "1w", "1b", "1w1b"
  'color-exact': ({rule, size}) => {
    const {white=0, black=0} = rule;
    const cards = [];
    for (let i=0; i<white; i++) cards.push('w');
    for (let i=0; i<black; i++) cards.push('b');
    const N = cards.length;
    return (
      <GlyphFrame size={size}>
        {cards.map((c,i) => {
          const off = (i - (N-1)/2) * 9;
          return <MiniCard key={i} suit={c==='w'?'white':'black'} x={off} y="-1"
            w="11" h="15" rot={(i-(N-1)/2)*-4}/>;
        })}
        <text x="0" y="14" textAnchor="middle" fontFamily="Inter,sans-serif"
              fontWeight="700" fontSize="7" fill={TTL.ink}>
          {white?`${white}w`:''}{(white&&black)?' · ':''}{black?`${black}b`:''}
        </text>
      </GlyphFrame>
    );
  },

  // count: "Nc" — exactly N cards
  'count': ({rule, size}) => (
    <GlyphFrame size={size}>
      <MiniCard suit="white" x="-7" y="-2" w="11" h="15" rot="-10"/>
      <MiniCard suit="black" x="0"  y="-3" w="11" h="15" rot="0"/>
      <MiniCard suit="white" x="7"  y="-2" w="11" h="15" rot="10"/>
      <text x="0" y="16" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="700" fontSize="11" fill={TTL.ink}>{rule.n}c</text>
    </GlyphFrame>
  ),

  // sum-range: [a,b]
  'sum-range': ({rule, size}) => (
    <GlyphFrame size={size}>
      <text x="0" y="-3" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="600" fontSize="11" fill={TTL.ink}
            style={{fontStyle:'italic'}}>Σ</text>
      <text x="0" y="13" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="700" fontSize="9" fill={TTL.ink}>
        {rule.min}–{rule.max}
      </text>
    </GlyphFrame>
  ),

  // sum-exact: =N
  'sum-exact': ({rule, size}) => (
    <GlyphFrame size={size}>
      <text x="0" y="3" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="600" fontSize="16" fill={TTL.ink}>{rule.value}</text>
      <text x="0" y="14" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="700" fontSize="6" fill={TTL.goldDeep}
            style={{letterSpacing:'0.1em'}}>SUM</text>
    </GlyphFrame>
  ),

  // turn n: T1, T2
  'turn': ({rule, size}) => (
    <GlyphFrame size={size}>
      <circle r="13" fill="none" stroke={TTL.goldDeep} strokeWidth="0.8"/>
      <path d="M 0 -13 A 13 13 0 0 1 11 -7" stroke={TTL.gold}
            strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <text x="0" y="4" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="700" fontSize="14" fill={TTL.ink}>T{rule.n}</text>
    </GlyphFrame>
  ),

  // turn-last
  'turn-last': ({size}) => (
    <GlyphFrame size={size}>
      <circle r="13" fill="none" stroke={TTL.goldDeep} strokeWidth="0.8"/>
      <path d="M 0 -13 A 13 13 0 1 1 -2 -13" stroke={TTL.gold}
            strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <polygon points="-4,-13 0,-9 -4,-5" fill={TTL.gold}/>
      <text x="0" y="5" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="700" fontSize="9" fill={TTL.ink}>LAST</text>
    </GlyphFrame>
  ),

  // closest-to N: |6| arrows pointing inward
  'closest-to': ({rule, size}) => (
    <GlyphFrame size={size}>
      <text x="0" y="6" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
            fontWeight="700" fontSize="22" fill={TTL.ink}>{rule.value}</text>
      <path d="M-18 0 L-12 0 M-15 -3 L-12 0 L-15 3" stroke={TTL.gold}
            strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 0 L12 0 M15 -3 L12 0 L15 3" stroke={TTL.gold}
            strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </GlyphFrame>
  ),

  // forbidden-values: x(1,2,3) — banned values
  'forbidden-values': ({rule, size}) => {
    const v = rule.values;
    return (
      <GlyphFrame size={size}>
        {v.map((val, i) => {
          const off = (i - (v.length-1)/2) * 9;
          return (
            <g key={i} transform={`translate(${off} -2)`}>
              <text x="0" y="2" textAnchor="middle"
                    fontFamily="'Cormorant Garamond',serif"
                    fontWeight="600" fontSize="9" fill={TTL.ink}>{val}</text>
            </g>
          );
        })}
        {/* big red ban circle + slash drawn ON TOP */}
        <circle r="15" fill="none" stroke={TTL.red} strokeWidth="2.4" opacity="0.92"/>
        <line x1="-11" y1="11" x2="11" y2="-11" stroke={TTL.red}
              strokeWidth="2.4" strokeLinecap="round" opacity="0.92"/>
      </GlyphFrame>
    );
  },

  // group-max
  'group-max': ({size}) => (
    <GlyphFrame size={size}>
      <path d="M 0 -14 L 6 -8 L 2 -8 L 2 6 L -2 6 L -2 -8 L -6 -8 Z"
            fill={TTL.gold} stroke={TTL.ink} strokeWidth="0.7"/>
      <text x="0" y="16" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="800" fontSize="7" fill={TTL.ink} style={{letterSpacing:'0.1em'}}>MAX</text>
    </GlyphFrame>
  ),
  'group-min': ({size}) => (
    <GlyphFrame size={size}>
      <path d="M 0 14 L 6 8 L 2 8 L 2 -6 L -2 -6 L -2 8 L -6 8 Z"
            fill={TTL.gold} stroke={TTL.ink} strokeWidth="0.7"/>
      <text x="0" y="-9" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="800" fontSize="7" fill={TTL.ink} style={{letterSpacing:'0.1em'}}>MIN</text>
    </GlyphFrame>
  ),

  // suit-max / suit-min — same arrow but tinted to suit
  'suit-max': ({rule, size}) => {
    const isW = rule.suit === 'white';
    return (
      <GlyphFrame size={size}>
        <MiniCard suit={rule.suit} x="0" y="2" w="14" h="20"/>
        <path d="M 0 -14 L 5 -9 L 2 -9 L 2 -5 L -2 -5 L -2 -9 L -5 -9 Z"
              fill={isW ? TTL.gold : TTL.goldGlow} stroke={TTL.ink} strokeWidth="0.6"/>
      </GlyphFrame>
    );
  },
  'suit-min': ({rule, size}) => {
    const isW = rule.suit === 'white';
    return (
      <GlyphFrame size={size}>
        <MiniCard suit={rule.suit} x="0" y="-2" w="14" h="20"/>
        <path d="M 0 14 L 5 9 L 2 9 L 2 5 L -2 5 L -2 9 L -5 9 Z"
              fill={isW ? TTL.gold : TTL.goldGlow} stroke={TTL.ink} strokeWidth="0.6"/>
      </GlyphFrame>
    );
  },
};

/* center-of-clock rules */
const CenterGlyphs = {
  'no-24-cap': ({size}) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TTL.paper} stroke={TTL.ink} strokeWidth="1.5"/>
      <circle r="23" fill="none" stroke={TTL.goldDeep} strokeWidth="0.6"/>
      <path d="M -16 0 C -16 -10 -6 -10 -6 0 C -6 10 -16 10 -16 0 Z
               M  16 0 C  16  10  6  10  6 0 C  6 -10  16 -10  16 0 Z
               M  -6 0 L 6 0"
            fill="none" stroke={TTL.goldDeep} strokeWidth="3" strokeLinecap="round"/>
      <path d="M -16 0 C -16 -10 -6 -10 -6 0 C -6 10 -16 10 -16 0 Z
               M  16 0 C  16  10  6  10  6 0 C  6 -10  16 -10  16 0 Z"
            fill="none" stroke={TTL.gold} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  'no-faceup': ({size}) => (
    <svg viewBox="-30 -30 60 60" width={size} height={size}>
      <circle r="26" fill={TTL.paper} stroke={TTL.ink} strokeWidth="1.5"/>
      <circle r="23" fill="none" stroke={TTL.goldDeep} strokeWidth="0.6"/>
      {/* an eye */}
      <path d="M -18 0 Q 0 -14 18 0 Q 0 14 -18 0 Z" fill="none"
            stroke={TTL.ink} strokeWidth="1.4"/>
      <circle r="6" fill={TTL.ink}/>
      <circle r="2.5" fill={TTL.goldGlow}/>
      {/* slash */}
      <line x1="-20" y1="20" x2="20" y2="-20" stroke={TTL.red} strokeWidth="3.2"
            strokeLinecap="round"/>
    </svg>
  ),
};

/* ============== PUBLIC ============== */

function RuleGlyph({rule, size=44}){
  if (!rule) return null;
  const G = Glyphs[rule.type];
  if (!G) return (
    <GlyphFrame size={size}>
      <text x="0" y="4" textAnchor="middle" fontFamily="Inter,sans-serif"
            fontWeight="700" fontSize="8" fill={TTL.red}>?</text>
    </GlyphFrame>
  );
  return <G rule={rule} size={size}/>;
}

function CenterGlyph({rule, size=80}){
  if (!rule) return null;
  const G = CenterGlyphs[rule.type];
  if (!G) return null;
  return <G rule={rule} size={size}/>;
}

function describeRule(r){
  if (!r) return '';
  switch (r.type) {
    case 'color-exact':
      return [r.white && `${r.white} white`, r.black && `${r.black} black`]
        .filter(Boolean).join(', ') + ' only';
    case 'count':            return `exactly ${r.n} cards`;
    case 'sum-range':        return `sum ${r.min}–${r.max}`;
    case 'sum-exact':        return `sum = ${r.value}`;
    case 'turn':             return `must be played on turn ${r.n}`;
    case 'turn-last':        return `last card placed by group`;
    case 'closest-to':       return `closest in value to ${r.value}`;
    case 'forbidden-values': return `no card of value ${r.values.join(', ')}`;
    case 'group-max':        return `group's highest card must be here`;
    case 'group-min':        return `group's lowest card must be here`;
    case 'suit-max':         return `${r.suit} suit's highest must be here`;
    case 'suit-min':         return `${r.suit} suit's lowest must be here`;
    case 'no-24-cap':        return `segment sums may exceed 24`;
    case 'no-faceup':        return `no faceup cards allowed`;
    default:                 return r.type;
  }
}

/* ============== LEVELS ============== */
/* Each level: 6 segments (1-indexed by source, stored 0-indexed here).
 * `segments[i]` is an array of rules; empty = unrestricted.
 * `center` is the clock-wide rule (optional).
 * `hand` is the starting-segment behaviour:
 *   'fixed-1'  -> printed hand at segment 1, not adjustable
 *   'discuss'  -> chosen in Discussion phase (Chapter III+)
 *   'movable'  -> can be re-pointed after Resolution (Chapter III)
 */
const LEVELS = [
  // ---------- CHAPTER I — Awakening ----------
  { id:'I-1', chapter:'I', chapterName:'Awakening', test:1,
    center: {type:'no-24-cap'}, hand:'fixed-1',
    segments:[
      [{type:'color-exact', white:1, black:0}], [], [], [], [],
      [{type:'count', n:3}],
    ]},
  { id:'I-2', chapter:'I', chapterName:'Awakening', test:2,
    center: {type:'no-24-cap'}, hand:'fixed-1',
    segments:[
      [], [], [{type:'sum-range', min:8, max:12}], [{type:'count', n:3}], [], [],
    ]},
  { id:'I-3', chapter:'I', chapterName:'Awakening', test:3,
    center: {type:'no-24-cap'}, hand:'fixed-1',
    segments:[
      [],
      [{type:'turn', n:2}],
      [{type:'turn', n:1}],
      [], [],
      [{type:'sum-range', min:20, max:30}],
    ]},
  { id:'I-4', chapter:'I', chapterName:'Awakening', test:4,
    center: null, hand:'fixed-1',
    segments:[
      [{type:'closest-to', value:6}], [], [],
      [{type:'color-exact', white:1, black:1}], [], [],
    ]},

  // ---------- CHAPTER II — Limitation ----------
  { id:'II-1', chapter:'II', chapterName:'Limitation', test:1,
    center: null, hand:'fixed-1',
    segments:[
      [{type:'forbidden-values', values:[1,2,3]}],
      [{type:'forbidden-values', values:[1,2,3]}],
      [{type:'forbidden-values', values:[1,2,3]}],
      [], [], [],
    ]},
  { id:'II-2', chapter:'II', chapterName:'Limitation', test:2,
    center: null, hand:'fixed-1',
    segments:[
      [], [],
      [{type:'forbidden-values', values:[7,8,9]}],
      [{type:'forbidden-values', values:[7,8,9]}],
      [], [],
    ]},
  { id:'II-3', chapter:'II', chapterName:'Limitation', test:3,
    center: null, hand:'fixed-1',
    segments:[
      [{type:'forbidden-values', values:[1,2,3]}],
      [],
      [{type:'forbidden-values', values:[4,5,6]}],
      [{type:'forbidden-values', values:[7,8,9]}],
      [],
      [{type:'forbidden-values', values:[10,11,12]}],
    ]},
  { id:'II-4', chapter:'II', chapterName:'Limitation', test:4,
    center: {type:'no-faceup'}, hand:'fixed-1',
    segments:[ [], [], [], [], [], [] ]},

  // ---------- CHAPTER III — As within, so without ----------
  // hand: 'discuss' (chosen by group during Discussion, locked through Placement,
  // can rotate after Resolution to optimize ascending order from any start).
  { id:'III-1', chapter:'III', chapterName:'As within, so without', test:1,
    center: null, hand:'discuss',
    segments:[
      [{type:'group-max'}], [],
      [{type:'sum-exact', value:20}], [], [], [],
    ]},
  { id:'III-2', chapter:'III', chapterName:'As within, so without', test:2,
    center: null, hand:'discuss',
    segments:[
      [{type:'group-min'}],
      [{type:'turn-last'}], [],
      [{type:'group-min'}], [], [],
    ]},
  { id:'III-3', chapter:'III', chapterName:'As within, so without', test:3,
    center: null, hand:'discuss',
    segments:[
      [{type:'group-max'}], [],
      [{type:'group-min'}],
      [{type:'turn', n:1},{type:'turn', n:2}],
      [], [],
    ]},
  { id:'III-4', chapter:'III', chapterName:'As within, so without', test:4,
    center: null, hand:'discuss',
    segments:[
      [{type:'suit-max', suit:'black'}], [],
      [{type:'count', n:2}],
      [{type:'closest-to', value:6}],
      [{type:'suit-min', suit:'white'}], [],
    ]},
];

/* every rule type used so far — for the design-system catalog */
const ALL_RULES = [
  {type:'color-exact', white:1, black:0},
  {type:'color-exact', white:0, black:1},
  {type:'color-exact', white:1, black:1},
  {type:'count', n:2},
  {type:'count', n:3},
  {type:'sum-range', min:8, max:12},
  {type:'sum-range', min:20, max:30},
  {type:'sum-exact', value:20},
  {type:'turn', n:1},
  {type:'turn', n:2},
  {type:'turn-last'},
  {type:'closest-to', value:6},
  {type:'forbidden-values', values:[1,2,3]},
  {type:'forbidden-values', values:[4,5,6]},
  {type:'forbidden-values', values:[7,8,9]},
  {type:'forbidden-values', values:[10,11,12]},
  {type:'group-max'},
  {type:'group-min'},
  {type:'suit-max', suit:'white'},
  {type:'suit-max', suit:'black'},
  {type:'suit-min', suit:'white'},
  {type:'suit-min', suit:'black'},
];

const ALL_CENTER_RULES = [
  {type:'no-24-cap'},
  {type:'no-faceup'},
];

Object.assign(window, {
  LEVELS, RuleGlyph, CenterGlyph, describeRule,
  ALL_RULES, ALL_CENTER_RULES, TTL,
});
