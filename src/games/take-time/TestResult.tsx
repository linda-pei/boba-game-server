import type { TakeTimeGame, Room } from "../../types";
import { retryTest, nextTest, backToLobby, validateTest } from "./useTakeTimeGame";
import { getLevelLabel, getNextLevel } from "./levels";
import ClockDisplay from "./ClockDisplay";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  room: Room;
}

export default function TestResult({ roomCode, game, room }: Props) {
  const passed = game.status === "pass";
  const result = validateTest(game);
  const hasNext = getNextLevel(game.chapter, game.test) !== null;

  const handleRetry = async () => {
    await retryTest(roomCode, room);
  };

  const handleNext = async () => {
    await nextTest(roomCode, room, game);
  };

  const handleLobby = async () => {
    await backToLobby(roomCode);
  };

  return (
    <div className="tt-result">
      <h2 className={passed ? "tt-result-pass" : "tt-result-fail"}>
        {passed ? "Test Passed!" : "Test Failed"}
      </h2>
      <p className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</p>

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
        revealedUpTo={6}
        showSums
      />

      {!passed && result.violations.length > 0 && (
        <div className="tt-violations">
          <h4>Violations</h4>
          {result.violations.map((v, i) => (
            <div key={i} className="tt-violation-item">• {v}</div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
        <button className="btn btn--secondary" onClick={handleRetry}>
          Retry
        </button>
        {passed && hasNext && (
          <button className="btn btn--primary" onClick={handleNext}>
            Next Test
          </button>
        )}
        <button className="btn btn--danger" onClick={handleLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
