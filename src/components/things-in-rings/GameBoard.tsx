import { useAuthContext } from "../../hooks/AuthContext";
import { useGame, useHand } from "../../hooks/useGame";
import { useRoom } from "../../hooks/useRoom";
import KnowerSetup from "./KnowerSetup";
import KnowerJudge from "./KnowerJudge";
import KnowerTurn from "./KnowerTurn";
import PlayerTurn from "./PlayerTurn";
import GameOver from "./GameOver";

interface Props {
  roomCode: string;
}

export default function GameBoard({ roomCode }: Props) {
  const { uid } = useAuthContext();
  const { game, loading, error } = useGame(roomCode);
  const { room } = useRoom(roomCode);
  const hand = useHand(roomCode, uid);

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
        <KnowerSetup roomCode={roomCode} game={game} hand={hand} uid={uid!} />
      );
    }
    const knowerName = room?.players[game.knower]?.name ?? "the Knower";
    return (
      <div className="screen">
        <h2>Waiting for the Knower ({knowerName}) to set up the rings...</h2>
      </div>
    );
  }

  const isKnowersTurn = game.turnOrder[game.currentTurn] === uid;
  const isCoopKnowerTurn = isKnower && game.mode === "coop" && isKnowersTurn;

  // In-progress — diagram is rendered by PlayerTurn or KnowerJudge/KnowerTurn
  return (
    <div className="game-board screen">
      <h2>Things in Rings</h2>

      {isCoopKnowerTurn && hand ? (
        <KnowerTurn roomCode={roomCode} game={game} hand={hand} uid={uid!} />
      ) : isKnower ? (
        <KnowerJudge roomCode={roomCode} game={game} room={room} />
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
    </div>
  );
}
