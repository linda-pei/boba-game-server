import type { FruitStack } from "../../types";
import FruitIcon from "./FruitIcon";
import MiniCard from "./MiniCard";
import { SUIT_LABEL } from "./deck";
import { stackTopValue } from "./useFruitBossGame";

interface Props {
  stack: FruitStack;
  /**
   * "full"     = header (suit · ×N = total) + fanned mini-cards inline. Used in the player's own collection.
   * "compact"  = chip-only with hover/focus popover that reveals the cards. Used for opponent collections.
   * "cards"    = just the cards, slightly overlapping like a physical stack. Used in the marketplace —
   *              the ×N = total scoring meta is irrelevant until cards land in a collection.
   */
  mode?: "full" | "compact" | "cards";
  /** Mark this stack as scoring negatively (one of the surplus stacks beyond the top 3). */
  negative?: boolean;
  /** Used to render the empty/star-only fallback header. */
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  /** When provided in "cards" mode, each card becomes individually clickable (e.g. for Cat). */
  onCardClick?: (cardId: string) => void;
  /** Highlight specific card ids (e.g. eligible Cat targets). */
  cardHighlight?: Set<string>;
}

export default function Stack({
  stack,
  mode = "compact",
  negative,
  onClick,
  selected,
  onCardClick,
  cardHighlight,
}: Props) {
  const cardCount = stack.cards.length;
  const topValue = stackTopValue(stack);
  // Choose icon + label. Fruit suit wins; else fall back to star / cat depending on contents.
  const onlyCats = stack.cards.length > 0 && stack.cards.every((c) => c.kind === "cat");
  const displaySuit = stack.suit ?? (onlyCats ? "cat" : "star");
  const suitLabel = stack.suit
    ? SUIT_LABEL[stack.suit]
    : onlyCats
      ? "Cat"
      : "Star";
  const total = topValue * cardCount;

  const header = (
    <span className="fb-stack-header">
      <FruitIcon suit={displaySuit} size={mode === "full" ? 22 : 18} />
      <span className="fb-stack-meta">
        {suitLabel} ×{cardCount}
        {topValue > 0 && (
          <>
            {" = "}
            <span className={`fb-stack-total${negative ? " is-negative" : ""}`}>
              {negative ? "−" : ""}
              {total}
            </span>
          </>
        )}
      </span>
    </span>
  );

  const cardWidth =
    mode === "full" ? 32 : mode === "cards" ? 38 : 26;
  const cardsView = (
    <div className={`fb-stack-cards fb-stack-cards--${mode}`}>
      {stack.cards.map((c) =>
        onCardClick ? (
          <button
            key={c.id}
            type="button"
            className={`fb-stack-card-btn${cardHighlight?.has(c.id) ? " is-highlight" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(c.id);
            }}
          >
            <MiniCard card={c} width={cardWidth} />
          </button>
        ) : (
          <MiniCard key={c.id} card={c} width={cardWidth} />
        )
      )}
    </div>
  );

  if (mode === "cards") {
    return (
      <div
        className={[
          "fb-stack",
          "fb-stack--cards",
          negative && "is-negative",
          selected && "is-selected",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {cardsView}
      </div>
    );
  }

  if (mode === "full") {
    return (
      <div
        className={[
          "fb-stack",
          "fb-stack--full",
          negative && "is-negative",
          selected && "is-selected",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {header}
        {cardsView}
      </div>
    );
  }

  // Compact: button so it's keyboard-focusable; popover via :hover/:focus-within
  return (
    <button
      type="button"
      className={[
        "fb-stack",
        "fb-stack--compact",
        negative && "is-negative",
        selected && "is-selected",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      // Stack chips are informative-only in step 2; later steps will gate disabled state.
    >
      {header}
      <span className="fb-stack-popover" aria-hidden="true">
        {cardsView}
      </span>
    </button>
  );
}
