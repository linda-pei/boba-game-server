import "./clover.css";
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../hooks/AuthContext";
import { useRoom } from "../../hooks/useRoom";
import {
  advanceCloverBoard,
  getCloverScoreSummary,
  lockSharedCloverGuess,
  submitCloverBoard,
  submitSharedCloverGuess,
  useCloverGame,
} from "./useCloverGame";
import GameBanner from "../../components/shared/GameBanner";
import ResignButton from "../../components/shared/ResignButton";

const SLOT_ORDER = [0, 1, 2, 3];

type PlacementMap = Record<string, { slot: number; rotation: number }>;

function rotateEdgeWordsClockwise(edges: string[]) {
  return [edges[3], edges[0], edges[1], edges[2]];
}

function getDisplayedEdges(edges: string[], rotation: number) {
  const turns = ((rotation % 360) / 90 + 4) % 4;
  let next = [...edges];
  for (let i = 0; i < turns; i += 1) {
    next = rotateEdgeWordsClockwise(next);
  }
  return next as [string, string, string, string];
}

function moveTileToSlot(map: PlacementMap, tileId: string, slot: number) {
  const next = { ...map };

  const currentOccupant = Object.entries(next).find(([, value]) => value.slot === slot)?.[0];
  if (currentOccupant && currentOccupant !== tileId) {
    delete next[currentOccupant];
  }

  const existing = next[tileId];
  next[tileId] = {
    slot,
    rotation: existing?.rotation ?? 0,
  };

  return next;
}

function removeTileFromMap(map: PlacementMap, tileId: string) {
  const next = { ...map };
  delete next[tileId];
  return next;
}

