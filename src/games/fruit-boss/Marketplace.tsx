import type { FruitCard, FruitStack } from "../../types";
import MiniCard from "./MiniCard";
import Stack from "./Stack";

interface Props {
  market: (FruitStack | null)[];
  deckSize: number;
  discard: FruitCard[];
  /** Click on the entire stall (used for Add, Combine, Slide). */
  onStallClick?: (stallIdx: number) => void;
  /** Click on an individual card within a stall (used for Cat). */
  onCardClick?: (stallIdx: number, cardId: string) => void;
  /** Stalls considered legal targets for the current action. Empty / undefined = no highlighting. */
  validStalls?: Set<number>;
  /** Optional stall to highlight as "currently selected" (e.g. Combine source). */
  selectedStallIdx?: number | null;
  /** Optional stall that just had cards placed into it (pending collect/topple). */
  justPlacedStallIdx?: number | null;
}

export default function Marketplace({
  market,
  deckSize,
  discard,
  onStallClick,
  onCardClick,
  validStalls,
  selectedStallIdx,
  justPlacedStallIdx,
}: Props) {
  return (
    <div className="fb-marketplace">
      <div className="fb-stalls">
        {market.map((stack, i) => {
          const valid = validStalls?.has(i);
          const clickable = !!onStallClick && valid && !onCardClick;
          return (
            <div
              key={i}
              className={[
                "fb-stall",
                !stack && "is-empty",
                selectedStallIdx === i && "is-selected",
                justPlacedStallIdx === i && "is-just-placed",
                valid && "is-valid",
                !valid && validStalls && "is-blocked",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={clickable ? () => onStallClick!(i) : undefined}
              role={clickable ? "button" : undefined}
            >
              <span className="fb-stall-label">{i + 1}</span>
              {stack ? (
                <Stack
                  stack={stack}
                  mode="cards"
                  onCardClick={
                    onCardClick && valid ? (cardId) => onCardClick(i, cardId) : undefined
                  }
                />
              ) : (
                <span className="fb-stall-empty">empty</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="fb-market-meta">
        <div className="fb-deck-pile" title={`${deckSize} cards in the draw deck`}>
          <div className="fb-deck-back" />
          <span className="fb-pile-count">Deck · {deckSize}</span>
        </div>
        <div className="fb-discard-pile" tabIndex={discard.length > 0 ? 0 : -1}>
          {discard.length === 0 ? (
            <div className="fb-discard-empty">empty</div>
          ) : (
            <div className="fb-discard-cards">
              {/* Last few cards fanned slightly as the "preview". Hover/focus the
                  pile to see all discards. */}
              {discard.slice(-4).map((c, i, arr) => (
                <span
                  key={c.id}
                  className="fb-discard-card"
                  style={{ transform: `rotate(${(i - arr.length / 2) * 4}deg) translateY(${Math.abs(i - arr.length / 2) * 1.5}px)` }}
                >
                  <MiniCard card={c} width={28} />
                </span>
              ))}
            </div>
          )}
          <span className="fb-pile-count">Discard · {discard.length}</span>
          {discard.length > 0 && (
            <div className="fb-discard-popover" aria-hidden="true">
              <div className="fb-discard-popover-title">
                Discard ({discard.length})
              </div>
              <div className="fb-discard-popover-grid">
                {discard.map((c) => (
                  <MiniCard key={c.id} card={c} width={28} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
