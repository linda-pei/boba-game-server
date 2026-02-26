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
    { id: "outside", label: "Outside all", rings: [] },
  ];
}

export function findZone(zones: Zone[], rings: number[]): Zone | undefined {
  const key = rings.length === 0 ? "outside" : rings.slice().sort().join(",");
  return zones.find((z) => z.id === key);
}
