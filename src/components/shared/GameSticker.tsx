import GameIcon, { GAME_META, type GameKey } from "./GameIcon";
import "./game-chrome.css";

interface Props {
  game: GameKey;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function GameSticker({ game, selected, disabled, onClick }: Props) {
  const meta = GAME_META[game];
  return (
    <button
      type="button"
      className={`game-sticker ${game}${selected ? " is-selected" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <div className="art">
        <GameIcon game={game} size={140} />
      </div>
      <div className="meta">
        <h3>{meta.name}</h3>
        <p>{meta.tagline}</p>
        <div className="meta-row">
          <span className="player-count">◆ {meta.players}</span>
          <span className="badge-mini">{meta.badge}</span>
        </div>
      </div>
    </button>
  );
}
