import type { TakeTimeGame, Room } from "../../types";
import { retryTest, nextTest, backToLobby, validateTest, enableBonusTokens } from "./useTakeTimeGame";
import { getLevelLabel, getNextLevel } from "./levels";
import ClockDisplay from "./ClockDisplay";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  room: Room;
  uid: string;
}

export default function TestResult({ roomCode, game, room, uid }: Props) {
  const passed = game.status === "pass";
  const result = validateTest(game);
  const playerNames = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => [id, p.name])
  );
  const hasNext = getNextLevel(game.chapter, game.test) !== null;
  const isHost = room.host === uid;

  // Carry earned bonus reminder tokens into the retry (only after a failed attempt).
  const carryBonus = passed ? 0 : game.bonusTokens ?? 0;

  const handleRetry = async () => {
    await retryTest(roomCode, room, carryBonus);
  };

  const handleEnableBonus = async () => {
    await enableBonusTokens(roomCode);
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
        playerNames={playerNames}
        uid={uid}
        boardRotation={game.boardRotation}
        hourHand={game.levelDef.hourHand}
        betweenRules={game.levelDef.betweenRules}
        secondHandPosition={game.secondHandPosition}
        maxSpread={game.levelDef.maxSpread}
      />

      {!passed && result.violations.length > 0 && (
        <div className="tt-violations">
          <h4>Violations</h4>
          {result.violations.map((v, i) => (
            <div key={i} className="tt-violation-item">• {v}</div>
          ))}
        </div>
      )}

      {!passed && game.bonusTokensEnabled && carryBonus > 0 && (
        <p className="tt-bonus-note">
          🎁 Bonus reminder tokens: {carryBonus}/3 — {carryBonus} extra face-up card
          {carryBonus === 1 ? "" : "s"} on your retry.
        </p>
      )}

      {!passed && !game.bonusTokensEnabled && (
        isHost ? (
          <div style={{ marginTop: "0.75rem" }}>
            <button className="btn btn--secondary btn--sm" onClick={handleEnableBonus}>
              🎁 Enable bonus tokens
            </button>
            <p className="tt-muted-text" style={{ fontSize: "0.75rem", marginTop: "0.35rem" }}>
              Gain +1 reminder token now and on each future loss (up to 3).
            </p>
          </div>
        ) : (
          <p className="tt-muted-text" style={{ fontSize: "0.75rem", marginTop: "0.75rem" }}>
            The host can enable bonus tokens for an extra reminder token on retry.
          </p>
        )
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
