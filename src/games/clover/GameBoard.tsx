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

const SLOT_ORDER = [0, 1, 2, 3];

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

  const getTileForSlot = (slotMap: Record<string, { slot: number; rotation: number }>, slot: number) => {
    return Object.entries(slotMap).find(([, value]) => value.slot === slot)?.[0] ?? null;
  };

  const handleBoardPlaceTile = (tileId: string, slot: number) => {
    setPlacements((prev) => ({
      ...prev,
      [tileId]: {
        slot,
        rotation: prev[tileId]?.rotation ?? 0,
      },
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

  const handleBoardRemoveTile = (tileId: string) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[tileId];
      return next;
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
      [tileId]: {
        slot,
        rotation: prev[tileId]?.rotation ?? 0,
      },
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

  const handleRemoveGuessTile = (tileId: string) => {
    setGuess((prev) => {
      const next = { ...prev };
      delete next[tileId];
      return next;
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLElement>, tileId: string) => {
    event.dataTransfer.setData("text/plain", tileId);
    event.dataTransfer.effectAllowed = "move";
  };

  const renderTileCard = ({
    tile,
    onRotate,
    onClear,
    isPlaced = false,
  }: {
    tile: { id: string; edges: string[] };
    onRotate: (tileId: string) => void;
    onClear?: (tileId: string) => void;
    isPlaced?: boolean;
  }) => {
    return (
      <div
        key={tile.id}
        draggable
        onDragStart={(event) => handleDragStart(event, tile.id)}
        className="clover-tile-card"
      >
        <div className="clover-tile-top">
          <span className="clover-tile-id">{tile.id}</span>

          {onClear && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={(event) => {
                event.stopPropagation();
                onClear(tile.id);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="clover-tile-edges">
          {tile.edges.map((edge, index) => (
            <span key={`${tile.id}-${index}`} className="clover-edge-chip">
              {edge}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm clover-rotate-btn"
          onClick={() => onRotate(tile.id)}
        >
          {isPlaced ? "Rotate tile" : "Rotate"}
        </button>
      </div>
    );
  };

  const renderBoardGrid = ({
    placedMap,
    onDropTile,
    onRotateTile,
    onClearTile,
  }: {
    placedMap: Record<string, { slot: number; rotation: number }>;
    onDropTile: (tileId: string, slot: number) => void;
    onRotateTile: (tileId: string) => void;
    onClearTile: (tileId: string) => void;
  }) => {
    return (
      <div className="clover-board-grid">
        {SLOT_ORDER.map((slot) => {
          const tileId = getTileForSlot(placedMap, slot);

          return (
            <div
              key={slot}
              className="clover-slot"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const droppedId = event.dataTransfer.getData("text/plain");
                if (droppedId) {
                  onDropTile(droppedId, slot);
                }
              }}
            >
              {tileId ? (
                (() => {
                  const tile =
                    (myBoard?.tiles ?? currentBoard?.tiles ?? []).find((item) => item.id === tileId) ?? null;

                  if (!tile) return null;

                  const placement = placedMap[tileId];
                  const rotateStyle: React.CSSProperties = {
                    transform: `rotate(${placement.rotation}deg)`,
                    transition: "transform 0.18s ease",
                  };

                  return (
                    <div
                      draggable
                      onDragStart={(event) => handleDragStart(event, tileId)}
                      onClick={() => onRotateTile(tileId)}
                      className="clover-placed-tile"
                      style={rotateStyle}
                    >
                      {renderTileCard({
                        tile,
                        onRotate: onRotateTile,
                        onClear: onClearTile,
                        isPlaced: true,
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="clover-slot-empty">Drop tile here</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSubmitGuess = async () => {
    if (!uid || !currentBoard) return;
    if (Object.keys(guess).length !== 4) return;

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

            {renderBoardGrid({
              placedMap: placements,
              onDropTile: handleBoardPlaceTile,
              onRotateTile: handleBoardRotateTile,
              onClearTile: handleBoardRemoveTile,
            })}

            <div className="clover-edge-words">
              {edgeWords.map((word, index) => (
                <label key={index}>
                  Edge {index + 1}
                  <input value={word} onChange={(e) => handleBoardWordChange(index, e.target.value)} />
                </label>
              ))}
            </div>

            <div className="clover-tile-list">
              {myBoard.tiles
                .filter((tile) => !placements[tile.id])
                .map((tile) =>
                  renderTileCard({
                    tile,
                    onRotate: handleBoardRotateTile,
                    onClear: undefined,
                    isPlaced: false,
                  })
                )}
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

            {renderBoardGrid({
              placedMap: guess,
              onDropTile: handlePlaceGuessTile,
              onRotateTile: handleRotateGuessTile,
              onClearTile: handleRemoveGuessTile,
            })}

            <div className="clover-tile-list">
              {currentBoard.tiles
                .filter((tile) => !guess[tile.id])
                .map((tile) =>
                  renderTileCard({
                    tile,
                    onRotate: handleRotateGuessTile,
                    onClear: undefined,
                    isPlaced: false,
                  })
                )}
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