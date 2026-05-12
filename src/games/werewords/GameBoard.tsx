import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import {
  useWerewordsGame,
  useWerewordsHand,
} from "./useWerewordsGame";
import "./werewords.css";
import RoleReveal from "./RoleReveal";
import WordSetup from "./WordSetup";
import WordReveal from "./WordReveal";
import Gameplay from "./Gameplay";
import WerewolfGuess from "./WerewolfGuess";
import VotePhase from "./VotePhase";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";

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

  if (game.status === "finished") {
    return <GameOver game={game} room={room} />;
  }

  const subtitle: Record<typeof game.status, string> = {
    "role-reveal": "role reveal",
    "word-setup": "word setup",
    "word-reveal": "word reveal",
    "in-progress": "discussion",
    "werewolf-guess": "wolf's guess",
    voting: "voting",
    finished: "finished",
  };

  return (
    <div className="game-screen-wrap">
      <GameBanner game="ww" subtitle={subtitle[game.status]} actions={<ResignButton />} />
      {game.status === "role-reveal" && (
        <RoleReveal roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "word-setup" && (
        <WordSetup roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "word-reveal" && (
        <WordReveal roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "in-progress" && (
        <Gameplay roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "werewolf-guess" && (
        <WerewolfGuess roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
      {game.status === "voting" && (
        <VotePhase roomCode={roomCode} game={game} hand={hand} uid={uid!} room={room} />
      )}
    </div>
  );
}
