// Take Time — celestial theme tokens
// Matches the design spec in design/project/take-time.jsx

export const TT = {
  // Solar (light suit) palette
  solarPaper: "#F6EAC9",
  solarPaperHi: "#FBF3DE",
  solarPaperLo: "#E5D3A4",
  solarMist: "#D9E6EC",
  solarInk: "#3A2B16",

  // Lunar (dark suit) palette
  lunarDeep: "#0C1F3D",
  lunarMid: "#173663",
  lunarStar: "#E5C57E",

  // Gold accents
  goldDeep: "#9C6E20",
  goldMid: "#C99339",
  goldLight: "#E5C57E",
  goldGlow: "#F4DA9A",

  // Shared
  ink: "#1F1410",
  jade: "#2E8F75",
  peach: "#E8A487",
  red: "#C23A2A",
} as const;

/** Map internal card color to visual suit name */
export function toSuit(color: "black" | "white"): "solar" | "lunar" {
  return color === "white" ? "solar" : "lunar";
}
