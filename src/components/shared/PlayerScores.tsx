import type { ReactNode } from "react";
import "./player-scores.css";

interface ScoresProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function PlayerScores({ title = "Players", children, className }: ScoresProps) {
  return (
    <div className={`score-board${className ? ` ${className}` : ""}`}>
      <h4>{title}</h4>
      <div className="score-grid">{children}</div>
    </div>
  );
}

interface RowProps {
  name: string;
  isYou?: boolean;
  isActive?: boolean;
  children?: ReactNode;
  className?: string;
}

export function PlayerScoreRow({ name, isYou, isActive, children, className }: RowProps) {
  const classes = ["score-row", isActive && "score-row-active", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <span className="score-name">
        {name}
        {isYou && <span className="score-you"> (you)</span>}
      </span>
      {children}
    </div>
  );
}
