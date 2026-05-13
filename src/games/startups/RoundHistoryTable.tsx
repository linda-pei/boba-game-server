import type { Room, StartupsGame } from "../../types";

interface Props {
  game: StartupsGame;
  room: Room;
}

/** Per-round +2/+1/-1 chips earned, with cumulative total. Only meaningful in
 *  rounds mode. When called from the mid-game round-end screen, the current
 *  round's projected award is included as a "(this round)" column. */
export default function RoundHistoryTable({ game, room }: Props) {
  if (!game.roundsEnabled) return null;

  // Project the chip awarded for the just-ended round (if we're on the round-end
  // screen, roundHistory hasn't been written yet — derive from scoreBreakdowns).
  const projectedAward = projectCurrentRound(game);
  const includeCurrent = projectedAward !== null;

  if (game.roundHistory.length === 0 && !includeCurrent) return null;

  const totals: Record<string, number> = {};
  for (const uid of game.turnOrder) {
    let t = 0;
    for (const r of game.roundHistory) {
      const a = r.awarded[uid];
      if (a) t += a.plus2 * 2 + a.plus1 - a.minus1;
    }
    if (includeCurrent) t += projectedAward![uid] ?? 0;
    totals[uid] = t;
  }
  const sorted = [...game.turnOrder].sort((a, b) => totals[b] - totals[a]);

  return (
    <div className="su-history">
      <h4 className="su-history-title">Round chip history</h4>
      <div className="su-history-scroll">
        <table className="su-history-table">
          <thead>
            <tr>
              <th className="su-history-th-name">Player</th>
              {game.roundHistory.map((_, i) => (
                <th key={i}>R{i + 1}</th>
              ))}
              {includeCurrent && (
                <th className="is-current">R{game.currentRound}*</th>
              )}
              <th className="su-history-th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uid) => {
              const name = room.players[uid]?.name ?? uid.slice(0, 6);
              return (
                <tr key={uid}>
                  <td className="su-history-name">{name}</td>
                  {game.roundHistory.map((r, i) => {
                    const a = r.awarded[uid];
                    const pts = a ? a.plus2 * 2 + a.plus1 - a.minus1 : 0;
                    return <td key={i} className={cellClass(pts)}>{formatPoints(pts)}</td>;
                  })}
                  {includeCurrent && (
                    <td className={`${cellClass(projectedAward![uid])} is-current`}>
                      {formatPoints(projectedAward![uid])}
                    </td>
                  )}
                  <td className={`su-history-total ${cellClass(totals[uid])}`}>
                    {formatPoints(totals[uid])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {includeCurrent && (
        <p className="su-history-note">* this round, not yet locked in</p>
      )}
    </div>
  );
}

function projectCurrentRound(game: StartupsGame): Record<string, number> | null {
  if (game.status !== "round-end" || !game.scoreBreakdowns) return null;
  const ranking = [...game.turnOrder].sort(
    (a, b) =>
      (game.scoreBreakdowns![b]?.totalPoints ?? 0) -
      (game.scoreBreakdowns![a]?.totalPoints ?? 0)
  );
  const award: Record<string, number> = {};
  for (const uid of game.turnOrder) award[uid] = 0;
  if (ranking.length > 0) award[ranking[0]] = 2;
  if (ranking.length > 1) award[ranking[1]] = 1;
  if (ranking.length > 2) award[ranking[ranking.length - 1]] = -1;
  return award;
}

function formatPoints(p: number): string {
  if (p === 0) return "·";
  if (p > 0) return `+${p}`;
  return String(p);
}

function cellClass(p: number): string {
  if (p > 0) return "su-history-cell is-gain";
  if (p < 0) return "su-history-cell is-loss";
  return "su-history-cell";
}
