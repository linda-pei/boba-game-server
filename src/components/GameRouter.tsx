import { useParams } from "react-router-dom";
import GameBoard from "./things-in-rings/GameBoard";

export default function GameRouter() {
  const { roomCode } = useParams<{ roomCode: string }>();

  if (!roomCode) return <p>No room code.</p>;

  // For now, only "things-in-rings" exists
  return <GameBoard roomCode={roomCode} />;
}
