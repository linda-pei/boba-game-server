import type { FruitCard } from "../../types";
import FruitIcon from "./FruitIcon";

interface Props {
  card: FruitCard;
  /** Width in px. Height is auto from CSS aspect-ratio. */
  width?: number;
}

/**
 * A small rectangle card showing a fruit's value or, for star/cat cards, an icon.
 * Used inside stack visuals.
 */
export default function MiniCard({ card, width }: Props) {
  const widthStyle = width ? { width } : undefined;

  if (card.kind === "fruit" && card.suit) {
    return (
      <div
        className={`fb-mini fb-mini--fruit fb-mini--${card.suit}`}
        style={widthStyle}
      >
        <span className="fb-mini-value">{card.value}</span>
        <FruitIcon suit={card.suit} size={(width ?? 28) * 0.6} />
      </div>
    );
  }

  if (card.kind === "star") {
    return (
      <div className="fb-mini fb-mini--star" style={widthStyle}>
        <FruitIcon suit="star" size={(width ?? 28) * 0.65} />
      </div>
    );
  }

  // cat
  return (
    <div className="fb-mini fb-mini--cat" style={widthStyle}>
      <FruitIcon suit="cat" size={(width ?? 28) * 0.65} />
    </div>
  );
}
