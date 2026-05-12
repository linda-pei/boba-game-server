import type { TakeTimeGame, TakeTimeHand, Room } from "../../types";
import { markReady, startPlacement, setClockRotation } from "./useTakeTimeGame";
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

export default function DiscussionPhase({ roomCode, game, hand, uid, room }: Props) {
  const allReady = game.turnOrder.every((pid) => game.readyPlayers[pid]);
  const iAmReady = game.readyPlayers[uid];

  const handleReady = async () => {
    await markReady(roomCode, uid);
  };

  const handleStart = async () => {
    await startPlacement(roomCode);
  };

  const handleRotate = (direction: 1 | -1) => {
    const newRotation = ((game.clockRotation + direction) % 6 + 6) % 6;
    setClockRotation(roomCode, newRotation);
  };

  const hiddenCards = hand.hiddenCards ?? [];
  const N = hand.cards.length;

  return (
    <div>
      <div className="turn-status">
        <span className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</span>
        {" — "}Discussion Phase
      </div>
      <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#3A2B16", opacity: 0.7 }}>
        Discuss strategy with your team before looking at your cards.
        {game.levelDef.clockRule === "infinity" && " Segment sums may exceed 24."}
        {game.levelDef.specialRules?.includes("no-faceup") && " No cards may be played face-up."}
      </p>

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
      />

      {game.levelDef.handAdjustable && (
        <div className="tt-rotation-controls">
          <button className="btn btn--ghost btn--sm" onClick={() => handleRotate(-1)}>
            ↺ Rotate
          </button>
          <span style={{ fontSize: "0.85rem", color: "#3A2B16", opacity: 0.7 }}>
            Starting segment
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => handleRotate(1)}>
            Rotate ↻
          </button>
        </div>
      )}

      {/* Card backs — fanned */}
      <h4 style={{ textAlign: "center" }}>Your Cards (face down)</h4>
      <div className="tt-hand">
        {hand.cards.map((card, i) => {
          const offset = i - (N - 1) / 2;
          const tilt = offset * 4;
          const dy = Math.abs(offset) * 6;
          return (
            <div
              key={card.id}
              className="tt-hand-card"
              style={{
                transform: `translateY(${dy}px) rotate(${tilt}deg)`,
                transformOrigin: "50% 100%",
                cursor: "default",
                zIndex: i,
              }}
            >
              <CardSVG suit={toSuit(card.color)} faceUp={false} w={90} h={126} />
            </div>
          );
        })}
      </div>
      {hiddenCards.length > 0 && (
        <div className="tt-hidden-pile">
          <div className="tt-hidden-pile-stack">
            {hiddenCards.map((card, i) => (
              <div
                key={card.id}
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

      {/* Ready status */}
      <div className="tt-ready-list">
        {game.turnOrder.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          const ready = game.readyPlayers[pid];
          return (
            <span key={pid} className={`tt-ready-chip${ready ? " ready" : ""}`}>
              {ready ? "✓" : "○"} {name}
            </span>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        {!iAmReady ? (
          <button className="btn btn--primary" onClick={handleReady}>
            Ready
          </button>
        ) : allReady ? (
          <button className="btn btn--primary" onClick={handleStart}>
            Start Placement
          </button>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#3A2B16", opacity: 0.5 }}>
            Waiting for all players to be ready...
          </p>
        )}
      </div>
    </div>
  );
}
