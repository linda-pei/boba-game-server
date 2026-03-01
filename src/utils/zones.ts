export interface Zone {
  id: string;
  label: string;
  rings: number[];
}

export function getZones(): Zone[] {
  return [
    { id: "0", label: "Context only", rings: [0] },
    { id: "1", label: "Attribute only", rings: [1] },
    { id: "2", label: "Word only", rings: [2] },
    { id: "0,1", label: "Context & Attribute", rings: [0, 1] },
    { id: "0,2", label: "Context & Word", rings: [0, 2] },
    { id: "1,2", label: "Attribute & Word", rings: [1, 2] },
    { id: "0,1,2", label: "All three", rings: [0, 1, 2] },
    { id: "outside", label: "None", rings: [] },
  ];
}

export function findZone(zones: Zone[], rings: number[]): Zone | undefined {
  const key = rings.length === 0 ? "outside" : rings.slice().sort().join(",");
  return zones.find((z) => z.id === key);
}

/** Build played cards list in stable play order. */
export function getOrderedPlayedCards(
  ringAssignments: Record<string, number[]>,
  playedCards: Record<string, { playedBy: string; rings: number[] }>,
  playOrder: string[] | undefined
): { cardId: string; rings: number[] }[] {
  const allCards: Record<string, number[]> = {};
  for (const [cardId, rings] of Object.entries(ringAssignments || {})) {
    allCards[cardId] = rings;
  }
  for (const [cardId, info] of Object.entries(playedCards || {})) {
    allCards[cardId] = info.rings;
  }

  if (playOrder && playOrder.length > 0) {
    // Use playOrder for consistent ordering, then append any missing cards
    const ordered: { cardId: string; rings: number[] }[] = [];
    const seen = new Set<string>();
    for (const cardId of playOrder) {
      if (allCards[cardId]) {
        ordered.push({ cardId, rings: allCards[cardId] });
        seen.add(cardId);
      }
    }
    for (const cardId of Object.keys(allCards)) {
      if (!seen.has(cardId)) {
        ordered.push({ cardId, rings: allCards[cardId] });
      }
    }
    return ordered;
  }

  // Fallback: no playOrder (legacy games)
  return Object.entries(allCards).map(([cardId, rings]) => ({ cardId, rings }));
}
