// Pre-computed SVG geometry for 3-ring Venn diagrams.
// Coordinates are in a 800x800 viewBox for generous sizing.

export interface CircleLayout {
  cx: number;
  cy: number;
  r: number;
}

export interface ZoneGeometry {
  id: string;
  path: string;
  centroid: { x: number; y: number };
  ringIndex?: number;
}

const TWO_PI = 2 * Math.PI;

// --- Ring categories (always 3 rings) ---

export const RING_CATEGORIES = ["Context", "Attribute", "Word"] as const;

// Ring colors: Red = Context, Blue = Attribute, Green = Word
export const RING_COLORS = [
  "#E07A5F", // terracotta (context)
  "#3D85C6", // warm blue (attribute)
  "#81B29A", // sage green (word)
];

// --- Circle positions (3 rings, r=220 in 800x800 viewBox) ---

export const circles3: CircleLayout[] = [
  { cx: 400, cy: 280, r: 220 }, // context (top center)
  { cx: 280, cy: 490, r: 220 }, // attribute (bottom left)
  { cx: 520, cy: 490, r: 220 }, // word (bottom right)
];

// --- Arc helpers ---

function circleIntersections(
  c1: CircleLayout,
  c2: CircleLayout
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const dx = c2.cx - c1.cx;
  const dy = c2.cy - c1.cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > c1.r + c2.r || d < Math.abs(c1.r - c2.r) || d === 0) return null;

  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h = Math.sqrt(c1.r * c1.r - a * a);
  const mx = c1.cx + (a * dx) / d;
  const my = c1.cy + (a * dy) / d;

  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d },
  ];
}

