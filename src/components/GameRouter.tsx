import { useParams } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import GameBoard from "../games/things-in-rings/GameBoard";
import ScoutGameBoard from "../games/scout/GameBoard";
import WerewordsGameBoard from "../games/werewords/GameBoard";
import OrderOverloadGameBoard from "../games/order-overload/GameBoard";

export default function GameRouter() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, loading } = useRoom(roomCode);

  if (!roomCode) return <p>No room code.</p>;
  if (loading) return <p>Loading...</p>;

  if (room?.gameType === "scout") {
    return <ScoutGameBoard roomCode={roomCode} />;
  }

  if (room?.gameType === "werewords") {
    return <WerewordsGameBoard roomCode={roomCode} />;
  }

  if (room?.gameType === "order-overload") {
    return <OrderOverloadGameBoard roomCode={roomCode} />;
  }

  return <GameBoard roomCode={roomCode} />;
}
