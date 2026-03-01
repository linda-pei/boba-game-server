import { useState } from "react";
import { playCard } from "../../hooks/useGame";
import { getZones, findZone, getOrderedPlayedCards } from "../../utils/zones";
import RingDisplay from "./RingDisplay";
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
        <div className="turn-status">
          Waiting for the Knower to judge...
        </div>
        <p>
          <strong>{game.pendingPlay.cardId}</strong> was placed in{" "}
          <strong>{placedZone?.label ?? "a zone"}</strong>
        </p>
        <RingDisplay
          ringLabels={game.rings.map((r) => r.label)}
          playedCards={playedCards}
          pendingPlay={game.pendingPlay}
        />
      </div>
    );
  }

  if (!isMyTurn) {
    const currentPlayerUid = game.turnOrder[game.currentTurn];
    const currentPlayerName =
      room?.players[currentPlayerUid]?.name ?? "another player";
    return (
      <div className="player-turn">
        <div className="turn-status">
          Waiting for <strong>{currentPlayerName}</strong> to play...
        </div>
        <RingDisplay
          ringLabels={game.rings.map((r) => r.label)}
          playedCards={playedCards}
        />
        <h4>Your Hand</h4>
        <div className="hand">
          {hand.cards.map((card) => (
            <div key={card} className="game-card disabled">
              {card}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="player-turn">
      <div className="turn-status my-turn">
        {selectedCard
          ? `Click a zone on the diagram to place "${selectedCard}"`
          : "Select a card from your hand, then place it in a zone"}
      </div>

      <RingDisplay
        ringLabels={game.rings.map((r) => r.label)}
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
