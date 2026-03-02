import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";
import PlayerGuessBoard from "./PlayerGuessBoard";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function PlayerView({ game, hand, uid, room }: Props) {
  const mayorName = room.players[game.mayor]?.name ?? "Mayor";

  // Seer and werewolves can see the magic word
  const canSeeWord =
    hand?.role === "seer" ||
    hand?.role === "werewolf";

  return (
    <div className="screen">
      <h2>Werewords</h2>

      <RoleBanner hand={hand} />

      <div className="turn-status">
        <strong>{mayorName}</strong> is answering your questions.
        {canSeeWord && (
          <div style={{ marginTop: "0.5rem" }}>
            Magic word: <strong>{game.magicWord}</strong>
          </div>
        )}
      </div>

      {game.wayOff && (
        <div className="ww-way-off-banner">
          WAY OFF — The guesses are going in the wrong direction!
        </div>
      )}

      <PlayerGuessBoard game={game} room={room} />

      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
        Ask yes-or-no questions out loud to guess the magic word!
      </p>
    </div>
  );
}
