import type { PathSpace, DeepSeaDiver } from "../../types";
import { generateSpiralCoords } from "./treasureDeck";
import { LEVEL_SHAPES, LEVEL_CLASSES } from "./constants";

interface Props {
  path: PathSpace[];
  divers: Record<string, DeepSeaDiver>;
  playerNames: Record<string, string>;
  currentPlayerUid: string;
  myUid: string;
}

const DIVER_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
];

/**
 * For each cell in the spiral, compute which borders are "walls" (edges with no
 * adjacent prev/next cell) vs "openings" (edges connecting to the next/previous
 * cell in the path). Walls get a visible border; openings get none.
 */
function computeBorderStyles(
  coords: { row: number; col: number }[],
  spiralIndex: number
): React.CSSProperties {
  const cur = coords[spiralIndex];
  const prev = spiralIndex > 0 ? coords[spiralIndex - 1] : null;
  const next = spiralIndex < coords.length - 1 ? coords[spiralIndex + 1] : null;

  // Check which directions have a neighbor in the sequence
  const hasTop = (prev && prev.row === cur.row - 1 && prev.col === cur.col) ||
                 (next && next.row === cur.row - 1 && next.col === cur.col);
  const hasBottom = (prev && prev.row === cur.row + 1 && prev.col === cur.col) ||
                    (next && next.row === cur.row + 1 && next.col === cur.col);
  const hasLeft = (prev && prev.col === cur.col - 1 && prev.row === cur.row) ||
                  (next && next.col === cur.col - 1 && next.row === cur.row);
  const hasRight = (prev && prev.col === cur.col + 1 && prev.row === cur.row) ||
                   (next && next.col === cur.col + 1 && next.row === cur.row);

  const wall = "1.5px solid var(--ds-wall-color)";
  const open = "none";

  return {
    borderTop: hasTop ? open : wall,
    borderBottom: hasBottom ? open : wall,
    borderLeft: hasLeft ? open : wall,
    borderRight: hasRight ? open : wall,
  };
}

export default function BoardPath({
  path,
  divers,
  playerNames,
  currentPlayerUid,
  myUid,
}: Props) {
  // Generate spiral: index 0 = submarine (center), 1..N = path positions
  const totalCells = path.length + 1;
  const coords = generateSpiralCoords(totalCells);

  // Calculate grid dimensions
  const maxRow = Math.max(...coords.map((c) => c.row));
  const maxCol = Math.max(...coords.map((c) => c.col));

  // Build a map of position -> diver UIDs for display
  const positionToDivers = new Map<number, string[]>();
  const playerUids = Object.keys(divers);
  for (const uid of playerUids) {
    const diver = divers[uid];
    if (diver.returned) continue;
    const pos = diver.position; // -1 = sub
    const existing = positionToDivers.get(pos) ?? [];
    existing.push(uid);
    positionToDivers.set(pos, existing);
  }

  // Assign stable colors to players
  const colorMap = new Map<string, string>();
  playerUids.forEach((uid, i) => {
    colorMap.set(uid, DIVER_COLORS[i % DIVER_COLORS.length]);
  });

  return (
    <div
      className="ds-board"
      style={{
        gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`,
        gridTemplateRows: `repeat(${maxRow + 1}, 1fr)`,
      }}
    >
      {/* Submarine at center (spiral index 0) */}
      <div
        className="ds-cell ds-submarine"
        style={{
          gridRow: coords[0].row + 1,
          gridColumn: coords[0].col + 1,
          ...computeBorderStyles(coords, 0),
        }}
      >
        <span className="ds-sub-icon">🚢</span>
        {(positionToDivers.get(-1) ?? []).map((uid) => (
          <span
            key={uid}
            className={`ds-diver-token${uid === myUid ? " ds-my-diver" : ""}`}
            style={{ backgroundColor: colorMap.get(uid) }}
            title={playerNames[uid]}
          >
            {(playerNames[uid] ?? "?")[0]}
          </span>
        ))}
      </div>

      {/* Path spaces */}
      {path.map((space, idx) => {
        const coordIdx = idx + 1; // offset by 1 for submarine
        if (coordIdx >= coords.length) return null;
        const { row, col } = coords[coordIdx];
        const diversHere = positionToDivers.get(idx) ?? [];

        let spaceClass = "ds-cell ";
        let content: React.ReactNode = null;

        if (space.type === "treasure") {
          spaceClass += `ds-treasure ${LEVEL_CLASSES[space.level!]}`;
          content = <span className="ds-shape">{LEVEL_SHAPES[space.level!]}</span>;
        } else if (space.type === "blank") {
          spaceClass += "ds-blank";
        } else if (space.type === "stack") {
          const levels = space.stackLevels ?? [];
          spaceClass += "ds-stack";
          content = (
            <span className="ds-stack-shapes" title={`Stack of ${levels.length}`}>
              {levels.map((lv, i) => (
                <span key={i} className={`ds-stack-shape ${LEVEL_CLASSES[lv]}`}>
                  {LEVEL_SHAPES[lv]}
                </span>
              ))}
            </span>
          );
        }

        return (
          <div
            key={idx}
            className={spaceClass}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              ...computeBorderStyles(coords, coordIdx),
            }}
          >
            {content}
            <span className="ds-cell-index">{idx + 1}</span>
            {diversHere.map((uid) => (
              <span
                key={uid}
                className={`ds-diver-token${uid === myUid ? " ds-my-diver" : ""}`}
                style={{ backgroundColor: colorMap.get(uid) }}
                title={playerNames[uid]}
              >
                {(playerNames[uid] ?? "?")[0]}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
