import type { ScoutCard } from "../../types";
import { validatePlay } from "./scoutDeck";

interface CenterPileProps {
  cards: ScoutCard[];
  playedBy: string;
  playerName: string;
  scouting?: boolean;
  onScoutEnd?: (end: "left" | "right") => void;
}

export default function CenterPile({
  cards,
  playedBy,
  playerName,
  scouting,
  onScoutEnd,
}: CenterPileProps) {
  const play = validatePlay(cards);
  const typeLabel =
    play.type === "match"
      ? cards.length === 1
        ? "single"
        : `${cards.length}-card match`
      : `${cards.length}-card straight`;

  const singleCard = scouting && cards.length === 1;

  return (
    <div className="center-pile">
      <div className="center-pile-info">
        <span className="center-pile-label">{typeLabel}</span>
        <span className="center-pile-player">by {playerName}</span>
      </div>
      <div className="center-pile-cards">
        {scouting && !singleCard && (
          <button className="scout-end-btn" onClick={() => onScoutEnd?.("left")}>
            Take
          </button>
        )}
        {cards.map((card, i) => (
          <div key={`${card.id}-${i}`} className="scout-card pile-card">
            <span className="scout-card-top">{card.top}</span>
            <span className="scout-card-divider" />
            <span className="scout-card-bottom">{card.bottom}</span>
          </div>
        ))}
        {scouting && !singleCard && (
          <button className="scout-end-btn" onClick={() => onScoutEnd?.("right")}>
            Take
          </button>
        )}
        {singleCard && (
          <button className="scout-end-btn" onClick={() => onScoutEnd?.("left")}>
            Take
          </button>
        )}
      </div>
    </div>
  );
}
