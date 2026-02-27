import { useParams } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import GameBoard from "./things-in-rings/GameBoard";
import ScoutGameBoard from "./scout/GameBoard";

export default function GameRouter() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, loading } = useRoom(roomCode);

  if (!roomCode) return <p>No room code.</p>;
  if (loading) return <p>Loading...</p>;

  if (room?.gameType === "scout") {
    return <ScoutGameBoard roomCode={roomCode} />;
  }

  return <GameBoard roomCode={roomCode} />;
}
