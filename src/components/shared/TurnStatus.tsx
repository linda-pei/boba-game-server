import type { CSSProperties, ReactNode } from "react";
import "./turn-status.css";

export type TurnStatusMood = "neutral" | "mine" | "waiting" | "judging";

interface Props {
  mood?: TurnStatusMood;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function TurnStatus({ mood = "neutral", className, style, children }: Props) {
  const classes = [
    "turn-status",
    mood !== "neutral" && `turn-status--${mood}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
