import { TT } from "./theme";

interface Props {
  name: string;
  color: string;
  active?: boolean;
  isYou?: boolean;
  detail?: string;
}

const PLAYER_COLORS = [TT.peach, TT.jade, TT.goldMid, TT.lunarMid];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export default function PlayerPip({ name, color, active, isYou, detail }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px 4px 4px",
        background: active ? TT.solarPaperHi : "rgba(251,243,222,0.55)",
        border: `2px solid ${active ? TT.ink : "rgba(31,20,16,0.25)"}`,
        borderRadius: 24,
        boxShadow: active ? "2px 3px 0 #1F1410" : "none",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: color,
          border: `1.5px solid ${TT.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          font: "700 12px Inter,sans-serif",
        }}
      >
        {name[0]}
      </div>
      <span
        style={{
          font: `${active ? 700 : 500} 13px Inter,sans-serif`,
          color: active ? TT.ink : "rgba(31,20,16,0.7)",
        }}
      >
        {name}
        {isYou && <span style={{ opacity: 0.5 }}> (you)</span>}
        {detail && <span style={{ opacity: 0.6 }}> · {detail}</span>}
      </span>
    </div>
  );
}
