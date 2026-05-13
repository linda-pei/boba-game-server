import type { FruitCard } from "../../types";
import MiniCard from "./MiniCard";

interface Props {
  cards: FruitCard[];
  selectedIds?: Set<string>;
  onToggle?: (cardId: string) => void;
  /** If provided, cards NOT in this set are disabled + dimmed (e.g. non-cats in Cat mode). */
  eligibleIds?: Set<string>;
}

/**
 * Fanned hand display. Cards outside `eligibleIds` (when provided) are dimmed
 * and not clickable.
 */
export default function HandDisplay({ cards, selectedIds, onToggle, eligibleIds }: Props) {
  return (
    <div className="fb-hand">
      {cards.length === 0 && <span className="fb-hand-empty">Empty hand</span>}
      {cards.map((c, i) => {
        const isSelected = selectedIds?.has(c.id);
        const isEligible = !eligibleIds || eligibleIds.has(c.id);
        const interactive = !!onToggle && isEligible;
        const offset = i - (cards.length - 1) / 2;
        const tilt = offset * 3;
        const dy = Math.abs(offset) * 4;
        return (
          <button
            key={c.id}
            type="button"
            className={[
              "fb-hand-card",
              isSelected && "is-selected",
              !isEligible && "is-ineligible",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              transform: `translateY(${dy}px) rotate(${tilt}deg)${isSelected ? " translateY(-10px)" : ""}`,
              transformOrigin: "50% 100%",
              zIndex: i,
              cursor: interactive ? "pointer" : "default",
            }}
            onClick={interactive ? () => onToggle!(c.id) : undefined}
            disabled={!interactive}
          >
            <MiniCard card={c} width={56} />
          </button>
        );
      })}
    </div>
  );
}
