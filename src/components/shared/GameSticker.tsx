import GameIcon from "./GameIcon";
import { GAME_META, type GameKey } from "./gameMeta";
import "./game-chrome.css";

interface Props {
  game: GameKey;
  selected?: boolean;
  disabled?: boolean;
  /** Small tag over the art, e.g. "Doesn't fit your filters"; also dims the sticker. */
  note?: string;
  onClick?: () => void;
}

export default function GameSticker({ game, selected, disabled, note, onClick }: Props) {
  const meta = GAME_META[game];
  return (
    <button
      type="button"
      className={`game-sticker ${game}${selected ? " is-selected" : ""}${note ? " has-note" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <div className="art">
        <GameIcon game={game} size={140} />
        {note && <span className="sticker-note">{note}</span>}
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
