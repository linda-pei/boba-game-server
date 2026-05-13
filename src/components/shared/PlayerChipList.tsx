import type { ReactNode } from "react";
import "./player-chip.css";

interface ListProps {
  children: ReactNode;
  className?: string;
}

export function PlayerChipList({ children, className }: ListProps) {
  return (
    <div className={`player-list-grid${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

interface ChipProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PlayerChip({ children, className, style }: ChipProps) {
  return (
    <div className={`player-chip${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

type BadgeVariant = "host" | "knower" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={`badge${variant !== "default" ? ` badge-${variant}` : ""}`}>{children}</span>;
}
