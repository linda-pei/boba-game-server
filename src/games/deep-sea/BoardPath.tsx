import { useRef, useEffect, useState, useCallback } from "react";
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

function computeBorderStyles(
  coords: { row: number; col: number }[],
  spiralIndex: number
): React.CSSProperties {
  const cur = coords[spiralIndex];
  const prev = spiralIndex > 0 ? coords[spiralIndex - 1] : null;
  const next = spiralIndex < coords.length - 1 ? coords[spiralIndex + 1] : null;

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

/** Convert a diver position (-1 = sub) to a spiral coord index (0 = sub, 1+ = path). */
function posToCoordIdx(pos: number): number {
  return pos + 1;
}

const HOP_DURATION = 500; // ms per cell hop

export default function BoardPath({
  path,
  divers,
  playerNames,
  currentPlayerUid,
  myUid,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Record<string, number>>({});
  const [animatingDivers, setAnimatingDivers] = useState<
    Record<string, { left: number; top: number; hopping: boolean }>
  >({});

  const setCellRef = useCallback((coordIdx: number, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(coordIdx, el);
    else cellRefs.current.delete(coordIdx);
  }, []);

  // Get center position of a cell relative to the board
  const getCellCenter = useCallback((coordIdx: number) => {
    const board = boardRef.current;
    const cell = cellRefs.current.get(coordIdx);
    if (!board || !cell) return null;
    const boardRect = board.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      left: cellRect.left - boardRect.left + cellRect.width / 2,
      top: cellRect.top - boardRect.top + cellRect.height / 2,
    };
  }, []);

  // Detect position changes and animate
  useEffect(() => {
    const toAnimate: { uid: string; from: number; to: number }[] = [];

    for (const [uid, diver] of Object.entries(divers)) {
      const prev = prevPositions.current[uid];
      if (prev !== undefined && prev !== diver.position) {
        toAnimate.push({ uid, from: prev, to: diver.position });
      }
    }

    // Update prev positions
    const positions: Record<string, number> = {};
    for (const [uid, diver] of Object.entries(divers)) {
      positions[uid] = diver.position;
    }
    prevPositions.current = positions;

    if (toAnimate.length === 0) return;

    // For each moving diver, build the list of intermediate cells to hop through
    for (const { uid, from, to } of toAnimate) {
      const fromIdx = posToCoordIdx(from);
      const toIdx = posToCoordIdx(to);

      // Build path of coord indices to visit
      const steps: number[] = [];
      if (fromIdx < toIdx) {
        for (let i = fromIdx + 1; i <= toIdx; i++) steps.push(i);
      } else {
        for (let i = fromIdx - 1; i >= toIdx; i--) steps.push(i);
      }

      if (steps.length === 0) continue;

      // Start from the "from" cell position
      const startPos = getCellCenter(fromIdx);
      if (!startPos) continue;

      setAnimatingDivers((prev) => ({
        ...prev,
        [uid]: { left: startPos.left, top: startPos.top, hopping: true },
      }));

      // Animate through each step
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx >= steps.length) {
          clearInterval(interval);
          setAnimatingDivers((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          return;
        }

        const pos = getCellCenter(steps[stepIdx]);
        if (pos) {
          setAnimatingDivers((prev) => ({
            ...prev,
            [uid]: { left: pos.left, top: pos.top, hopping: true },
          }));
        }
        stepIdx++;
      }, HOP_DURATION);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.fromEntries(Object.entries(divers).map(([uid, d]) => [uid, d.position])))]);

  // Generate spiral and compact grid to remove empty rows/columns
  const totalCells = path.length + 1;
  const rawCoords = generateSpiralCoords(totalCells);

  // Find which rows and columns are actually used
  const usedRows = [...new Set(rawCoords.map((c) => c.row))].sort((a, b) => a - b);
  const usedCols = [...new Set(rawCoords.map((c) => c.col))].sort((a, b) => a - b);
  const rowMap = new Map(usedRows.map((r, i) => [r, i]));
  const colMap = new Map(usedCols.map((c, i) => [c, i]));

  const coords = rawCoords.map((c) => ({
    row: rowMap.get(c.row)!,
    col: colMap.get(c.col)!,
  }));
  const maxRow = usedRows.length - 1;
  const maxCol = usedCols.length - 1;

  // Build position -> diver UIDs map
  const positionToDivers = new Map<number, string[]>();
  const playerUids = Object.keys(divers);
  for (const uid of playerUids) {
    const diver = divers[uid];
    if (diver.returned) continue;
    const pos = diver.position;
    const existing = positionToDivers.get(pos) ?? [];
    existing.push(uid);
    positionToDivers.set(pos, existing);
  }

  // Assign stable colors based on sorted UIDs
  const colorMap = new Map<string, string>();
  [...playerUids].sort().forEach((uid, i) => {
    colorMap.set(uid, DIVER_COLORS[i % DIVER_COLORS.length]);
  });

  // Render a diver token (inline in cell, hidden if animating)
  const renderDiver = (uid: string) => {
    const isAnimating = uid in animatingDivers;
    return (
      <span
        key={uid}
        className={`ds-diver-token${uid === myUid ? " ds-my-diver" : ""}`}
        style={{
          backgroundColor: colorMap.get(uid),
          visibility: isAnimating ? "hidden" : "visible",
        }}
        title={playerNames[uid]}
      >
        {(playerNames[uid] ?? "?")[0]}
      </span>
    );
  };

  return (
    <div
      className="ds-board"
      ref={boardRef}
      style={{
        gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`,
        gridTemplateRows: `repeat(${maxRow + 1}, 1fr)`,
        position: "relative",
      }}
    >
      {/* Submarine at center */}
      <div
        className="ds-cell ds-submarine"
        ref={(el) => setCellRef(0, el)}
        style={{
          gridRow: coords[0].row + 1,
          gridColumn: coords[0].col + 1,
          ...computeBorderStyles(coords, 0),
        }}
      >
        <span className="ds-sub-icon">🚢</span>
        {(positionToDivers.get(-1) ?? []).map((uid) => renderDiver(uid))}
      </div>

      {/* Path spaces */}
      {path.map((space, idx) => {
        const coordIdx = idx + 1;
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
            ref={(el) => setCellRef(coordIdx, el)}
            className={spaceClass}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              ...computeBorderStyles(coords, coordIdx),
            }}
          >
            {content}
            <span className="ds-cell-index">{idx + 1}</span>
            {diversHere.map((uid) => renderDiver(uid))}
          </div>
        );
      })}

      {/* Animated diver overlays */}
      {Object.entries(animatingDivers).map(([uid, pos]) => (
        <span
          key={`anim-${uid}`}
          className={`ds-diver-token ds-diver-floating${uid === myUid ? " ds-my-diver" : ""}`}
          style={{
            backgroundColor: colorMap.get(uid),
            left: pos.left,
            top: pos.top,
          }}
        >
          {(playerNames[uid] ?? "?")[0]}
        </span>
      ))}
    </div>
  );
}
