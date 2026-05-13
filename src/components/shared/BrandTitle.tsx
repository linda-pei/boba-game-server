import "./brand-title.css";

interface Props {
  /** "lg" = home-page hero; "md" = page header on lobby / set-username. */
  size?: "lg" | "md";
}

/** "Boba Game Time!" title with the boba-cup glyph. Shown on every non-in-game screen. */
export default function BrandTitle({ size = "md" }: Props) {
  return (
    <h1 className={`brand-title brand-title--${size}`}>
      <BobaCup />
      Boba Game Time!
    </h1>
  );
}

/** Inline boba cup logo using the shared `.gicon` style so the stroke weight + sticker
 *  feel match the game icons in the lobby. */
function BobaCup() {
  return (
    <svg className="gicon brand-cup" viewBox="0 0 80 100" aria-hidden="true">
      {/* Straw poking through the lid */}
      <rect
        x="40"
        y="2"
        width="8"
        height="32"
        rx="2"
        transform="rotate(12 44 18)"
        fill="var(--rose-500)"
      />
      {/* Lid */}
      <path d="M14 22 Q40 10 66 22 L62 30 L18 30 Z" fill="var(--milk-300)" />
      {/* Cup body */}
      <path d="M18 30 L62 30 L56 92 Q40 98 24 92 Z" fill="var(--milk-100)" />
      {/* Milk-tea fill — no stroke so it sits cleanly inside the cup */}
      <path
        className="nostroke"
        d="M22 33 L58 33 L54 88 Q40 92 26 88 Z"
        fill="var(--syrup-100)"
      />
      {/* Tapioca pearls */}
      <circle cx="30" cy="82" r="4" fill="var(--pearl)" />
      <circle cx="40" cy="86" r="4.5" fill="var(--pearl)" />
      <circle cx="50" cy="82" r="4" fill="var(--pearl)" />
      <circle cx="35" cy="74" r="3.5" fill="var(--pearl)" />
      <circle cx="46" cy="74" r="3.5" fill="var(--pearl)" />
    </svg>
  );
}
