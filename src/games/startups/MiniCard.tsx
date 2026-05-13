import type { StartupsCard } from "../../types";
import {
  COMPANY_COLOR,
  COMPANY_COUNT,
  COMPANY_GLYPH,
  COMPANY_INK,
  COMPANY_SHORT,
} from "./deck";

interface Props {
  card: StartupsCard;
  /** Width in px. Height derives from CSS aspect ratio. */
  width?: number;
  /** When true, the card sits flat in a row (no rotation). */
  compact?: boolean;
}

/** Visual representation of a single Startups share card. */
export default function MiniCard({ card, width = 72, compact }: Props) {
  const total = COMPANY_COUNT[card.company];
  return (
    <div
      className={`su-card${compact ? " su-card--compact" : ""}`}
      style={{
        width,
        background: COMPANY_COLOR[card.company],
        color: COMPANY_INK[card.company],
      }}
    >
      <div className="su-card-glyph" style={{ fontSize: width * 0.55 }}>
        {COMPANY_GLYPH[card.company]}
      </div>
      <div className="su-card-name">{COMPANY_SHORT[card.company]}</div>
      <div className="su-card-num">
        {card.number}/{total}
      </div>
    </div>
  );
}
