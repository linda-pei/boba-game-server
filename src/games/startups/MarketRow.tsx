import type { StartupsCompany, StartupsMarketStall } from "../../types";
import MiniCard from "./MiniCard";

interface Props {
  market: StartupsMarketStall[];
  deckSize: number;
  /** Companies the viewing player holds the anti-monopoly chip for. Disables those stalls. */
  blockedCompanies: Set<StartupsCompany>;
  /** Click handler for a stall. If not provided, stalls are non-interactive. */
  onStallClick?: (stallId: string) => void;
  /** Click handler for the deck. If not provided, the deck is non-interactive. */
  onDeckClick?: () => void;
  /** Per-card silver cost to draw from the deck right now (display only). */
  deckCost?: number;
  /** Whether the deck draw is currently allowed (e.g. enough silver). Controls disabled styling. */
  deckEnabled?: boolean;
}

export default function MarketRow({
  market,
  deckSize,
  blockedCompanies,
  onStallClick,
  onDeckClick,
  deckCost,
  deckEnabled,
}: Props) {
  return (
    <div className="su-market">
      <button
        type="button"
        className={`su-deck${onDeckClick && deckEnabled ? "" : " is-disabled"}`}
        onClick={onDeckClick && deckEnabled ? onDeckClick : undefined}
        disabled={!onDeckClick || !deckEnabled}
      >
        <div className="su-deck-back" />
        <div className="su-deck-label">
          <div className="su-deck-count">{deckSize}</div>
          <div className="su-deck-meta">in deck</div>
          {typeof deckCost === "number" && (
            <div className="su-deck-cost">
              {deckCost === 0 ? "free" : `costs ${deckCost}`}
            </div>
          )}
        </div>
      </button>

      <div className="su-market-stalls">
        {market.length === 0 && (
          <div className="su-market-empty">Market is empty</div>
        )}
        {market.map((stall) => {
          const blocked = blockedCompanies.has(stall.card.company);
          return (
            <button
              key={stall.id}
              type="button"
              className={`su-stall${blocked ? " is-blocked" : ""}${onStallClick && !blocked ? " is-clickable" : ""}`}
              onClick={
                onStallClick && !blocked ? () => onStallClick(stall.id) : undefined
              }
              disabled={!onStallClick || blocked}
              title={blocked ? "You hold the anti-monopoly chip for this company" : undefined}
            >
              <MiniCard card={stall.card} width={90} />
              {stall.chips > 0 && (
                <div className="su-stall-chips">
                  {Array.from({ length: Math.min(stall.chips, 5) }).map((_, i) => (
                    <div key={i} className="su-chip su-chip--silver" />
                  ))}
                  <span className="su-stall-chips-count">×{stall.chips}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
