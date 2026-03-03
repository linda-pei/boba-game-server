import {
  getCircles,
  getZoneGeometries,
  getZoneFill,
  RING_COLORS,
  RING_CATEGORIES,
} from "./vennPaths";
import type { Zone } from "./zones";
import { findZone, getZones } from "./zones";

interface PlayedCardInfo {
  cardId: string;
  rings: number[];
}

interface Props {
  ringLabels: string[];
  showClues?: boolean;
  playedCards?: PlayedCardInfo[];
  pendingPlay?: { cardId: string; rings: number[] } | null;
  onZoneClick?: (rings: number[]) => void;
  interactive?: boolean;
}

export default function RingDisplay({
  ringLabels,
  showClues = false,
  playedCards = [],
  pendingPlay,
  onZoneClick,
  interactive = false,
}: Props) {
  const circles = getCircles();
  const geometries = getZoneGeometries();
  const zones = getZones();

  // viewBox sized for 800x800 circle layout with generous padding
  const viewBox = "-60 -30 920 920";

  // Group played cards by zone id
  const cardsByZone: Record<string, string[]> = {};
  for (const card of playedCards) {
    const zone = findZone(zones, card.rings);
    const id = zone?.id ?? "outside";
    if (!cardsByZone[id]) cardsByZone[id] = [];
    cardsByZone[id].push(card.cardId);
  }

  // Pending play zone
  const pendingZoneId = pendingPlay
    ? findZone(zones, pendingPlay.rings)?.id ?? "outside"
    : null;

  function handleClick(zone: Zone) {
    if (interactive && onZoneClick) {
      onZoneClick(zone.rings);
    }
  }

  return (
    <div className="venn-container">
      {/* Ring category badges */}
      <div className="ring-info">
        {RING_CATEGORIES.map((cat, i) => (
          <span
            key={i}
            className="ring-badge"
            style={{ backgroundColor: RING_COLORS[i] }}
          >
            {showClues && ringLabels[i]
              ? `${cat}: ${ringLabels[i]}`
              : cat}
          </span>
        ))}
      </div>

      <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        {/* Background rect for "outside" zone */}
        <rect
          x="-60"
          y="-30"
          width="920"
          height="920"
          fill="transparent"
          className={`venn-outside${interactive ? " interactive" : ""}${pendingZoneId === "outside" ? " active" : ""}`}
          onClick={() => handleClick({ id: "outside", label: "None", rings: [] })}
        />

        {/* "Outside" hint when interactive */}
        {interactive && (
          <text
            x="15"
            y="855"
            fill="var(--text-light)"
            fontSize={18}
            fontStyle="italic"
            pointerEvents="none"
          >
            click here for None
          </text>
        )}

        {/* Zone fill paths — single rings first, then overlaps on top */}
        {[...geometries]
          .filter((g) => g.path && g.id !== "outside")
          .sort((a, b) => a.id.split(",").length - b.id.split(",").length)
          .map((geo) => (
            <path
              key={geo.id}
              d={geo.path}
              fill={getZoneFill(geo.id)}
              className={[
                "venn-zone",
                interactive ? "interactive" : "",
                pendingZoneId === geo.id ? "pending" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                const zone = zones.find((z) => z.id === geo.id);
                if (zone) handleClick(zone);
              }}
              fillRule="evenodd"
            />
          ))}

        {/* Circle outlines */}
        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke={RING_COLORS[i]}
            strokeWidth={3}
            pointerEvents="none"
          />
        ))}

        {/* Card chips inside zones via foreignObject */}
        {geometries.map((geo) => {

          const zoneCards = cardsByZone[geo.id] || [];
          const isPending = pendingPlay && pendingZoneId === geo.id;
          const allCards = isPending
            ? [...zoneCards, pendingPlay!.cardId]
            : zoneCards;

          if (allCards.length === 0) return null;

          // Size: up to 2 columns, stack vertically when many cards
          const cols = Math.min(allCards.length, 2);
          const rows = Math.ceil(allCards.length / 2);
          const chipWidth = cols * 100 + 10;
          const chipHeight = rows * 28 + 8;

          return (
            <foreignObject
              key={`cards-${geo.id}`}
              x={geo.centroid.x - chipWidth / 2}
              y={geo.centroid.y - chipHeight / 2}
              width={chipWidth}
              height={chipHeight}
              pointerEvents="none"
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "3px",
                }}
              >
                {allCards.map((cardId, i) => (
                  <span
                    key={`${cardId}-${i}`}
                    className="card-chip"
                    style={
                      isPending && i === allCards.length - 1
                        ? { borderColor: "var(--accent-primary)", fontStyle: "italic" }
                        : undefined
                    }
                  >
                    {cardId}
                  </span>
                ))}
              </div>
            </foreignObject>
          );
        })}

        {/* Ring category labels near circles — use foreignObject for text wrapping */}
        {circles.map((c, i) => {
          const labelText = showClues && ringLabels[i]
            ? `${RING_CATEGORIES[i]}: ${ringLabels[i]}`
            : RING_CATEGORIES[i];
          const labelWidth = 280;
          const labelHeight = 44;
          const labelY = i === 0
            ? c.cy - c.r - labelHeight - 4
            : c.cy + c.r + 8;
          return (
            <foreignObject
              key={`label-${i}`}
              x={c.cx - labelWidth / 2}
              y={labelY}
              width={labelWidth}
              height={labelHeight}
              pointerEvents="none"
            >
              <div
                style={{
                  color: RING_COLORS[i],
                  fontSize: "18px",
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: "1.2",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {labelText}
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
