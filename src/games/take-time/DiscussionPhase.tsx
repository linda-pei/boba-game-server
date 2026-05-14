import type { TakeTimeGame, TakeTimeHand, Room } from "../../types";
import { markReady, startPlacement, setClockRotation } from "./useTakeTimeGame";
import { getLevelLabel, getLevelHints } from "./levels";
import ClockDisplay from "./ClockDisplay";
import CardSVG from "./CardSVG";
import { toSuit } from "./theme";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";
import TurnStatus from "../../components/shared/TurnStatus";
import ReadyList from "../../components/shared/ReadyList";

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
  const hints = getLevelHints(game.levelDef);

  return (
    <div>
      <TurnStatus>
        <span className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</span>
        {" — "}Discussion Phase
      </TurnStatus>
      <p className="tt-muted-text" style={{ textAlign: "center", fontSize: "0.85rem" }}>
        Discuss strategy with your team before looking at your cards.
      </p>
      {hints.length > 0 && (
        <div className="tt-hints">
          {hints.map((h, i) => (
            <p key={i} className="tt-hint">{h}</p>
          ))}
        </div>
      )}
      <div className="tt-status-bar">
        <span className="tt-muted-text">Reminder tokens: {game.faceUpRemaining}</span>
      </div>

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
        hourHand={game.levelDef.hourHand}
        betweenRules={game.levelDef.betweenRules}
        secondHandPosition={game.secondHandPosition}
        maxSpread={game.levelDef.maxSpread}
      />

      {game.levelDef.handAdjustable && (
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
                  top: 0,
                  left: i * 30,
                  transform: `rotate(${(i - 0.5) * 10}deg)`,
                  transformOrigin: "50% 100%",
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
      <ReadyList
        players={game.turnOrder.map((pid) => ({
          id: pid,
          name: room.players[pid]?.name ?? pid,
          ready: !!game.readyPlayers[pid],
        }))}
      />

      {/* Players — card color breakdown */}
      <PlayerScores>
        {game.turnOrder.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          const colors = game.handColorSizes?.[pid];
          const hidden = game.hiddenColorSizes?.[pid];
          return (
            <PlayerScoreRow
              key={pid}
              name={name}
              isYou={pid === uid}
            >
              {colors && (
                <span className="tt-hand-breakdown">
                  Hand: <span className="tt-solar-count">☀</span> {colors.white}
                  {" "}<span className="tt-lunar-count">🌙</span> {colors.black}
                </span>
              )}
              {hidden && (
                <span className="tt-hand-breakdown" style={{ marginLeft: "0.75rem" }}>
                  Hidden: <span className="tt-solar-count">☀</span> {hidden.white}
                  {" "}<span className="tt-lunar-count">🌙</span> {hidden.black}
                </span>
              )}
            </PlayerScoreRow>
          );
        })}
      </PlayerScores>

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
          <p className="tt-muted-text" style={{ fontSize: "0.85rem" }}>
            Waiting for all players to be ready...
          </p>
        )}
      </div>
    </div>
  );
}
