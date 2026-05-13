import type { StartupsCard, StartupsCompany } from "../../types";
import PortfolioPanel from "./PortfolioPanel";

interface Props {
  name: string;
  portfolio: StartupsCard[];
  silver: number;
  gold: number;
  handSize: number;
  amCompanies: Set<StartupsCompany>;
  isCurrent: boolean;
}

export default function OpponentPanel({
  name,
  portfolio,
  silver,
  gold,
  handSize,
  amCompanies,
  isCurrent,
}: Props) {
  return (
    <div className={`su-opponent${isCurrent ? " is-current" : ""}`}>
      <div className="su-opponent-head">
        <span className="su-opponent-name">{name}</span>
        <div className="su-opponent-stats">
          <span className="su-chip-stat">
            <span className="su-chip su-chip--silver" /> {silver}
          </span>
          {gold > 0 && (
            <span className="su-chip-stat">
              <span className="su-chip su-chip--gold" /> {gold}
            </span>
          )}
          <span className="su-opponent-hand">{handSize} card{handSize === 1 ? "" : "s"}</span>
        </div>
      </div>
      <PortfolioPanel cards={portfolio} amCompanies={amCompanies} compact />
    </div>
  );
}
