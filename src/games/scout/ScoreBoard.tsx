import type { ScoutGame, Room } from "../../types";
import type { PlayerHandInfo } from "./useScoutGame";

interface ScoreBoardProps {
  game: ScoutGame;
  room: Room;
  handInfo: Record<string, PlayerHandInfo>;
  currentUid: string;
}

export default function ScoreBoard({ game, room, handInfo, currentUid }: ScoreBoardProps) {
  return (
    <div className="score-board">
      <h4>Players</h4>
      <div className="score-grid">
        {game.turnOrder.map((uid) => {
          const s = game.scores[uid];
          const name = room.players[uid]?.name ?? uid;
          const hi = handInfo[uid];
          const isCurrentTurn = game.turnOrder[game.currentTurn] === uid;
          return (
            <div key={uid} className={`score-row${isCurrentTurn ? " score-row-active" : ""}`}>
              <span className="score-name" style={{ flex: 1 }}>
                {name}
                {uid === currentUid && <span className="score-you"> (you)</span>}
              </span>
              <span className="score-cards" style={{ minWidth: "55px", textAlign: "right" }}>
                {hi ? `${hi.cardCount} cards` : "..."}
              </span>
              <span className={`score-token${hi && !hi.hasUsedScoutPlay ? "" : " used"}`}>
                {hi && !hi.hasUsedScoutPlay ? "S&S" : "---"}
              </span>
              <span className="score-detail" style={{ minWidth: "120px", textAlign: "right" }}>
                {s?.capturedCount ?? 0} captured / {s?.dollarTokens ?? 0} scouted
              </span>
              <span className="score-cumulative" style={{ minWidth: "30px", textAlign: "right" }}>
                {game.cumulativeScores[uid] ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