export default function CloverGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useCloverGame(roomCode);

  const [guess, setGuess] = useState<PlacementMap>({});
  const [placements, setPlacements] = useState<PlacementMap>({});
  const [edgeWords, setEdgeWords] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [confirmingBoard, setConfirmingBoard] = useState(false);

  useEffect(() => {
    if (!game || !uid) return;
    const currentOwner = game.currentBoardOwner ?? "";
    const board = game.boards[currentOwner] as any;
    if (board?.sharedGuess) {
      setGuess(board.sharedGuess);
    }
  }, [game, uid]);

  if (loading) return <p>Loading game...</p>;
  if (!game || !room) return <p>Game not found.</p>;

  const currentOwner = game.currentBoardOwner ?? "";
  const currentBoard = game.boards[currentOwner] as any;
  const myBoard = uid ? (game.boards[uid] as any) : undefined;
  const isBoardOwner = uid === currentOwner;

  const getTileForSlot = (slotMap: PlacementMap, slot: number) =>
    Object.entries(slotMap).find(([, value]) => value.slot === slot)?.[0] ?? null;

  const handleBoardPlaceTile = (tileId: string, slot: number) => {
    setPlacements((prev) => moveTileToSlot(prev, tileId, slot));
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
    if (!uid || isBoardOwner) return;
    const nextGuess = moveTileToSlot(guess, tileId, slot);
    setGuess(nextGuess);
    void submitSharedCloverGuess(roomCode, currentOwner, nextGuess);
  };

  const handleRotateGuessTile = (tileId: string) => {
    if (!uid || isBoardOwner) return;
    setGuess((prev) => {
      const current = prev[tileId] ?? { slot: 0, rotation: 0 };
      const next = {
        ...prev,
        [tileId]: {
          ...current,
          rotation: (current.rotation + 90) % 360,
        },
      };
      void submitSharedCloverGuess(roomCode, currentOwner, next);
      return next;
    });
  };

  const handleReturnToTray = (tileId: string, mode: "board" | "guess") => {
    if (mode === "board") {
      setPlacements((prev) => removeTileFromMap(prev, tileId));
      return;
    }

    if (isBoardOwner) return;
    setGuess((prev) => {
      const next = removeTileFromMap(prev, tileId);
      void submitSharedCloverGuess(roomCode, currentOwner, next);
      return next;
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLElement>, tileId: string) => {
    event.dataTransfer.setData("text/plain", tileId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleSubmitGuess = async () => {
    if (!uid || !currentBoard || isBoardOwner) return;
    if (Object.keys(guess).length !== 4) return;

    const currentAttempts = Number((currentBoard as any).guessAttempts ?? 0);

    if (currentAttempts < 2) {
      await lockSharedCloverGuess(roomCode, currentOwner, guess);
      return;
    }

    await lockSharedCloverGuess(roomCode, currentOwner, guess);
  };

  const renderBoardEdgeInputs = () => (
    <div className="clover-edge-inputs">
      <label className="clover-edge-field clover-edge-field--top">
        <span>Top</span>
        <input
          value={edgeWords[0]}
          onChange={(e) => handleBoardWordChange(0, e.target.value)}
          aria-label="Top edge association"
        />
      </label>

      <label className="clover-edge-field clover-edge-field--right">
        <span>Right</span>
        <input
          value={edgeWords[1]}
          onChange={(e) => handleBoardWordChange(1, e.target.value)}
          aria-label="Right edge association"
        />
      </label>

      <label className="clover-edge-field clover-edge-field--bottom">
        <span>Bottom</span>
        <input
          value={edgeWords[2]}
          onChange={(e) => handleBoardWordChange(2, e.target.value)}
          aria-label="Bottom edge association"
        />
      </label>

      <label className="clover-edge-field clover-edge-field--left">
        <span>Left</span>
        <input
          value={edgeWords[3]}
          onChange={(e) => handleBoardWordChange(3, e.target.value)}
          aria-label="Left edge association"
        />
      </label>
    </div>
  );

  const renderBoardEdgeLabels = () => {
    const labels = currentBoard?.edgeWords ?? ["", "", "", ""];

    return (
      <div className="clover-edge-labels">
        <div className="clover-edge-label clover-edge-label--top">{labels[0] || "Top"}</div>
        <div className="clover-edge-label clover-edge-label--right">{labels[1] || "Right"}</div>
        <div className="clover-edge-label clover-edge-label--bottom">{labels[2] || "Bottom"}</div>
        <div className="clover-edge-label clover-edge-label--left">{labels[3] || "Left"}</div>
      </div>
    );
  };

  const renderTileBody = ({
    tile,
    rotation,
    onRotate,
    isInTray = false,
  }: {
    tile: { id: string; edges: string[] };
    rotation: number;
    onRotate: (tileId: string) => void;
    isInTray?: boolean;
  }) => {
    const displayed = getDisplayedEdges(tile.edges, rotation);

    return (
      <div
        key={tile.id}
        draggable={!isBoardOwner}
        onDragStart={(event) => handleDragStart(event, tile.id)}
        className={`clover-square-tile ${isInTray ? "clover-hand-tile" : ""}`}
      >
        <div className="clover-word-layer">
          <div className="clover-word clover-word--top">{displayed[0]}</div>
          <div className="clover-word clover-word--right">{displayed[1]}</div>
          <div className="clover-word clover-word--bottom">{displayed[2]}</div>
          <div className="clover-word clover-word--left">{displayed[3]}</div>
        </div>

        <button
          type="button"
          className="clover-rotate-button"
          onClick={(event) => {
            event.stopPropagation();
            onRotate(tile.id);
          }}
        >
          Rotate
        </button>
      </div>
    );
  };

  const renderBoardGrid = ({
    placedMap,
    onDropTile,
    onRotateTile,
    mode,
  }: {
    placedMap: PlacementMap;
    onDropTile: (tileId: string, slot: number) => void;
    onRotateTile: (tileId: string) => void;
    mode: "board" | "guess";
  }) => {
    return (
      <div className="clover-board-stage">
        <div className="clover-board-grid-wrap">
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
                    if (!droppedId) return;
                    onDropTile(droppedId, slot);
                  }}
                >
                  {tileId ? (
                    (() => {
                      const tile =
                        (myBoard?.tiles ?? currentBoard?.tiles ?? []).find((item) => item.id === tileId) ??
                        currentBoard?.decoyTile ??
                        null;

                      if (!tile) return null;

                      const rotation = placedMap[tileId]?.rotation ?? 0;

                      return (
                        <div
                          draggable={!isBoardOwner}
                          onDragStart={(event) => handleDragStart(event, tileId)}
                          className="clover-placed-tile"
                        >
                          {renderTileBody({ tile, rotation, onRotate: onRotateTile })}
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

          {mode === "board" ? renderBoardEdgeInputs() : renderBoardEdgeLabels()}
        </div>
      </div>
    );
  };

  const guessTrayTiles = useMemo(() => {
    if (!currentBoard) return [];
    const base = [...(currentBoard.tiles ?? [])];
    const decoy = currentBoard.decoyTile ? { ...currentBoard.decoyTile } : null;
    if (decoy) base.push(decoy);
    return shuffle(base);
  }, [currentBoard]);

  const renderTileTray = ({
    tiles,
    onRotate,
    mode,
  }: {
    tiles: { id: string; edges: string[] }[];
    onRotate: (tileId: string) => void;
    mode: "board" | "guess";
  }) => {
    return (
      <div
        className="clover-return-tray"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const droppedId = event.dataTransfer.getData("text/plain");
          if (!droppedId) return;
          handleReturnToTray(droppedId, mode);
        }}
      >
        <div className="clover-return-tray__label">Tile tray</div>
        <div className="clover-return-grid">
          {tiles.map((tile) => {
            const rotation = (mode === "board" ? placements[tile.id]?.rotation : guess[tile.id]?.rotation) ?? 0;

            return (
              <div key={tile.id} className="clover-return-slot">
                {renderTileBody({ tile, rotation, onRotate, isInTray: true })}
              </div>
            );
          })}

          {Array.from({ length: Math.max(0, 5 - tiles.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="clover-return-slot clover-return-slot--empty" />
          ))}
        </div>
      </div>
    );
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
              <strong>TEAM'S FINAL SCORE IS:</strong> {game.teamScore}
            </div>
            <div>FOR {playerCount} PLAYERS</div>
          </div>

          <div className="clover-panel">
            <h3>Final score</h3>
            <p>
              With {playerCount} players, that lands in the {summary.label.toLowerCase()} tier.
            </p>
            <p>Final team total: {game.teamScore}</p>
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
              {game.lastAction ?? "Board resolved."}
            </p>
            <p>
              {nextOwner
                ? `Ready for the next board: ${room.players[nextOwner]?.name ?? "next player"}`
                : "All boards are complete."}
            </p>

            <button
              className="btn btn--primary"
              onClick={async () => {
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
              mode: "board",
            })}

            {renderTileTray({
              tiles: myBoard.tiles.filter((tile) => !placements[tile.id]),
              onRotate: handleBoardRotateTile,
              mode: "board",
            })}

            <div style={{ marginTop: "1rem" }}>
              <button
                className="btn btn--primary"
                onClick={() => {
                  handleLockBoard();
                }}
              >
                Lock board
              </button>
            </div>
          </div>
        )}

        {game.status === "guessing" && currentBoard && (
          <div className="clover-panel">
            <h3>
              {isBoardOwner
                ? `Viewing ${room.players[currentOwner]?.name ?? "the owner"}'s board`
                : `Guessing ${room.players[currentOwner]?.name ?? "the owner"}'s board`}
            </h3>

            <p>
              {isBoardOwner
                ? "You are viewing the shared guess board."
                : `Attempt: ${((currentBoard as any).guessAttempts ?? 0) < 2 ? "First try" : "Last attempt"}`}
            </p>

            {renderBoardGrid({
              placedMap: guess,
              onDropTile: handlePlaceGuessTile,
              onRotateTile: handleRotateGuessTile,
              mode: "guess",
            })}

            {!isBoardOwner && (
              <>
                {renderTileTray({
                  tiles: guessTrayTiles.filter((tile) => !guess[tile.id]),
                  onRotate: handleRotateGuessTile,
                  mode: "guess",
                })}

                <div style={{ marginTop: "1rem" }}>
                  <button className="btn btn--primary" onClick={handleSubmitGuess}>
                    {(currentBoard as any).guessAttempts >= 2 ? "Lock final guess" : "Lock board"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}