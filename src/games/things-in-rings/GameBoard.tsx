import { useAuthContext } from "../../hooks/AuthContext";
import "./things-in-rings.css";
import { useGame, useHand, useAllHandCounts } from "./useGame";
import { useRoom } from "../../hooks/useRoom";
import KnowerSetup from "./KnowerSetup";
import KnowerJudge from "./KnowerJudge";
import KnowerTurn from "./KnowerTurn";
import PlayerTurn from "./PlayerTurn";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";

interface Props {
  roomCode: string;
}

export default function GameBoard({ roomCode }: Props) {
  const { uid } = useAuthContext();
  const { game, loading, error } = useGame(roomCode);
  const { room } = useRoom(roomCode);
  const hand = useHand(roomCode, uid);
  const allPlayerUids = room ? Object.keys(room.players) : [];
  const handCounts = useAllHandCounts(roomCode, allPlayerUids);

  if (loading) return <p>Loading game...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!game) return <p>No game found.</p>;

  const isKnower = game.knower === uid;

  // Game over
  if (game.status === "finished") {
    return <GameOver game={game} room={room} roomCode={roomCode} />;
  }

  // Knower setup phase
  if (game.status === "knower-setup") {
    if (isKnower && hand) {
      return (
        <div className="game-screen-wrap">
          <GameBanner game="tir" subtitle="knower setup" actions={<ResignButton />} />
          <KnowerSetup roomCode={roomCode} game={game} hand={hand} uid={uid!} />
        </div>
      );
    }
    const knowerName = room?.players[game.knower]?.name ?? "the Knower";
    return (
      <div className="game-screen-wrap">
        <GameBanner game="tir" subtitle="knower setup" actions={<ResignButton />} />
        <div className="screen">
          <p>Waiting for the Knower ({knowerName}) to set up the rings...</p>
        </div>
      </div>
    );
  }

  const isKnowersTurn = game.turnOrder[game.currentTurn] === uid;
  const isCoopKnowerTurn = isKnower && game.mode === "coop" && isKnowersTurn;

  // In-progress — diagram is rendered by PlayerTurn or KnowerJudge/KnowerTurn
  const currentTurnUid = game.turnOrder[game.currentTurn];

  // Build full player list: knower first, then turn order (knower may already be in turnOrder for coop)
  const allPlayers = game.turnOrder.includes(game.knower)
    ? game.turnOrder
    : [game.knower, ...game.turnOrder];

  return (
    <div className="game-screen-wrap">
      <GameBanner game="tir" subtitle={game.mode === "coop" ? "co-op" : "competitive"} actions={<ResignButton />} />
      <div className="game-board screen">

      {isCoopKnowerTurn && hand ? (
        <KnowerTurn roomCode={roomCode} game={game} hand={hand} uid={uid!} />
      ) : isKnower ? (
        <KnowerJudge roomCode={roomCode} game={game} room={room} hand={game.mode === "coop" ? hand : undefined} />
      ) : hand ? (
        <PlayerTurn
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
          isMyTurn={game.turnOrder[game.currentTurn] === uid}
        />
      ) : (
        <p>Loading your hand...</p>
      )}

      <PlayerScores>
        {allPlayers.map((pid) => {
          const name = room?.players[pid]?.name ?? pid;
          const count = handCounts[pid] ?? 0;
          const isKnowerPlayer = pid === game.knower;
          const isActive = pid === currentTurnUid && !game.pendingPlay;
          const isJudging = isKnowerPlayer && !!game.pendingPlay;
          return (
            <PlayerScoreRow
              key={pid}
              name={name}
              isYou={uid === pid}
              isActive={isActive}
            >
              <span className="score-cards">
                {isKnowerPlayer ? "Knower" : `${count} cards`}
              </span>
              <span className="score-detail">
                {isActive && "Playing..."}
                {isJudging && "Judging..."}
              </span>
            </PlayerScoreRow>
          );
        })}
      </PlayerScores>
      </div>
    </div>
  );
}
