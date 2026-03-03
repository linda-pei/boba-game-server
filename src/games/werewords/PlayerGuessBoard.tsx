import type { WerewordsGame, Room, GuessResponse } from "../../types";

const RESPONSE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  yes: { bg: "var(--ww-yes)", color: "white", label: "Y" },
  no: { bg: "var(--ww-no)", color: "white", label: "N" },
  maybe: { bg: "var(--ww-maybe)", color: "#333", label: "?" },
  "so-close": { bg: "var(--ww-so-close)", color: "white", label: "!" },
  correct: { bg: "var(--accent-primary)", color: "white", label: "✓" },
};

interface Props {
  game: WerewordsGame;
  room: Room;
  /** If provided, renders action buttons for the mayor next to each player */
  renderActions?: (playerUid: string) => React.ReactNode;
}

export default function PlayerGuessBoard({ game, room, renderActions }: Props) {
  const nonMayorPlayers = game.turnOrder.filter((pid) => pid !== game.mayor);

  return (
    <div className="ww-player-board">
      {nonMayorPlayers.map((pid) => {
        const guesses: GuessResponse[] = game.guesses[pid] ?? [];
        const name = room.players[pid]?.name ?? pid;
        return (
          <div key={pid} className="ww-player-row">
            <div className="ww-player-row-name">{name}</div>
            <div className="ww-player-row-chips">
              {guesses.map((g, i) => (
                <span
                  key={i}
                  className="ww-guess-chip"
                  style={{
                    background: RESPONSE_STYLES[g]?.bg ?? "var(--bg-tertiary)",
                    color: RESPONSE_STYLES[g]?.color ?? "var(--text-primary)",
                  }}
                >
                  {RESPONSE_STYLES[g]?.label ?? g}
                </span>
              ))}
            </div>
            {renderActions && (
              <div className="ww-player-row-actions">
                {renderActions(pid)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
