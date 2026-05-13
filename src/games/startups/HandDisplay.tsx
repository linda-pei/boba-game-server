import type { StartupsCard } from "../../types";
import MiniCard from "./MiniCard";

interface Props {
  cards: StartupsCard[];
  selectedId?: string | null;
  onSelect?: (cardId: string) => void;
}

export default function HandDisplay({ cards, selectedId, onSelect }: Props) {
  return (
    <div className="su-hand">
      {cards.length === 0 && <span className="su-hand-empty">Empty hand</span>}
      {cards.map((c, i) => {
        const isSelected = c.id === selectedId;
        const offset = i - (cards.length - 1) / 2;
        const tilt = offset * 3;
        const dy = Math.abs(offset) * 4;
        return (
          <button
            key={c.id}
            type="button"
            className={`su-hand-card${isSelected ? " is-selected" : ""}`}
            style={{
              transform: `translateY(${dy}px) rotate(${tilt}deg)${isSelected ? " translateY(-10px)" : ""}`,
              transformOrigin: "50% 100%",
              zIndex: i,
              cursor: onSelect ? "pointer" : "default",
            }}
            onClick={onSelect ? () => onSelect(c.id) : undefined}
            disabled={!onSelect}
          >
            <MiniCard card={c} width={68} />
          </button>
        );
      })}
    </div>
  );
}
