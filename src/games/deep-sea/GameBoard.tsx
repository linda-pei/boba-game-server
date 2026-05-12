import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import "./deep-sea.css";
import { useRoom } from "../../hooks/useRoom";
import { useDeepSeaGame, useDeepSeaHand } from "./useDeepSeaGame";
import PlayerTurn from "./PlayerTurn";
import RoundEnd from "./RoundEnd";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";

export default function DeepSeaGameBoard({
  roomCode,
}: {
  roomCode: string;
}) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useDeepSeaGame(roomCode);
  const hand = useDeepSeaHand(roomCode, uid);
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
    return <GameOver roomCode={roomCode} game={game} room={room} />;
  }

  const subtitle: Record<typeof game.status, string> = {
    "round-start": "round start",
    declaring: "declaring",
    rolling: "rolling",
    "treasure-action": "treasure",
    "round-end": "round end",
    finished: "finished",
  };

  return (
    <div className="game-screen-wrap">
      <GameBanner
        game="ds"
        subtitle={subtitle[game.status]}
        roundLabel={`dive ${game.round}/3`}
        actions={<ResignButton />}
      />
      {game.status === "round-end" ? (
        <RoundEnd roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      ) : (
        <PlayerTurn roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
    </div>
  );
}
