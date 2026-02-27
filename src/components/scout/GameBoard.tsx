import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useScoutGame, useScoutHand } from "../../hooks/useScoutGame";
import HandSetup from "./HandSetup";
import PlayerTurn from "./PlayerTurn";
import RoundEnd from "./RoundEnd";
import GameOver from "./GameOver";

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

  if (game.status === "setup") {
    return (
      <HandSetup
        roomCode={roomCode}
        game={game}
        hand={hand}
        uid={uid!}
        room={room}
      />
    );
  }

  if (game.status === "round-end") {
    return (
      <RoundEnd roomCode={roomCode} game={game} room={room} />
    );
  }

  if (game.status === "finished") {
    return <GameOver game={game} room={room} />;
  }

  // in-progress
  return (
    <PlayerTurn
      roomCode={roomCode}
      game={game}
      hand={hand}
      uid={uid!}
      room={room}
    />
  );
}
