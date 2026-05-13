import type { StartupsCard, StartupsCompany } from "../../types";
import { COMPANIES, COMPANY_COLOR, COMPANY_INK, COMPANY_SHORT } from "./deck";
import CompanyLogo from "./CompanyLogo";

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
            style={{
              background: COMPANY_COLOR[company],
              color: COMPANY_INK[company],
            }}
          >
            <span className="su-portfolio-glyph">
              <CompanyLogo company={company} size={compact ? 14 : 18} />
            </span>
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
