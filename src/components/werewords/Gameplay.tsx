import MayorView from "./MayorView";
import PlayerView from "./PlayerView";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function Gameplay(props: Props) {
  if (props.uid === props.game.mayor) {
    return <MayorView {...props} />;
  }
  return <PlayerView {...props} />;
}
