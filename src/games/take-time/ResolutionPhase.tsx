import type { TakeTimeGame, Room } from "../../types";
import { advanceReveal, finalizeRotation, setClockRotation } from "./useTakeTimeGame";
import { getLevelLabel } from "./levels";
import ClockDisplay from "./ClockDisplay";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  room: Room;
}

export default function ResolutionPhase({ roomCode, game, room }: Props) {
  const allRevealed = game.revealIndex >= 6;
  const canAdjustRotation = allRevealed && game.levelDef.handAdjustable;

  const handleReveal = async () => {
    await advanceReveal(roomCode, game);
  };

  const handleRotate = (direction: 1 | -1) => {
    const newRotation = ((game.clockRotation + direction) % 6 + 6) % 6;
    setClockRotation(roomCode, newRotation);
  };

  const handleFinalize = async () => {
    await finalizeRotation(roomCode, game);
  };

  const currentSegment = !allRevealed
    ? ((game.revealIndex + game.clockRotation) % 6) + 1
    : null;

  return (
    <div>
      <div className="turn-status">
        <span className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</span>
        {" — "}Resolution Phase
      </div>

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
        revealedUpTo={game.revealIndex}
        showSums={game.revealIndex > 0}
      />

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        {!allRevealed ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "#3A2B16", opacity: 0.7 }}>
              Revealing segment {game.revealIndex + 1} of 6
              {currentSegment && ` (Segment ${currentSegment})`}
            </p>
            <button className="btn btn--primary" onClick={handleReveal}>
              Reveal Next Segment
            </button>
          </>
        ) : canAdjustRotation ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "#3A2B16", opacity: 0.7 }}>
              All cards revealed. You may adjust the starting segment before finalizing.
            </p>
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
            <button className="btn btn--primary" onClick={handleFinalize} style={{ marginTop: "0.5rem" }}>
              Finalize & Check
            </button>
          </>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#3A2B16", opacity: 0.5 }}>
            Checking results...
          </p>
        )}
      </div>

      {/* Players */}
      <div className="score-board">
        <h4>Players</h4>
        <div className="score-grid">
          {game.turnOrder.map((pid) => {
            const name = room.players[pid]?.name ?? pid;
            return (
              <div key={pid} className="score-row">
                <span className="score-name">{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
