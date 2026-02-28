import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useAuthContext } from "../../hooks/AuthContext";
import RingDisplay from "./RingDisplay";
import type { Game, Room } from "../../types";

interface Props {
  game: Game;
  room: Room | null;
  roomCode: string;
}

export default function GameOver({ game, room, roomCode }: Props) {
  const navigate = useNavigate();
  const { uid } = useAuthContext();

  const isCoop = game.mode === "coop";
  let resultMessage: string;

  if (isCoop) {
    resultMessage = game.winner === "team"
      ? "Team Wins!"
      : "Team Lost — Knower ran out of cards!";
  } else {
    const winnerName = room?.players[game.winner ?? ""]?.name ?? "Unknown";
    resultMessage = `${winnerName} wins!`;
  }

  const isWinner = isCoop ? game.winner === "team" : game.winner === uid;

  useEffect(() => {
    if (!isWinner) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

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
      <h3>{resultMessage}</h3>

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
