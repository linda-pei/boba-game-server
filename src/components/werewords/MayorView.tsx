import {
  addGuessResponse,
  markCorrect,
  markNoGuess,
  toggleWayOff,
} from "../../hooks/useWerewordsGame";
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

export default function MayorView({ roomCode, game, hand, uid, room }: Props) {
  const handleResponse = async (
    playerUid: string,
    response: "yes" | "no" | "maybe" | "so-close"
  ) => {
    await addGuessResponse(roomCode, game, playerUid, response);
  };

  const handleCorrect = async (guesserUid: string) => {
    await markCorrect(roomCode, game, guesserUid);
  };

  const handleNoGuess = async () => {
    await markNoGuess(roomCode);
  };

  return (
    <div className="screen">
      <h2>Mayor's View</h2>

      <RoleBanner hand={hand} game={game} uid={uid} />

      <div className="turn-status">
        Magic word: <strong>{game.magicWord}</strong>
      </div>

      {game.wayOff && (
        <div className="ww-way-off-banner">
          WAY OFF — The guesses are going in the wrong direction!
        </div>
      )}

      <PlayerGuessBoard
        game={game}
        room={room}
        renderActions={(pid) => (
          <div className="ww-mayor-actions">
            <button
              className="ww-btn-sm ww-btn-yes"
              onClick={() => handleResponse(pid, "yes")}
            >
              Yes
            </button>
            <button
              className="ww-btn-sm ww-btn-no"
              onClick={() => handleResponse(pid, "no")}
            >
              No
            </button>
            <button
              className="ww-btn-sm ww-btn-maybe"
              onClick={() => handleResponse(pid, "maybe")}
            >
              Maybe
            </button>
            <button
              className="ww-btn-sm ww-btn-so-close"
              onClick={() => handleResponse(pid, "so-close")}
              disabled={game.soCloseUsed}
            >
              So Close
            </button>
            <button
              className="ww-btn-sm"
              onClick={() => handleCorrect(pid)}
            >
              Correct!
            </button>
          </div>
        )}
      />

      <div className="ww-response-buttons" style={{ marginTop: "1rem" }}>
        <button
          className={game.wayOff ? "btn-danger" : "btn-secondary"}
          onClick={() => toggleWayOff(roomCode, game.wayOff)}
        >
          {game.wayOff ? "Remove Way Off" : "Way Off"}
        </button>
        <button className="btn-danger" onClick={handleNoGuess}>
          Nobody Got It
        </button>
      </div>
    </div>
  );
}
