import type { StartupsCard } from "../../types";
import {
  COMPANY_COLOR,
  COMPANY_COUNT,
  COMPANY_INK,
  COMPANY_LABEL,
} from "./deck";
import CompanyLogo from "./CompanyLogo";

interface Props {
  card: StartupsCard;
  /** Width in px. Height derives from CSS aspect ratio. */
  width?: number;
}

export default function MiniCard({ card, width = 72 }: Props) {
  const total = COMPANY_COUNT[card.company];
  return (
    <div
      className="su-card"
      style={{
        width,
        background: COMPANY_COLOR[card.company],
        color: COMPANY_INK[card.company],
      }}
    >
      <div className="su-card-count">×{total}</div>
      <div className="su-card-logo">
        <CompanyLogo company={card.company} size={width * 0.46} />
      </div>
      <div className="su-card-name">{COMPANY_LABEL[card.company]}</div>
    </div>
  );
}