function angle(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(py - cy, px - cx);
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  sweepPositive = true
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);

  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += TWO_PI;
  if (!sweepPositive) sweep = TWO_PI - sweep;
  const largeArc = sweep > Math.PI ? 1 : 0;
  const sweepFlag = sweepPositive ? 1 : 0;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function lensPath(c1: CircleLayout, c2: CircleLayout): string {
  const pts = circleIntersections(c1, c2);
  if (!pts) return "";
  const [p1, p2] = pts;

  const a1start = angle(c1.cx, c1.cy, p1.x, p1.y);
  const a1end = angle(c1.cx, c1.cy, p2.x, p2.y);
  const a2start = angle(c2.cx, c2.cy, p2.x, p2.y);
  const a2end = angle(c2.cx, c2.cy, p1.x, p1.y);

  const arc1 = arcPath(c1.cx, c1.cy, c1.r, a1start, a1end, true);
  const x2 = c2.cx + c2.r * Math.cos(a2start);
  const y2 = c2.cy + c2.r * Math.sin(a2start);

  let sweep2 = a2end - a2start;
  if (sweep2 < 0) sweep2 += TWO_PI;
  const large2 = sweep2 > Math.PI ? 1 : 0;

  return `${arc1} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${c2.r} ${c2.r} 0 ${large2} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function circlePath(c: CircleLayout): string {
  return `M ${c.cx - c.r} ${c.cy} A ${c.r} ${c.r} 0 1 1 ${c.cx + c.r} ${c.cy} A ${c.r} ${c.r} 0 1 1 ${c.cx - c.r} ${c.cy} Z`;
}

// --- 3-ring zones ---

export function getZoneGeometries(): ZoneGeometry[] {
  const [c1, c2, c3] = circles3;

  const pts12 = circleIntersections(c1, c2)!;
  const pts13 = circleIntersections(c1, c3)!;
  const pts23 = circleIntersections(c2, c3)!;

  function isInside(p: { x: number; y: number }, c: CircleLayout): boolean {
    const dx = p.x - c.cx;
    const dy = p.y - c.cy;
    return dx * dx + dy * dy < c.r * c.r + 0.1;
  }

  const triPoints: { x: number; y: number }[] = [];
  for (const p of pts12) if (isInside(p, c3)) triPoints.push(p);
  for (const p of pts13) if (isInside(p, c2)) triPoints.push(p);
  for (const p of pts23) if (isInside(p, c1)) triPoints.push(p);

  const triCx = triPoints.reduce((s, p) => s + p.x, 0) / triPoints.length;
  const triCy = triPoints.reduce((s, p) => s + p.y, 0) / triPoints.length;

  const sorted = [...triPoints].sort(
    (a, b) => angle(triCx, triCy, a.x, a.y) - angle(triCx, triCy, b.x, b.y)
  );

  function onCircle(p: { x: number; y: number }, c: CircleLayout): boolean {
    const dx = p.x - c.cx;
    const dy = p.y - c.cy;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - c.r) < 1;
  }

  function findSharedCircle(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): CircleLayout {
    for (const c of [c1, c2, c3]) {
      if (onCircle(p1, c) && onCircle(p2, c)) return c;
    }
    return c1;
  }

  function triArc(
    from: { x: number; y: number },
    to: { x: number; y: number },
    c: CircleLayout
  ): string {
    const a1 = angle(c.cx, c.cy, from.x, from.y);
    const a2 = angle(c.cx, c.cy, to.x, to.y);
    let sweep = a2 - a1;
    if (sweep < 0) sweep += TWO_PI;
    const large = sweep > Math.PI ? 1 : 0;
    return `A ${c.r} ${c.r} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }

  const triPath =
    `M ${sorted[0].x.toFixed(2)} ${sorted[0].y.toFixed(2)} ` +
    triArc(sorted[0], sorted[1], findSharedCircle(sorted[0], sorted[1])) +
    " " +
    triArc(sorted[1], sorted[2], findSharedCircle(sorted[1], sorted[2])) +
    " " +
    triArc(sorted[2], sorted[0], findSharedCircle(sorted[2], sorted[0])) +
    " Z";

  const lens12 = lensPath(c1, c2);
  const lens13 = lensPath(c1, c3);
  const lens23 = lensPath(c2, c3);

  // Pairwise centroids — explicitly positioned far from the triple center
  // "0,1" = Context & Attribute: push upper-left
  // "0,2" = Context & Word: push upper-right
  // "1,2" = Attribute & Word: push down
  const centroid12 = { x: triCx - 140, y: triCy - 70 }; // Context & Attribute → far left
  const centroid13 = { x: triCx + 140, y: triCy - 70 }; // Context & Word → far right
  const centroid23 = { x: triCx, y: triCy + 150 };       // Attribute & Word → far down

  // Single ring centroids: push far away from the overall center
  const centerX = 400;
  const centerY = 420;
  function singleCentroid(c: CircleLayout) {
    const dx = c.cx - centerX;
    const dy = c.cy - centerY;
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: c.cx + (dx / len) * 95, y: c.cy + (dy / len) * 95 };
  }

  return [
    { id: "0", path: circlePath(c1), centroid: singleCentroid(c1), ringIndex: 0 },
    { id: "1", path: circlePath(c2), centroid: singleCentroid(c2), ringIndex: 1 },
    { id: "2", path: circlePath(c3), centroid: singleCentroid(c3), ringIndex: 2 },
    { id: "0,1", path: lens12, centroid: centroid12 },
    { id: "0,2", path: lens13, centroid: centroid13 },
    { id: "1,2", path: lens23, centroid: centroid23 },
    { id: "0,1,2", path: triPath, centroid: { x: triCx, y: triCy } },
    { id: "outside", path: "", centroid: { x: 80, y: 830 } },
  ];
}

export function getCircles(): CircleLayout[] {
  return circles3;
}

// Zone fill colors
export function getZoneFill(id: string): string {
  if (id === "outside") return "transparent";
  if (id === "0") return "rgba(224,122,95,0.18)";
  if (id === "1") return "rgba(61,133,198,0.18)";
  if (id === "2") return "rgba(129,178,154,0.18)";
  if (id === "0,1") return "rgba(142,128,147,0.22)";
  if (id === "0,2") return "rgba(177,150,125,0.22)";
  if (id === "1,2") return "rgba(95,156,176,0.22)";
  if (id === "0,1,2") return "rgba(140,144,139,0.28)";
  return "transparent";
}
