import type { FruitBossGame, Room } from "../../types";
import Collection from "./Collection";
import GameEndButtons from "../../components/shared/GameEndButtons";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";

interface Props {
  game: FruitBossGame;
  room: Room;
  uid: string;
}

export default function GameOver({ game, room, uid }: Props) {
  const isHost = room.host === uid;
  const winnerUid = game.winner;
  const winnerName = winnerUid ? room.players[winnerUid]?.name ?? winnerUid : "Nobody";

  // Players sorted by final score descending
  const ranked = [...game.turnOrder].sort(
    (a, b) => (game.scores?.[b] ?? 0) - (game.scores?.[a] ?? 0)
  );

  return (
    <div className="fb-gameover">
      <h2 className="fb-gameover-title">
        🏆 {winnerName} wins!
      </h2>

      <PlayerScores title="Final scores">
        {ranked.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          const isMe = pid === uid;
          const isWinner = pid === winnerUid;
          const b = game.scoringBreakdowns?.[pid];
          const score = game.scores?.[pid] ?? 0;
          const pos = b?.positive.reduce((s, p) => s + p.points, 0) ?? 0;
          const neg = b?.negative.reduce((s, n) => s + n.points, 0) ?? 0;
          const hand = b?.handPenalty ?? 0;
          return (
            <PlayerScoreRow
              key={pid}
              name={`${isWinner ? "👑 " : ""}${name}`}
              isYou={isMe}
              isActive={isWinner}
            >
              <span className="score-detail">
                +{pos}
                {neg > 0 && <> −{neg} (extra)</>}
                {hand > 0 && <> −{hand} (hand)</>}
                {b?.catEatenValue && b.catEatenValue > 0 ? (
                  <span className="fb-cat-eaten"> · cat ate {b.catEatenValue}</span>
                ) : null}
              </span>
              <span className="score-cumulative">{score}</span>
            </PlayerScoreRow>
          );
        })}
      </PlayerScores>

      {/* Per-player collection so you can see how they got the score */}
      <div className="fb-gameover-collections">
        {ranked.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          const stacks = game.collections[pid] ?? [];
          const pending = game.pendingStars?.[pid] ?? [];
          return (
            <section key={pid} className="fb-gameover-player">
              <h4>
                {name}
                {pid === winnerUid && <span className="fb-winner-tag"> · winner</span>}
              </h4>
              <Collection stacks={stacks} pendingStars={pending} mode="full" />
            </section>
          );
        })}
      </div>

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
