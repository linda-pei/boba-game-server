import type { CloverTile } from "../../types";
import { CLOVER_WORD_BANK } from "./words";

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function rotateEdges(
  edges: [string, string, string, string],
  turns: number
): [string, string, string, string] {
  const steps = ((turns % 4) + 4) % 4;
  const arr = [...edges] as string[];

  for (let i = 0; i < steps; i++) {
    const last = arr.pop()!;
    arr.unshift(last);
  }

  return arr as [string, string, string, string];
}

export function makeTile(id: string, words: [string, string, string, string]): CloverTile {
  return {
    id,
    edges: words,
  };
}

export function generateCloverTiles(count: number): CloverTile[] {
  const deck: CloverTile[] = [];
  const pool = shuffle(CLOVER_WORD_BANK);

  for (let i = 0; i < count; i++) {
    const words: [string, string, string, string] = [
      pool[(i * 4) % pool.length],
      pool[(i * 4 + 1) % pool.length],
      pool[(i * 4 + 2) % pool.length],
      pool[(i * 4 + 3) % pool.length],
    ];

    deck.push(makeTile(`tile-${i + 1}`, words));
  }

  return shuffle(deck);
}