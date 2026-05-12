import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useScoutGame, useScoutHand } from "./useScoutGame";
import HandSetup from "./HandSetup";
import PlayerTurn from "./PlayerTurn";
import RoundEnd from "./RoundEnd";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";
import "./scout.css";

export default function ScoutGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useScoutGame(roomCode);
  const hand = useScoutHand(roomCode, uid);
  const navigate = useNavigate();

  // Redirect all players back to lobby when host resets room
  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;

  if (game.status === "finished") {
    return <GameOver game={game} room={room} />;
  }

  const phaseSubtitle =
    game.status === "setup"
      ? "hand setup"
      : game.status === "round-end"
        ? "round complete"
        : "in play";
  const totalRounds = game.turnOrder.length;

  return (
    <div className="game-screen-wrap">
      <GameBanner
        game="scout"
        subtitle={phaseSubtitle}
        roundLabel={`round ${game.roundNumber}/${totalRounds}`}
        actions={<ResignButton />}
      />
      {game.status === "setup" && (
        <HandSetup roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "round-end" && (
        <RoundEnd roomCode={roomCode} game={game} room={room} />
      )}
      {game.status === "in-progress" && (
        <PlayerTurn roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
    </div>
  );
}
