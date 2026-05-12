import { useState } from "react";
import type { TakeTimeGame, TakeTimeHand, Room } from "../../types";
import { placeCard, getCardsPlayedByPlayer } from "./useTakeTimeGame";
import { getLevelLabel } from "./levels";
import ClockDisplay from "./ClockDisplay";
import CardSVG from "./CardSVG";
import { toSuit } from "./theme";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  hand: TakeTimeHand;
  uid: string;
  room: Room;
}

export default function PlacementPhase({ roomCode, game, hand, uid, room }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState(false);
  const [placing, setPlacing] = useState(false);

  const isFirstCard = game.cardsPlayed === 0;
  const isMyTurn = isFirstCard || game.turnOrder[game.currentTurn] === uid;
  const currentPlayerName = isFirstCard
    ? null
    : room.players[game.turnOrder[game.currentTurn]]?.name ?? "???";

  const canPlayFaceUp = game.faceUpRemaining > 0;

  const handleSegmentClick = async (segIndex: number) => {
    if (!selectedCard || !isMyTurn || placing) return;
    setPlacing(true);
    try {
      await placeCard(roomCode, game, uid, selectedCard, segIndex, faceUp);
      setSelectedCard(null);
      setFaceUp(false);
    } catch (err) {
      console.error("Failed to place card:", err);
    } finally {
      setPlacing(false);
    }
  };

  const showRevealMessage = game.turnOrder.length === 2 &&
    game.cardsPlayed === 4 &&
    game.twoPlayerRevealed;

  const visibleCards = hand.cards;
  const hiddenCards = hand.hiddenCards ?? [];
  const N = visibleCards.length;

  return (
    <div>
      <div className={`turn-status${isMyTurn ? " turn-status--mine" : ""}`}>
        <span className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</span>
        {" — "}
        {isMyTurn
          ? selectedCard
            ? "Click a segment to place your card"
            : "Select a card from your hand"
          : `Waiting for ${currentPlayerName}...`}
      </div>

      {isFirstCard && isMyTurn && (
        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#3A2B16", opacity: 0.7 }}>
          Any player may play the first card.
        </p>
      )}

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
        highlightSegment={selectedCard && isMyTurn ? -1 : null}
        interactive={!!selectedCard && isMyTurn && !placing}
        onSegmentClick={handleSegmentClick}
      />

      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#3A2B16", opacity: 0.5 }}>
        Cards placed: {game.cardsPlayed}/12
      </p>

      {showRevealMessage && (
        <div className="turn-status" style={{ marginBottom: "0.5rem" }}>
          Hidden cards revealed! Check your hand.
        </div>
      )}

      {/* Hand — fanned */}
      <h4 style={{ textAlign: "center" }}>Your Hand ({visibleCards.length} cards)</h4>
      <div className="tt-hand">
        {visibleCards.map((card, i) => {
          const offset = i - (N - 1) / 2;
          const tilt = offset * 4;
          const dy = Math.abs(offset) * 6;
          const isSelected = selectedCard === card.id;
          const liftExtra = isSelected ? 28 : 0;
          return (
            <div
              key={card.id}
              className="tt-hand-card"
              style={{
                transform: `translateY(${dy - liftExtra}px) rotate(${tilt}deg)`,
                transformOrigin: "50% 100%",
                zIndex: isSelected ? 20 : i,
              }}
              onClick={() => {
                if (!isMyTurn) return;
                setSelectedCard(selectedCard === card.id ? null : card.id);
              }}
            >
              <CardSVG
                suit={toSuit(card.color)}
                value={card.value}
                faceUp
                w={90}
                h={126}
              />
            </div>
          );
        })}
      </div>
      {hiddenCards.length > 0 && (
        <div className="tt-hidden-pile">
          <div className="tt-hidden-pile-stack">
            {hiddenCards.map((card, i) => (
              <div
                key={`hidden-${i}`}
                style={{
                  position: i === 0 ? "relative" : "absolute",
                  top: i * 4,
                  left: i * 3,
                }}
              >
                <CardSVG suit={toSuit(card.color)} faceUp={false} w={78} h={109} />
              </div>
            ))}
          </div>
          <span className="tt-hidden-pile-label">Hidden ({hiddenCards.length})</span>
        </div>
      )}

      {/* Face-up toggle */}
      {isMyTurn && selectedCard && (
        <div className="tt-faceup-toggle">
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: canPlayFaceUp ? "pointer" : "not-allowed" }}>
            <input
              type="checkbox"
              checked={faceUp}
              onChange={(e) => setFaceUp(e.target.checked)}
              disabled={!canPlayFaceUp}
            />
            Play face-up
          </label>
          <span style={{ fontSize: "0.75rem", color: "#3A2B16", opacity: 0.5 }}>
            ({game.faceUpRemaining} remaining)
          </span>
        </div>
      )}

      {/* Players */}
      <div className="score-board">
        <h4>Players</h4>
        <div className="score-grid">
          {game.turnOrder.map((pid) => {
            const name = room.players[pid]?.name ?? pid;
            const isActive = isFirstCard || game.turnOrder[game.currentTurn] === pid;
            const cardsPerPlayer = Math.floor(12 / game.turnOrder.length);
            const played = getCardsPlayedByPlayer(game);
            const remaining = cardsPerPlayer - (played[pid] ?? 0);
            return (
              <div key={pid} className={`score-row${isActive ? " score-row-active" : ""}`}>
                <span className="score-name" style={{ flex: 1 }}>
                  {name}
                  {pid === uid && <span className="score-you"> (you)</span>}
                </span>
                <span className="score-cards">
                  {remaining} card{remaining !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
