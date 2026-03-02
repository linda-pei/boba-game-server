import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import {
  useWerewordsGame,
  useWerewordsHand,
} from "../../hooks/useWerewordsGame";
import RoleReveal from "./RoleReveal";
import WordSetup from "./WordSetup";
import Gameplay from "./Gameplay";
import WerewolfGuess from "./WerewolfGuess";
import VotePhase from "./VotePhase";
import GameOver from "./GameOver";

export default function WerewordsGameBoard({
  roomCode,
}: {
  roomCode: string;
}) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useWerewordsGame(roomCode);
  const hand = useWerewordsHand(roomCode, uid);
  const navigate = useNavigate();

  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;

  switch (game.status) {
    case "role-reveal":
      return (
        <RoleReveal
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
        />
      );
    case "word-setup":
      return (
        <WordSetup
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
        />
      );
    case "in-progress":
      return (
        <Gameplay
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
        />
      );
    case "werewolf-guess":
      return (
        <WerewolfGuess
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
        />
      );
    case "voting":
      return (
        <VotePhase
          roomCode={roomCode}
          game={game}
          hand={hand}
          uid={uid!}
          room={room}
        />
      );
    case "finished":
      return <GameOver game={game} room={room} />;
    default:
      return <p>Unknown game state.</p>;
  }
}
