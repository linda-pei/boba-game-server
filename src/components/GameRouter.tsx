import { useParams } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import { useEmotes } from "../hooks/useEmotes";
import GameBoard from "../games/things-in-rings/GameBoard";
import ScoutGameBoard from "../games/scout/GameBoard";
import WerewordsGameBoard from "../games/werewords/GameBoard";
import OrderOverloadGameBoard from "../games/order-overload/GameBoard";
import DeepSeaGameBoard from "../games/deep-sea/GameBoard";
import TakeTimeGameBoard from "../games/take-time/GameBoard";
import EmoteBar from "./shared/EmoteBar";
import EmoteOverlay from "./shared/EmoteOverlay";
import "./shared/emotes.css";

export default function GameRouter() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, loading } = useRoom(roomCode);
  const { emotes, sendEmote, canSend } = useEmotes(roomCode);

  if (!roomCode) return <p>No room code.</p>;
  if (loading) return <p>Loading...</p>;

  let gameBoard: React.ReactNode;

  if (room?.gameType === "scout") {
    gameBoard = <ScoutGameBoard roomCode={roomCode} />;
  } else if (room?.gameType === "werewords") {
    gameBoard = <WerewordsGameBoard roomCode={roomCode} />;
  } else if (room?.gameType === "order-overload") {
    gameBoard = <OrderOverloadGameBoard roomCode={roomCode} />;
  } else if (room?.gameType === "deep-sea") {
    gameBoard = <DeepSeaGameBoard roomCode={roomCode} />;
  } else if (room?.gameType === "take-time") {
    gameBoard = <TakeTimeGameBoard roomCode={roomCode} />;
  } else {
    gameBoard = <GameBoard roomCode={roomCode} />;
  }

  return (
    <>
      {gameBoard}
      <EmoteOverlay emotes={emotes} />
      <EmoteBar onSend={sendEmote} canSend={canSend} />
    </>
  );
}
