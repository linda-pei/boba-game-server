import "./clover.css";
import { useState } from "react";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import {
  advanceCloverBoard,
  getCloverScoreSummary,
  submitCloverBoard,
  submitCloverFirstGuess,
  submitCloverSecondGuess,
  useCloverGame,
} from "./useCloverGame";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";

export default function CloverGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useCloverGame(roomCode);

  const [guess, setGuess] = useState<Record<string, { slot: number; rotation: number }>>({});
  const [attempt, setAttempt] = useState<"first" | "second">("first");
  const [placements, setPlacements] = useState<Record<string, { slot: number; rotation: number }>>({});
  const [edgeWords, setEdgeWords] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [confirmingBoard, setConfirmingBoard] = useState(false);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;

  const currentOwner = game.currentBoardOwner ?? "";
  const currentBoard = game.boards[currentOwner];
  const myBoard = uid ? game.boards[uid] : undefined;

  const handleBoardPlaceTile = (tileId: string, slot: number) => {
    setPlacements((prev) => ({
      ...prev,
      [tileId]: { slot, rotation: prev[tileId]?.rotation ?? 0 },
    }));
  };

  const handleBoardRotateTile = (tileId: string) => {
    setPlacements((prev) => {
      const current = prev[tileId] ?? { slot: 0, rotation: 0 };
      return {
        ...prev,
        [tileId]: {
          ...current,
          rotation: (current.rotation + 90) % 360,
        },
      };
    });
  };

  const handleBoardWordChange = (index: number, value: string) => {
    setEdgeWords((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[index] = value;
      return next;
    });
  };

  const handleLockBoard = async () => {
    if (!uid || Object.keys(placements).length !== 4) return;
    await submitCloverBoard(roomCode, uid, placements, edgeWords);
    setConfirmingBoard(false);
  };

  const handlePlaceGuessTile = (tileId: string, slot: number) => {
    setGuess((prev) => ({
      ...prev,
      [tileId]: { slot, rotation: prev[tileId]?.rotation ?? 0 },
    }));
  };

  const handleRotateGuessTile = (tileId: string) => {
    setGuess((prev) => {
      const current = prev[tileId] ?? { slot: 0, rotation: 0 };
      return {
        ...prev,
        [tileId]: {
          ...current,
          rotation: (current.rotation + 90) % 360,
        },
      };
    });
  };

  const handleSubmitGuess = async () => {
    if (!uid || !currentBoard) return;

    if (attempt === "first") {
      await submitCloverFirstGuess(roomCode, currentOwner, guess);
      setAttempt("second");
      return;
    }

    await submitCloverSecondGuess(roomCode, currentOwner, guess);
    setAttempt("first");
    setGuess({});
  };

  if (game.status === "finished") {
    const playerCount = Object.keys(room.players).length;
    const summary = getCloverScoreSummary(playerCount, game.teamScore);

    return (
      <div className="screen clover-screen">
        <GameBanner game="clover" subtitle="final score" actions={<ResignButton />} />

        <div className="clover-board-shell">
          <div className="clover-status-box">
            <div>
              <strong>Final team score:</strong> {game.teamScore}
            </div>
            <div>{summary.label}</div>
          </div>

          <div className="clover-panel">
            <h3>Final score</h3>
            <p>
              With {playerCount} players, that lands in the {summary.label.toLowerCase()} tier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (game.status === "round-end") {
    const roundOwner = game.lastBoardOwner ?? currentOwner;
    const boardScore = game.lastBoardScore ?? 0;
    const nextOwner = game.boardOrder.find((uid) => !game.boards[uid]?.scored) ?? null;

    return (
      <div className="screen clover-screen">
        <GameBanner game="clover" subtitle="board complete" actions={<ResignButton />} />

        <div className="clover-board-shell">
          <div className="clover-status-box">
            <div>
              <strong>{room.players[roundOwner]?.name ?? "This board"}</strong> earned +{boardScore}
            </div>
            <div>Team total: {game.teamScore}</div>
          </div>

          <div className="clover-panel">
            <h3>Board resolved</h3>
            <p>
              {room.players[roundOwner]?.name ?? "This board"} earned +{boardScore} point
              {boardScore === 1 ? "" : "s"}.
            </p>
            <p>
              Team score so far: <strong>{game.teamScore}</strong>
            </p>
            <p>
              {nextOwner
                ? `Ready for the next board: ${room.players[nextOwner]?.name ?? "next player"}`
                : "All boards are complete."}
            </p>

            <button
              className="btn btn--primary"
              onClick={async () => {
                setAttempt("first");
                setGuess({});
                await advanceCloverBoard(roomCode);
              }}
            >
              {nextOwner ? `Next board: ${room.players[nextOwner]?.name ?? "next player"}` : "Finish game"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen clover-screen">
      <GameBanner game="clover" subtitle={game.status} actions={<ResignButton />} />

      <div className="clover-board-shell">
        {game.status === "board-lock" && myBoard && (
          <div className="clover-panel">
            <h3>Build your Clover board</h3>

            <div className="clover-guess-grid">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="clover-slot">
                  {Object.entries(placements).find(([, value]) => value.slot === slot)?.[0] ?? `Slot ${slot + 1}`}
                </div>
              ))}
            </div>

            <div className="clover-edge-words">
              {edgeWords.map((word, index) => (
                <label key={index}>
                  Edge {index + 1}
                  <input
                    value={word}
                    onChange={(e) => handleBoardWordChange(index, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="clover-tile-list">
              {myBoard.tiles.map((tile) => {
                const placed = placements[tile.id];
                return (
                  <div key={tile.id} className="clover-tile-card">
                    <div className="clover-tile-id">{tile.id}</div>
                    <div className="clover-tile-edges">
                      {tile.edges.map((edge, index) => (
                        <span key={`${tile.id}-${index}`} className="clover-edge-chip">
                          {edge}
                        </span>
                      ))}
                    </div>

                    <div className="clover-tile-actions">
                      <button className="btn btn--secondary btn--sm" onClick={() => handleBoardRotateTile(tile.id)}>
                        Rotate
                      </button>

                      {placed ? (
                        <button className="btn btn--ghost btn--sm" onClick={() => handleBoardPlaceTile(tile.id, placed.slot)}>
                          Keep slot {placed.slot + 1}
                        </button>
                      ) : (
                        <>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleBoardPlaceTile(tile.id, 0)}>1</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleBoardPlaceTile(tile.id, 1)}>2</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleBoardPlaceTile(tile.id, 2)}>3</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleBoardPlaceTile(tile.id, 3)}>4</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button
                className="btn btn--primary"
                onClick={() => {
                  if (!confirmingBoard) {
                    setConfirmingBoard(true);
                    return;
                  }
                  handleLockBoard();
                }}
              >
                {confirmingBoard ? "Are you sure?" : "Lock board"}
              </button>
            </div>
          </div>
        )}

        {game.status === "guessing" && currentBoard && (
          <div className="clover-panel">
            <h3>Guessing {room.players[currentOwner]?.name ?? "the owner"}'s board</h3>
            <p>Attempt: {attempt === "first" ? "First try" : "Second try"}</p>

            <div className="clover-guess-grid">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="clover-slot">
                  {Object.entries(guess).find(([, value]) => value.slot === slot)?.[0] ?? `Slot ${slot + 1}`}
                </div>
              ))}
            </div>

            <div className="clover-tile-list">
              {currentBoard.tiles.map((tile) => (
                <div key={tile.id} className="clover-tile-card">
                  <div className="clover-tile-id">{tile.id}</div>
                  <div className="clover-tile-edges">
                    {tile.edges.map((edge, index) => (
                      <span key={`${tile.id}-${index}`} className="clover-edge-chip">
                        {edge}
                      </span>
                    ))}
                  </div>

                  <div className="clover-tile-actions">
                    <button className="btn btn--secondary btn--sm" onClick={() => handleRotateGuessTile(tile.id)}>
                      Rotate
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => handlePlaceGuessTile(tile.id, 0)}>1</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => handlePlaceGuessTile(tile.id, 1)}>2</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => handlePlaceGuessTile(tile.id, 2)}>3</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => handlePlaceGuessTile(tile.id, 3)}>4</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button className="btn btn--primary" onClick={handleSubmitGuess}>
                {attempt === "first" ? "Lock first guess" : "Lock second guess"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}