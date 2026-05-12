import type { ScoutGame, Room } from "../../types";
import type { PlayerHandInfo } from "./useScoutGame";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";

interface ScoreBoardProps {
  game: ScoutGame;
  room: Room;
  handInfo: Record<string, PlayerHandInfo>;
  currentUid: string;
}

export default function ScoreBoard({ game, room, handInfo, currentUid }: ScoreBoardProps) {
  return (
    <PlayerScores>
      {game.turnOrder.map((uid) => {
        const s = game.scores[uid];
        const name = room.players[uid]?.name ?? uid;
        const hi = handInfo[uid];
        const isCurrentTurn = game.turnOrder[game.currentTurn] === uid;
        return (
          <PlayerScoreRow
            key={uid}
            name={name}
            isYou={uid === currentUid}
            isActive={isCurrentTurn}
          >
            <span className="score-cards">
              {hi ? `${hi.cardCount} cards` : "..."}
            </span>
            <span className={`score-token${hi && !hi.hasUsedScoutPlay ? "" : " used"}`}>
              {hi && !hi.hasUsedScoutPlay ? "S&S" : "---"}
            </span>
            <span className="score-detail" style={{ minWidth: "120px" }}>
              {s?.capturedCount ?? 0} captured / {s?.dollarTokens ?? 0} scouted
            </span>
            <span className="score-cumulative">
              {game.cumulativeScores[uid] ?? 0}
            </span>
          </PlayerScoreRow>
        );
      })}
    </PlayerScores>
  );
}
