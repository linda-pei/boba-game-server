import { useState, useCallback } from "react";
import type { DeepSeaGame, DeepSeaHand, Room, PathSpace } from "../../types";
import BoardPath from "./BoardPath";
import AirGauge from "./AirGauge";
import DiceRoll, { DICE_ANIM_MS } from "./DiceRoll";
import { LEVEL_SHAPES, LEVEL_CLASSES } from "./constants";
import {
  breatheAndAdvance,
  declareDirection,
  rollAndMove,
  treasureAction,
} from "./useDeepSeaGame";

interface Props {
  roomCode: string;
  game: DeepSeaGame;
  hand: DeepSeaHand | null;
  uid: string;
  room: Room;
}

function TreasureShapeChip({ level }: { level: number }) {
  return (
    <span className={`ds-shape-chip ${LEVEL_CLASSES[level]}`}>
      {LEVEL_SHAPES[level]}
    </span>
  );
}

function SpaceShapePreview({ space }: { space: PathSpace }) {
  if (space.type === "treasure" && space.level) {
    return <TreasureShapeChip level={space.level} />;
  }
  if (space.type === "stack") {
    const levels = space.stackLevels ?? [];
    return (
      <span className="ds-stack-preview">
        {levels.map((lv, i) => (
          <TreasureShapeChip key={i} level={lv} />
        ))}
      </span>
    );
  }
  return null;
}

