import CardSVG from "./CardSVG";
import type { TakeTimePlacedCard } from "../../types";
import { toSuit } from "./theme";

interface Props {
  cards: TakeTimePlacedCard[];
  /** Angle in degrees for this slot's radial position */
  angle: number;
  /** Whether cards in this segment have been revealed */
  revealed?: boolean;
}

/**
 * Fans up to 4 cards outside a clock segment.
 * Positioned absolutely by parent; this component handles internal fan layout.
 */
export default function CardSlot({ cards, angle, revealed }: Props) {
  const N = Math.min(cards.length, 4);
  if (N === 0) return null;

  const FAN = N === 1 ? 0 : 6; // degrees between cards
  const CARD_W = 52;
  const CARD_H = 72;

  return (
    <div
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: "translate(-50%, 0)",
          width: CARD_W + 40,
          height: 0,
        }}
      >
        {cards.slice(0, 4).map((card, i) => {
          const offset = i - (N - 1) / 2;
          const rot = offset * FAN;
          const dx = offset * 14;
          const dy = Math.abs(offset) * 3;
          const showValue = card.revealed || card.faceUp;

          return (
            <div
              key={`${card.cardId}-${i}`}
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot - angle}deg)`,
                transformOrigin: "50% 0%",
              }}
            >
              <CardSVG
                suit={toSuit(card.color)}
                value={showValue ? card.value : 1}
                faceUp={showValue}
                w={CARD_W}
                h={CARD_H}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
