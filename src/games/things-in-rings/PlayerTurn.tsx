import { useState } from "react";
import { playCard } from "./useGame";
import { getZones, findZone, getOrderedPlayedCards } from "./zones";
import RingDisplay from "./RingDisplay";
import GameCard from "../../components/shared/GameCard";
import TurnStatus from "../../components/shared/TurnStatus";
import type { Game, Hand, Room } from "../../types";

interface Props {
  roomCode: string;
  game: Game;
  hand: Hand;
  uid: string;
  room: Room | null;
  isMyTurn: boolean;
}

export default function PlayerTurn({
  roomCode,
  game,
  hand,
  uid,
  room,
  isMyTurn,
}: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const zones = getZones();

  const handlePlace = async (rings: number[]) => {
    if (!selectedCard) return;
    setPlacing(true);
    try {
      await playCard(roomCode, selectedCard, uid, rings);
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to play card:", err);
    } finally {
      setPlacing(false);
    }
  };

  const playedCards = getOrderedPlayedCards(game.ringAssignments, game.playedCards, game.playOrder);

  if (game.pendingPlay) {
    const placedZone = findZone(zones, game.pendingPlay.rings);
    return (
      <div className="player-turn">
        <div className="paper">
          <RingDisplay
            ringLabels={game.rings.map((r) => r.label)}
            playedCards={playedCards}
            pendingPlay={game.pendingPlay}
          />
        </div>

        <TurnStatus>Waiting for the Knower to judge...</TurnStatus>
        <p>
          <strong>{game.pendingPlay.cardId}</strong> was placed in{" "}
          <strong>{placedZone?.label ?? "a zone"}</strong>
        </p>
      </div>
    );
  }

  if (!isMyTurn) {
    const currentPlayerUid = game.turnOrder[game.currentTurn];
    const currentPlayerName =
      room?.players[currentPlayerUid]?.name ?? "another player";
    return (
      <div className="player-turn">
        <div className="paper">
          <RingDisplay
            ringLabels={game.rings.map((r) => r.label)}
            playedCards={playedCards}
          />
        </div>

        <TurnStatus mood="waiting">
          Waiting for <strong>{currentPlayerName}</strong> to play...
        </TurnStatus>
        <h4>Your Hand</h4>
        <div className="hand">
          {hand.cards.map((card) => (
            <GameCard key={card} disabled>
              {card}
            </GameCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="player-turn">
      <div className="paper">
        <RingDisplay
          ringLabels={game.rings.map((r) => r.label)}
          playedCards={playedCards}
          interactive={!!selectedCard && !placing}
          onZoneClick={handlePlace}
        />
      </div>

      <TurnStatus mood="mine">
        {selectedCard
          ? `Click a zone on the diagram to place "${selectedCard}"`
          : "Select a card from your hand, then place it in a zone"}
      </TurnStatus>

      <h4>Your Hand ({hand.cards.length} cards)</h4>
      <div className="hand">
        {hand.cards.map((card) => (
          <GameCard
            key={card}
            selected={selectedCard === card}
            onClick={() => setSelectedCard(selectedCard === card ? null : card)}
          >
            {card}
          </GameCard>
        ))}
      </div>
    </div>
  );
}
