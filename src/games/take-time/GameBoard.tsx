import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import { useTakeTimeGame, useTakeTimeHand } from "./useTakeTimeGame";
import DiscussionPhase from "./DiscussionPhase";
import PlacementPhase from "./PlacementPhase";
import ResolutionPhase from "./ResolutionPhase";
import TestResult from "./TestResult";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";
import { toRoman } from "./levels";
import "./take-time.css";

interface Props {
  roomCode: string;
}

export default function TakeTimeGameBoard({ roomCode }: Props) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useTakeTimeGame(roomCode);
  const hand = useTakeTimeHand(roomCode, uid);
  const navigate = useNavigate();

  // Redirect back to lobby when room status changes
  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(`/lobby/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading game...</p>;
  if (!game) return <p>No game found.</p>;
  if (!room) return <p>Loading room...</p>;
  if (!uid) return <p>Not signed in.</p>;

  const phaseSubtitle: Record<typeof game.status, string> = {
    discussion: "discussion",
    placement: "placement",
    resolution: "resolution",
    pass: "test passed",
    fail: "test failed",
  };

  return (
    <div className="game-screen-wrap tt-wrap">
      <GameBanner
        game="tt"
        subtitle={phaseSubtitle[game.status]}
        roundLabel={`${toRoman(game.chapter)}·${game.test}`}
        actions={<ResignButton />}
      />
      <div className="screen tt-screen">

      {game.status === "discussion" && hand && (
        <DiscussionPhase roomCode={roomCode} game={game} hand={hand} uid={uid} room={room} />
      )}

      {game.status === "placement" && hand && (
        <PlacementPhase roomCode={roomCode} game={game} hand={hand} uid={uid} room={room} />
      )}

      {game.status === "resolution" && (
        <ResolutionPhase roomCode={roomCode} game={game} room={room} uid={uid} />
      )}

      {(game.status === "pass" || game.status === "fail") && (
        <TestResult roomCode={roomCode} game={game} room={room} uid={uid} />
      )}
      </div>
    </div>
  );
}
