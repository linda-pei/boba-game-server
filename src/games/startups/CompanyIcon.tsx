import type { StartupsCompany } from "../../types";
import { COMPANY_COLOR, COMPANY_GLYPH } from "./deck";

interface Props {
  company: StartupsCompany;
  size?: number;
}

/** Round badge with the company glyph centred on its accent colour. */
export default function CompanyIcon({ company, size = 28 }: Props) {
  return (
    <span
      className="su-company-icon"
      style={{
        width: size,
        height: size,
        background: COMPANY_COLOR[company],
        fontSize: size * 0.6,
      }}
      aria-label={company}
    >
      {COMPANY_GLYPH[company]}
    </span>
  );
}
