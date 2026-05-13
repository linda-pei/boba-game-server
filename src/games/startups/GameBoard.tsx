import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useStartupsGame, useStartupsHand } from "./useStartupsGame";
import PlayerTurn from "./PlayerTurn";
import RoundEndScreen from "./RoundEndScreen";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";
import "./startups.css";

export default function StartupsGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useStartupsGame(roomCode);
  const hand = useStartupsHand(roomCode, uid);
  const navigate = useNavigate();

  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;
  if (!uid) return <p>Not signed in.</p>;

  const phaseSubtitle: Record<typeof game.status, string> = {
    playing: game.roundsEnabled
      ? `round ${game.currentRound}/${game.totalRounds}`
      : "playing",
    "round-end": "scoring",
    finished: "finished",
  };

  return (
    <div className="game-screen-wrap">
      <GameBanner
        game="su"
        subtitle={phaseSubtitle[game.status]}
        actions={<ResignButton />}
      />
      <div className="screen su-screen">
        {game.status === "playing" && (
          <PlayerTurn
            roomCode={roomCode}
            game={game}
            hand={hand}
            uid={uid}
            room={room}
          />
        )}
        {game.status === "round-end" && (
          <RoundEndScreen roomCode={roomCode} game={game} room={room} />
        )}
        {game.status === "finished" && (
          <GameOver game={game} room={room} />
        )}
      </div>
    </div>
  );
}
