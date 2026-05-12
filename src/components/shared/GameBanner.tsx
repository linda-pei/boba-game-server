import type { ReactNode } from "react";
import GameIcon, { GAME_META, type GameKey } from "./GameIcon";
import "./game-chrome.css";

interface Props {
  game: GameKey;
  title?: string;
  subtitle?: string;
  roundLabel?: string;
  actions?: ReactNode;
}

export default function GameBanner({
  game,
  title,
  subtitle,
  roundLabel,
  actions,
}: Props) {
  const meta = GAME_META[game];
  return (
    <div className={`game-banner ${game}`}>
      <div className="banner-icon">
        <GameIcon game={game} size={44} />
      </div>
      <div className="banner-title">
        <h2>{title ?? meta.name}</h2>
        {subtitle && <span className="sub">{subtitle}</span>}
      </div>
      {(roundLabel || actions) && (
        <div className="banner-actions">
          {roundLabel && <span className="round-pill">{roundLabel}</span>}
          {actions}
        </div>
      )}
    </div>
  );
}
