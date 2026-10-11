import { useCelebration } from "../../hooks/useCelebration";
import { useAuthContext } from "../../hooks/useAuthContext";
import { getOrderedPlayedCards } from "./zones";
import RingDisplay from "./RingDisplay";
import GameEndButtons from "../../components/shared/GameEndButtons";
import type { Game, Room } from "../../types";

interface Props {
  game: Game;
  room: Room | null;
  roomCode: string;
}

export default function GameOver({ game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room?.host === uid;

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

  useCelebration(isWinner);

  const playedCards = getOrderedPlayedCards(game.ringAssignments, game.playedCards, game.playOrder);

  return (
    <div className="game-over screen">
      <h2>Game Over!</h2>
      <h3>{resultMessage}</h3>

      <RingDisplay
        ringLabels={game.rings.map((r) => r.label)}
        showClues
        playedCards={playedCards}
      />

      <GameEndButtons isHost={isHost} />
    </div>
  );
}
