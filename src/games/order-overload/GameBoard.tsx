import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import "./order-overload.css";
import { useRoom } from "../../hooks/useRoom";
import { useOrderOverloadGame, useOrderOverloadHand } from "./useOrderOverloadGame";
import ReadingPhase from "./ReadingPhase";
import PlayingPhase from "./PlayingPhase";
import LevelComplete from "./LevelComplete";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";

export default function OrderOverloadGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useOrderOverloadGame(roomCode);
  const hand = useOrderOverloadHand(roomCode, uid);
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

  const subtitle =
    game.status === "reading"
      ? "reading orders"
      : game.status === "level-complete"
        ? "level complete"
        : "playing";

  return (
    <div className="game-screen-wrap">
      <GameBanner
        game="oo"
        subtitle={subtitle}
        roundLabel={`level ${game.level}`}
        actions={<ResignButton />}
      />
      {game.status === "reading" && (
        <ReadingPhase roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "level-complete" && (
        <LevelComplete roomCode={roomCode} game={game} room={room} uid={uid!} />
      )}
      {game.status === "playing" && (
        <PlayingPhase roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
    </div>
  );
}
