import type { ScoutCard } from "../../types";

interface HandDisplayProps {
  cards: ScoutCard[];
  selectedIndices?: Set<number>;
  onToggle?: (index: number) => void;
  insertMode?: boolean;
  onInsert?: (index: number) => void;
  insertIndex?: number | null;
}

export default function HandDisplay({
  cards,
  selectedIndices,
  onToggle,
  insertMode,
  onInsert,
  insertIndex,
}: HandDisplayProps) {
  if (!insertMode) {
    return (
      <div className="scout-hand">
        {cards.map((card, i) => (
          <button
            key={`${card.id}-${i}`}
            className={`scout-card${selectedIndices?.has(i) ? " selected" : ""}`}
            onClick={() => onToggle?.(i)}
            disabled={!onToggle}
          >
            <span className="scout-card-top">{card.top}</span>
            <span className="scout-card-divider" />
            <span className="scout-card-bottom">{card.bottom}</span>
          </button>
        ))}
      </div>
    );
  }

  // Insert mode: cards with + slots positioned in the gaps between them
  return (
    <div className="scout-hand scout-hand-insert">
      <button
        className={`insert-slot${insertIndex === 0 ? " active" : ""}`}
        onClick={() => onInsert?.(0)}
      >
        +
      </button>
      {cards.map((card, i) => (
        <span key={`${card.id}-${i}`} className="scout-hand-insert-group">
          <button className="scout-card" disabled>
            <span className="scout-card-top">{card.top}</span>
            <span className="scout-card-divider" />
            <span className="scout-card-bottom">{card.bottom}</span>
          </button>
          <button
            className={`insert-slot${insertIndex === i + 1 ? " active" : ""}`}
            onClick={() => onInsert?.(i + 1)}
          >
            +
          </button>
        </span>
      ))}
    </div>
  );
}
