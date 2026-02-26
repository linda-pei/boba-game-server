import { useNavigate } from "react-router-dom";
import RingDisplay from "./RingDisplay";
import type { Game, Room } from "../../types";

interface Props {
  game: Game;
  room: Room | null;
  roomCode: string;
}

export default function GameOver({ game, room, roomCode }: Props) {
  const navigate = useNavigate();

  const winnerName = room?.players[game.winner ?? ""]?.name ?? "Unknown";

  const playedCards = [
    ...Object.entries(game.ringAssignments || {}).map(([cardId, rings]) => ({
      cardId,
      rings,
    })),
    ...Object.entries(game.playedCards).map(([cardId, info]) => ({
      cardId,
      rings: info.rings,
    })),
  ];

  return (
    <div className="game-over screen">
      <h2>Game Over!</h2>
      <h3>{winnerName} wins!</h3>

      <RingDisplay
        ringLabels={game.rings.map((r) => r.label)}
        showClues
        playedCards={playedCards}
      />

      <button onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>
        Back to Home
      </button>
    </div>
  );
}
