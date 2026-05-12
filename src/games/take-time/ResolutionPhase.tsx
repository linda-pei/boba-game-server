import type { TakeTimeGame, Room } from "../../types";
import { advanceReveal, finalizeRotation, setClockRotation } from "./useTakeTimeGame";
import { getLevelLabel } from "./levels";
import ClockDisplay from "./ClockDisplay";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  room: Room;
  uid: string;
}

export default function ResolutionPhase({ roomCode, game, room, uid }: Props) {
  const allRevealed = game.revealIndex >= 6;
  const playerNames = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => [id, p.name])
  );
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
        playerNames={playerNames}
        uid={uid}
        boardRotation={game.boardRotation}
        hourHand={game.levelDef.hourHand}
        betweenRules={game.levelDef.betweenRules}
        secondHandPosition={game.secondHandPosition}
      />

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        {!allRevealed ? (
          <>
            <p className="tt-muted-text" style={{ fontSize: "0.85rem" }}>
              Revealing segment {game.revealIndex + 1} of 6
              {currentSegment && ` (Segment ${currentSegment})`}
            </p>
            <button className="btn btn--primary" onClick={handleReveal}>
              Reveal Next Segment
            </button>
          </>
        ) : canAdjustRotation ? (
          <>
            <p className="tt-muted-text" style={{ fontSize: "0.85rem" }}>
              All cards revealed. You may adjust the starting segment before finalizing.
            </p>
            <div className="tt-rotation-controls">
              <button className="btn btn--ghost btn--sm" onClick={() => handleRotate(-1)}>
                ↺ Rotate
              </button>
              <span className="tt-muted-text" style={{ fontSize: "0.85rem" }}>
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
          <p className="tt-muted-text" style={{ fontSize: "0.85rem" }}>
            Checking results...
          </p>
        )}
      </div>

      {/* Players */}
      <PlayerScores>
        {game.turnOrder.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          return <PlayerScoreRow key={pid} name={name} />;
        })}
      </PlayerScores>
    </div>
  );
}
