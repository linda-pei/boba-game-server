import type { ReactNode } from "react";

interface Props {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  children: ReactNode;
}

export default function GameCard({
  selected,
  disabled,
  onClick,
  className,
  style,
  title,
  children,
}: Props) {
  const classes = ["game-card", selected && "selected", disabled && "disabled", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      onClick={disabled ? undefined : onClick}
      style={style}
      title={title}
    >
      {children}
    </div>
  );
}
