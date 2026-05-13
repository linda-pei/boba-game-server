import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useFruitBossGame, useFruitBossHand } from "./useFruitBossGame";
import PlayerTurn from "./PlayerTurn";
import GameOver from "./GameOver";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";
import "./fruit-boss.css";

export default function FruitBossGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useFruitBossGame(roomCode);
  const hand = useFruitBossHand(roomCode, uid);
  const navigate = useNavigate();

  // Bounce back to lobby when host resets
  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;
  if (!uid) return <p>Not signed in.</p>;

  const phaseSubtitle: Record<typeof game.status, string> = {
    playing: "playing",
    "fire-sale": "fire sale",
    "round-end": "scoring",
    finished: "finished",
  };

  return (
    <div className="game-screen-wrap">
      <GameBanner
        game="fb"
        subtitle={phaseSubtitle[game.status]}
        actions={game.status !== "finished" ? <ResignButton /> : undefined}
      />
      <div className="screen fb-screen">
        {game.status === "playing" || game.status === "fire-sale" ? (
          <PlayerTurn
            roomCode={roomCode}
            game={game}
            hand={hand}
            uid={uid}
            room={room}
          />
        ) : game.status === "finished" ? (
          <GameOver game={game} room={room} uid={uid} />
        ) : (
          <p>Phase: {game.status}.</p>
        )}
      </div>
    </div>
  );
}
