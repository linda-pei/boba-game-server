import { useState } from "react";
import { judgeCorrect, judgeIncorrect } from "../../hooks/useGame";
import { getZones, findZone } from "../../utils/zones";
import RingDisplay from "./RingDisplay";
import type { Game, Room } from "../../types";

interface Props {
  roomCode: string;
  game: Game;
  room: Room | null;
}

export default function KnowerJudge({ roomCode, game, room }: Props) {
  const [judging, setJudging] = useState(false);
  const [correctingZone, setCorrectingZone] = useState(false);
  const pending = game.pendingPlay;
  const zones = getZones();

  const playedCards = [
    ...Object.entries(game.ringAssignments || {}).map(([cardId, rings]) => ({
      cardId,
      rings,
    })),
    ...Object.entries(game.playedCards).map(([cardId, info]) => ({
      cardId,
      rings: info.rings,
    })),
  ];

  if (!pending) {
    const currentPlayerUid = game.turnOrder[game.currentTurn];
    const currentPlayerName =
      room?.players[currentPlayerUid]?.name ?? "a player";
    return (
      <div className="knower-judge">
        <div className="turn-status">
          Waiting for <strong>{currentPlayerName}</strong> to place a card...
        </div>
        <RingDisplay
          ringLabels={game.rings.map((r) => r.label)}
          showClues
          playedCards={playedCards}
        />
      </div>
    );
  }

  const placedZone = findZone(zones, pending.rings);

  const handleCorrect = async () => {
    setJudging(true);
    try {
      await judgeCorrect(roomCode, game, pending.playedBy);
    } catch (err) {
      console.error("Judge correct failed:", err);
    } finally {
      setJudging(false);
    }
  };

  const handleIncorrect = async (correctRings: number[]) => {
    setJudging(true);
    try {
      await judgeIncorrect(roomCode, game, correctRings, pending.playedBy);
    } catch (err) {
      console.error("Judge incorrect failed:", err);
    } finally {
      setJudging(false);
      setCorrectingZone(false);
    }
  };

  return (
    <div className="knower-judge">
      <h3>Judge This Play</h3>
      <div className="turn-status my-turn">
        <strong>{pending.cardId}</strong> was placed in{" "}
        <strong>{placedZone?.label ?? "unknown"}</strong>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
        <button
          className="btn-secondary"
          onClick={handleCorrect}
          disabled={judging}
        >
          Correct!
        </button>
        <button
          className="btn-danger"
          onClick={() => setCorrectingZone(true)}
          disabled={judging || correctingZone}
        >
          Incorrect
        </button>
      </div>

      {correctingZone && (
        <p style={{ marginBottom: 0 }}>Click the correct zone on the diagram:</p>
      )}

      <RingDisplay
        ringLabels={game.rings.map((r) => r.label)}
        showClues
        playedCards={playedCards}
        pendingPlay={pending}
        interactive={correctingZone}
        onZoneClick={handleIncorrect}
      />
    </div>
  );
}
