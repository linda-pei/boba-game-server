import type { TreasureChip, TreasureLevel, PathSpace } from "../../types";
import { shuffled } from "../../utils/shuffle";

/** Generate the 32 treasure chips: 8 per level, 2 of each point value. */
export function generateTreasureChips(): TreasureChip[] {
  const chips: TreasureChip[] = [];
  const levels: { level: TreasureLevel; basePoints: number }[] = [
    { level: 1, basePoints: 0 },
    { level: 2, basePoints: 4 },
    { level: 3, basePoints: 8 },
    { level: 4, basePoints: 12 },
  ];

  for (const { level, basePoints } of levels) {
    for (let v = 0; v < 4; v++) {
      for (let copy = 0; copy < 2; copy++) {
        chips.push({
          id: `L${level}-${basePoints + v}-${copy}`,
          level,
          points: basePoints + v,
        });
      }
    }
  }
  return chips;
}

/** Build initial path: shuffle within each level, concatenate L1 -> L2 -> L3 -> L4. */
export function buildInitialPath(chips: TreasureChip[]): PathSpace[] {
  const byLevel = new Map<TreasureLevel, TreasureChip[]>();
  for (const chip of chips) {
    const arr = byLevel.get(chip.level) ?? [];
    arr.push(chip);
    byLevel.set(chip.level, arr);
  }

  const path: PathSpace[] = [];
  for (const level of [1, 2, 3, 4] as TreasureLevel[]) {
    const levelChips = shuffled(byLevel.get(level) ?? []);
    for (const chip of levelChips) {
      path.push({ type: "treasure", level: chip.level, chipId: chip.id });
    }
  }
  return path;
}

/** Roll two Deep Sea dice. Each die has faces [1, 1, 2, 2, 3, 3]. */
export function rollDeepSeaDice(): [number, number] {
  const faces = [1, 1, 2, 2, 3, 3];
  const d1 = faces[Math.floor(Math.random() * 6)];
  const d2 = faces[Math.floor(Math.random() * 6)];
  return [d1, d2];
}

/** Calculate effective movement: max(sum of dice - carried, 0). */
export function calculateMovement(
  diceRoll: [number, number],
  carriedCount: number
): number {
  return Math.max(diceRoll[0] + diceRoll[1] - carriedCount, 0);
}

/**
 * Resolve movement along the path.
 * Returns the new position index after moving `steps` spaces.
 * Skips spaces occupied by other divers.
 * direction "down" = toward higher indices, "up" = toward lower indices.
 * Position -1 = on submarine.
 * Returns -1 if the diver reaches the submarine (heading up past position 0).
 */
export function resolveMovement(
  currentPos: number,
  steps: number,
  direction: "down" | "up",
  occupiedPositions: Set<number>,
  pathLength: number
): number {
  if (steps === 0) return currentPos;

  let pos = currentPos;
  let remaining = steps;
  const delta = direction === "down" ? 1 : -1;

  while (remaining > 0) {
    pos += delta;

    // Heading up and passed the submarine
    if (direction === "up" && pos < 0) {
      return -1;
    }

    // Heading down and past the end of the path — clamp to last space
    if (direction === "down" && pos >= pathLength) {
      return pathLength - 1;
    }

    // Skip occupied spaces (don't count them as steps)
    if (occupiedPositions.has(pos)) {
      continue;
    }

    remaining--;
  }

  return pos;
}

/**
 * Stack dropped treasures at end of path.
 * Every 3 chips form one stack space; remainder form a partial stack.
 * Includes level info for display.
 */
export function stackDroppedTreasures(
  path: PathSpace[],
  droppedChips: { id: string; level: TreasureLevel }[]
): PathSpace[] {
  if (droppedChips.length === 0) return path;

  const newPath = [...path];
  for (let i = 0; i < droppedChips.length; i += 3) {
    const batch = droppedChips.slice(i, i + 3);
    newPath.push({
      type: "stack",
      stackChipIds: batch.map((c) => c.id),
      stackLevels: batch.map((c) => c.level),
    });
  }
  return newPath;
}

/** Remove all blank spaces and close gaps. */
export function compactPath(path: PathSpace[]): PathSpace[] {
  return path.filter((space) => space.type !== "blank");
}

/** Generate square spiral coordinates from center outward (clockwise). */
export function generateSpiralCoords(count: number): { row: number; col: number }[] {
  const coords: { row: number; col: number }[] = [];

  // Determine grid size needed — spiral fills an (2n+1) x (2n+1) grid
  // We need at least count + 1 cells (count for path + 1 for submarine center)
  const totalCells = count + 1;
  const side = Math.ceil(Math.sqrt(totalCells));
  const halfSide = Math.floor(side / 2);
  // Ensure we have a large enough grid
  const n = halfSide + 1;

  // Start at center
  let r = 0, c = 0;
  coords.push({ row: r, col: c }); // submarine position

  // Spiral outward: right, down, left, up — increasing lengths
  let step = 1;
  while (coords.length < totalCells) {
    // Right
    for (let i = 0; i < step && coords.length < totalCells; i++) {
      c += 1;
      coords.push({ row: r, col: c });
    }
    // Down
    for (let i = 0; i < step && coords.length < totalCells; i++) {
      r += 1;
      coords.push({ row: r, col: c });
    }
    step++;
    // Left
    for (let i = 0; i < step && coords.length < totalCells; i++) {
      c -= 1;
      coords.push({ row: r, col: c });
    }
    // Up
    for (let i = 0; i < step && coords.length < totalCells; i++) {
      r -= 1;
      coords.push({ row: r, col: c });
    }
    step++;
  }

  // Normalize: shift so minimum row/col is 0
  const minRow = Math.min(...coords.map((c) => c.row));
  const minCol = Math.min(...coords.map((c) => c.col));
  return coords.map((c) => ({ row: c.row - minRow, col: c.col - minCol }));
}
