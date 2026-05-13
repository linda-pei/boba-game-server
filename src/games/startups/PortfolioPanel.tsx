import type { StartupsCard, StartupsCompany } from "../../types";
import { COMPANIES, COMPANY_COLOR, COMPANY_GLYPH, COMPANY_SHORT } from "./deck";

interface Props {
  cards: StartupsCard[];
  /** Companies the owner currently holds the anti-monopoly chip for. */
  amCompanies?: Set<StartupsCompany>;
  /** Render compact (no card numbers — just a count). Used in opponent rows. */
  compact?: boolean;
}

/** Display a portfolio grouped by company. */
export default function PortfolioPanel({ cards, amCompanies, compact }: Props) {
  // Group by company.
  const groups: Partial<Record<StartupsCompany, StartupsCard[]>> = {};
  for (const c of cards) {
    (groups[c.company] ??= []).push(c);
  }

  const orderedCompanies = COMPANIES.filter((c) => (groups[c]?.length ?? 0) > 0);

  if (orderedCompanies.length === 0) {
    return (
      <div className="su-portfolio-empty">
        {compact ? "—" : "No shares yet"}
      </div>
    );
  }

  return (
    <div className={`su-portfolio${compact ? " su-portfolio--compact" : ""}`}>
      {orderedCompanies.map((company) => {
        const list = groups[company]!;
        const holdsAM = amCompanies?.has(company);
        return (
          <div
            key={company}
            className={`su-portfolio-group${holdsAM ? " has-am" : ""}`}
            style={{ background: COMPANY_COLOR[company] }}
          >
            <span className="su-portfolio-glyph">{COMPANY_GLYPH[company]}</span>
            <span className="su-portfolio-name">{COMPANY_SHORT[company]}</span>
            <span className="su-portfolio-count">×{list.length}</span>
            {holdsAM && (
              <span
                className="su-am-badge"
                title="Anti-monopoly chip"
                aria-label="Anti-monopoly chip"
              >
                AM
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