export default function PlayerTurn({
  roomCode,
  game,
  hand,
  uid,
  room,
}: Props) {
  const [localDice, setLocalDice] = useState<[number, number] | null>(null);
  const [localRolling, setLocalRolling] = useState(false);

  const activeUid = game.turnOrder[game.currentTurn];
  const isMyTurn = activeUid === uid;
  const activeDiver = game.divers[activeUid];
  const activeName = room.players[activeUid]?.name ?? "???";

  const handleRoll = useCallback(async () => {
    const faces = [1, 1, 2, 2, 3, 3];
    const d1 = faces[Math.floor(Math.random() * 6)];
    const d2 = faces[Math.floor(Math.random() * 6)];
    const dice: [number, number] = [d1, d2];
    setLocalDice(dice);
    setLocalRolling(true);
    // Wait for flicker animation to finish, then write to Firebase
    await new Promise((r) => setTimeout(r, DICE_ANIM_MS));
    await rollAndMove(roomCode, game, dice);
    setLocalRolling(false);
    setLocalDice(null);
  }, [roomCode, game]);

  const playerNames: Record<string, string> = {};
  for (const [id, player] of Object.entries(room.players)) {
    playerNames[id] = player.name;
  }

  const currentSpace =
    activeDiver.position >= 0 ? game.path[activeDiver.position] : null;

  // Can pick up: on a treasure or stack space
  const canPickUp =
    currentSpace != null &&
    (currentSpace.type === "treasure" || currentSpace.type === "stack");

  // Can drop: on a blank space and carrying something
  const canDrop =
    currentSpace != null &&
    currentSpace.type === "blank" &&
    (hand?.carried.length ?? 0) > 0;

  return (
    <div className="screen deep-sea-screen">
      <div className="ds-header">
        <h2>Round {game.round} of 3</h2>
        <AirGauge air={game.air} />
      </div>

      <BoardPath
        path={game.path}
        divers={game.divers}
        playerNames={playerNames}
        currentPlayerUid={activeUid}
        myUid={uid}
      />

      {/* Action area */}
      <div className="ds-action-area">
        {game.lastAction && (
          <p className="ds-last-action">{game.lastAction}</p>
        )}

        {game.status === "round-start" && (
          <div className="ds-turn-prompt">
            {isMyTurn ? (
              <>
                <p><strong>Your turn!</strong></p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {activeDiver.carriedCount > 0
                    ? `Breathing... air will drop by ${activeDiver.carriedCount}`
                    : "You're not carrying any treasure — no air used."}
                </p>
                <button onClick={() => breatheAndAdvance(roomCode, game)}>
                  Continue
                </button>
              </>
            ) : (
              <p>Waiting for <strong>{activeName}</strong> to start their turn...</p>
            )}
          </div>
        )}

        {game.status === "declaring" && (
          <div className="ds-turn-prompt">
            {isMyTurn ? (
              <>
                <p>
                  {activeDiver.carriedCount > 0
                    ? `You're carrying ${activeDiver.carriedCount} treasure${activeDiver.carriedCount !== 1 ? "s" : ""}. `
                    : ""}
                  Turn back toward the submarine?
                </p>
                <div className="ds-action-buttons">
                  <button
                    onClick={() => declareDirection(roomCode, game, true, activeName)}
                    className="btn-secondary"
                  >
                    ↑ Turn Back
                  </button>
                  <button
                    onClick={() => declareDirection(roomCode, game, false, activeName)}
                  >
                    ↓ Keep Diving
                  </button>
                </div>
              </>
            ) : (
              <p>Waiting for <strong>{activeName}</strong> to decide direction...</p>
            )}
          </div>
        )}

        {game.status === "rolling" && (
          <div className="ds-turn-prompt">
            {isMyTurn ? (
              <>
                {localDice ? (
                  <DiceRoll dice={localDice} carriedCount={activeDiver.carriedCount} animate />
                ) : (
                  <p>Roll the dice!</p>
                )}
                <button onClick={handleRoll} disabled={localRolling}>
                  🎲 Roll
                </button>
              </>
            ) : (
              <p>Waiting for <strong>{activeName}</strong> to roll...</p>
            )}
          </div>
        )}

        {game.status === "treasure-action" && (
          <div className="ds-turn-prompt">
            <DiceRoll dice={game.diceResult} carriedCount={activeDiver.carriedCount} animate />

            {isMyTurn ? (
              <>
                {/* Show what's on the current space */}
                {currentSpace && currentSpace.type !== "blank" && (
                  <p className="ds-space-preview">
                    You landed on: <SpaceShapePreview space={currentSpace} />
                  </p>
                )}
                {currentSpace && currentSpace.type === "blank" && (
                  <p className="ds-space-preview">You landed on an empty space.</p>
                )}
                <p>What do you want to do?</p>
                <div className="ds-action-buttons">
                  {canPickUp && (
                    <button
                      className="btn-secondary"
                      onClick={() => treasureAction(roomCode, game, "pickup")}
                    >
                      Pick Up <SpaceShapePreview space={currentSpace!} />
                    </button>
                  )}
                  {canDrop && (
                    <DropTreasureButton
                      hand={hand!}
                      onDrop={(idx) =>
                        treasureAction(roomCode, game, "drop", idx)
                      }
                    />
                  )}
                  <button
                    onClick={() => treasureAction(roomCode, game, "nothing")}
                  >
                    Do Nothing
                  </button>
                </div>
              </>
            ) : (
              <p>Waiting for <strong>{activeName}</strong> to decide...</p>
            )}
          </div>
        )}
      </div>

      {/* Player table */}
      <div className="score-board">
        <h4>Divers</h4>
        <div className="score-grid">
          {game.turnOrder.map((pid) => {
            const diver = game.divers[pid];
            const isMe = pid === uid;
            const isActive = pid === activeUid;
            return (
              <div
                key={pid}
                className={`score-row${isActive ? " score-row-active" : ""}`}
                style={{ opacity: diver.returned ? 0.5 : 1, flexWrap: "wrap" }}
              >
                <span className="score-name">
                  {room.players[pid]?.name}
                  {isMe && <span className="score-you"> (you)</span>}
                </span>
                <span className="score-cards">
                  {diver.returned
                    ? "✓ returned"
                    : diver.direction === "up"
                      ? "↑ returning"
                      : "↓ diving"}
                </span>
                {game.round > 1 && (
                  <span className="score-cumulative" title="Points scored so far">
                    {game.scores[pid] ?? 0} pts
                  </span>
                )}
                {/* Show carried treasure shapes */}
                {!diver.returned && diver.carriedCount > 0 && (
                  <div className="ds-carried-shapes">
                    {(diver.carriedLevels ?? []).map((level, i) =>
                      level > 0 ? (
                        <TreasureShapeChip key={i} level={level} />
                      ) : (
                        <span key={i} className="ds-shape-chip ds-stack" title="Stack">⊞</span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DropTreasureButton({
  hand,
  onDrop,
}: {
  hand: DeepSeaHand;
  onDrop: (index: number) => void;
}) {
  if (hand.carried.length === 1) {
    return (
      <button className="btn-danger" onClick={() => onDrop(0)}>
        Drop <TreasureShapeChip level={hand.carried[0].level} />
      </button>
    );
  }

  return (
    <div className="ds-drop-options">
      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        Drop:
      </span>
      {hand.carried.map((chip, idx) => (
        <button
          key={idx}
          className="btn-danger btn-small"
          onClick={() => onDrop(idx)}
        >
          <TreasureShapeChip level={chip.level} />
        </button>
      ))}
    </div>
  );
}
