/** Color for each Scout card number value (1–10). */
const COLORS: Record<number, string> = {
  1:  "#1B3A8C",
  2:  "#2E6BC6",
  3:  "#5BA3D9",
  4:  "#3BA89E",
  5:  "#3DAA5C",
  6:  "#8CC63F",
  7:  "#D9C520",
  8:  "#DE9E26",
  9:  "#E8852E",
  10: "#D93B3B",
};

export function scoutCardColor(value: number): string {
  return COLORS[value] ?? "var(--ink)";
}

/** Returns CSS custom properties for the new two-tone scout card.
 *  Sets --top-color and --bottom-color to reference the token vars. */
export function scoutCardStyle(top: number, bottom: number): React.CSSProperties {
  return {
    '--top-color': `var(--scout-card-${top})`,
    '--bottom-color': `var(--scout-card-${bottom})`,
  } as React.CSSProperties;
}

/** @deprecated Use scoutCardStyle() for new card markup. Remove once all callers migrated. */
export function scoutCardBackground(top: number, bottom: number): string {
  const topColor = COLORS[top] ?? "#888";
  const bottomColor = COLORS[bottom] ?? "#888";
  return `linear-gradient(to bottom, ${topColor} 0%, ${topColor} 55%, ${bottomColor}50 55%, ${bottomColor}50 100%)`;
}
