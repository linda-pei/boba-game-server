import CardSVG from "./CardSVG";
import type { TakeTimePlacedCard } from "../../types";
import { toSuit } from "./theme";

interface Props {
  cards: TakeTimePlacedCard[];
  /** Angle in degrees for this slot's radial position */
  angle: number;
  /** Whether cards in this segment have been revealed */
  revealed?: boolean;
  /** Map of player uid → display name */
  playerNames?: Record<string, string>;
  /** Current user's uid */
  uid?: string;
}

/**
 * Fans cards horizontally outside a clock segment.
 * Each card is offset enough to be fully visible.
 */
export default function CardSlot({ cards, angle, revealed, playerNames, uid }: Props) {
  const N = Math.min(cards.length, 4);
  if (N === 0) return null;

  const CARD_W = 48;
  const SPACING = 40;

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
      {cards.slice(0, 4).map((card, i) => {
        const offset = i - (N - 1) / 2;
        const dx = offset * SPACING;
        const showValue = card.revealed || card.faceUp;

        const isYou = uid && card.playedBy === uid;
        const playerName = playerNames?.[card.playedBy] ?? card.playedBy;
        const tip = isYou
          ? `You — ${card.value}`
          : playerName;

        return (
          <div
            key={`${card.cardId}-${i}`}
            className="tt-glyph-tip"
            data-tip={tip}
            style={{
              position: i === 0 ? "relative" : "absolute",
              left: `calc(50% + ${dx}px)`,
              transform: "translateX(-50%)",
              zIndex: i,
            }}
          >
            <CardSVG
              suit={toSuit(card.color)}
              value={showValue ? card.value : 1}
              faceUp={showValue}
              w={CARD_W}
              h={67}
            />
          </div>
        );
      })}
    </div>
  );
}
