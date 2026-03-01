import { useState } from "react";
import { knowerAutoPlay } from "../../hooks/useGame";
import { getOrderedPlayedCards } from "../../utils/zones";
import RingDisplay from "./RingDisplay";
import type { Game, Hand } from "../../types";

interface Props {
  roomCode: string;
  game: Game;
  hand: Hand;
  uid: string;
}

export default function KnowerTurn({ roomCode, game, hand, uid }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const handlePlace = async (rings: number[]) => {
    if (!selectedCard) return;
    setPlacing(true);
    try {
      await knowerAutoPlay(roomCode, game, selectedCard, rings, uid);
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to auto-play:", err);
    } finally {
      setPlacing(false);
    }
  };

  const playedCards = getOrderedPlayedCards(game.ringAssignments, game.playedCards, game.playOrder);

  return (
    <div className="knower-turn">
      <div className="turn-status my-turn">
        {selectedCard
          ? `Click a zone to place "${selectedCard}" as a hint`
          : "Select a card from your hand to place as a hint"}
      </div>

      <RingDisplay
        ringLabels={game.rings.map((r) => r.label)}
        showClues
        playedCards={playedCards}
        interactive={!!selectedCard && !placing}
        onZoneClick={handlePlace}
      />

      <h4>Your Hand ({hand.cards.length} cards)</h4>
      <div className="hand">
        {hand.cards.map((card) => (
          <div
            key={card}
            className={`game-card${selectedCard === card ? " selected" : ""}`}
            onClick={() => setSelectedCard(selectedCard === card ? null : card)}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
