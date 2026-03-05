import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";
import { useRoom, joinRoom, leaveRoom, updateRoomSettings } from "../hooks/useRoom";
import { startGame } from "../games/things-in-rings/useGame";
import { startScoutGame } from "../games/scout/useScoutGame";
import { startWerewordsGame } from "../games/werewords/useWerewordsGame";
import { startOrderOverloadGame } from "../games/order-overload/useOrderOverloadGame";
import { DECKS } from "../games/order-overload/deck";

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid, username } = useAuthContext();
  const { room, loading, error } = useRoom(roomCode);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  // Auto-join if the player opened the lobby link but isn't in the room yet
  useEffect(() => {
    if (!room || !uid || !username || !roomCode) return;
    if (room.status !== "lobby") return;
    if (room.players[uid]) return; // already in the room
    joinRoom(roomCode, uid, username).catch((err) =>
      console.error("Auto-join failed:", err)
    );
  }, [room, uid, username, roomCode]);

  // Auto-redirect all players when game starts
  useEffect(() => {
    if (room?.status === "in-progress") {
      navigate(`/game/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading room...</p>;
  if (error || !room) {
    return (
      <div className="lobby screen">
        <p className="error-message">{error || "Room not found"}</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const isHost = room.host === uid;
  const players = Object.entries(room.players);
  const gameType = room.gameType || "things-in-rings";
  const isScout = gameType === "scout";
  const isWerewords = gameType === "werewords";
  const isOrderOverload = gameType === "order-overload";

  // TIR-specific
  const knower = room.settings.knower;
  const mode = room.settings.mode ?? "competitive";
  const nonKnowerCount = players.filter(([id]) => id !== knower).length;
  const minNonKnowers = mode === "coop" ? 1 : 2;
  const canStartTIR = !!knower && nonKnowerCount >= minNonKnowers;

  // Scout-specific
  const canStartScout = players.length >= 3 && players.length <= 5;

  // Werewords-specific
  const canStartWerewords = players.length >= 4 && players.length <= 11;

  // Order Overload-specific
  const canStartOrderOverload = players.length >= 2 && players.length <= 6;

  const canStart = isScout
    ? canStartScout
    : isWerewords
      ? canStartWerewords
      : isOrderOverload
        ? canStartOrderOverload
        : canStartTIR;

  const handleLeave = async () => {
    if (!uid || !roomCode) return;
    await leaveRoom(roomCode, uid);
    navigate("/");
  };

  const handleSetKnower = (playerId: string) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { knower: playerId });
  };

  const handleSetRings = (numRings: number) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { numRings });
  };

  const handleSetMode = (newMode: "competitive" | "coop") => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { mode: newMode });
  };

  const handleSetGameType = (type: string) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { gameType: type });
  };

  const handleStart = async () => {
    if (!roomCode || !room) return;
    setStarting(true);
    try {
      if (isScout) {
        await startScoutGame(roomCode, room);
      } else if (isWerewords) {
        await startWerewordsGame(roomCode, room);
      } else if (isOrderOverload) {
        await startOrderOverloadGame(roomCode, room);
      } else {
        await startGame(roomCode, room);
      }
      navigate(`/game/${roomCode}`);
    } catch (err) {
      console.error("Failed to start game:", err);
      setStarting(false);
    }
  };

  return (
    <div className="lobby screen">
      <h2>Room: {roomCode}</h2>
      <p>
        {players.length}/{room.maxPlayers} players
      </p>

      <h3>Players</h3>
      <div className="player-list-grid">
        {players
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([id, player]) => (
            <div key={id} className="player-chip">
              {player.name}
              {id === room.host && <span className="badge badge-host">Host</span>}
              {!isScout && !isWerewords && !isOrderOverload && id === knower && (
                <span className="badge badge-knower">Knower</span>
              )}
              {!isScout && !isWerewords && !isOrderOverload && isHost && id !== knower && (
                <button
                  onClick={() => handleSetKnower(id)}
                  className="btn-small btn-secondary"
                >
                  Set Knower
                </button>
              )}
            </div>
          ))}
      </div>

      {isHost && (
        <div className="settings-panel">
          <h3>Settings</h3>

          {/* Game type toggle */}
          <div className="mode-toggle" style={{ marginBottom: "1rem" }}>
            <button
              className={`mode-toggle-btn${gameType === "things-in-rings" ? " active" : ""}`}
              onClick={() => handleSetGameType("things-in-rings")}
            >
              Things in Rings
            </button>
            <button
              className={`mode-toggle-btn${gameType === "scout" ? " active" : ""}`}
              onClick={() => handleSetGameType("scout")}
            >
              Scout
            </button>
            <button
              className={`mode-toggle-btn${gameType === "werewords" ? " active" : ""}`}
              onClick={() => handleSetGameType("werewords")}
            >
              Werewords
            </button>
            <button
              className={`mode-toggle-btn${gameType === "order-overload" ? " active" : ""}`}
              onClick={() => handleSetGameType("order-overload")}
            >
              Order Overload
            </button>
          </div>

          {/* TIR settings */}
          {!isScout && !isWerewords && !isOrderOverload && (
            <>
              <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                3 rings: Context (red), Attribute (blue), Word (green)
              </p>
              <div className="mode-toggle">
                <button
                  className={`mode-toggle-btn${mode === "competitive" ? " active" : ""}`}
                  onClick={() => handleSetMode("competitive")}
                >
                  Competitive
                </button>
                <button
                  className={`mode-toggle-btn${mode === "coop" ? " active" : ""}`}
                  onClick={() => handleSetMode("coop")}
                >
                  Co-op
                </button>
              </div>
            </>
          )}

          {/* Scout info */}
          {isScout && (
            <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Scout requires 3–5 players.{" "}
              {players.length < 3
                ? `Need ${3 - players.length} more.`
                : `${players.length} players — ready!`}
            </p>
          )}

          {/* Werewords info */}
          {isWerewords && (
            <>
              <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                Werewords requires 4–11 players.{" "}
                {players.length < 4
                  ? `Need ${4 - players.length} more.`
                  : `${players.length} players — ready!`}
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                <input
                  type="checkbox"
                  checked={!!room.settings.limitedTokens}
                  onChange={(e) => updateRoomSettings(roomCode!, { limitedTokens: e.target.checked })}
                />
                Limited tokens (36 Yes/No, 10 Maybe)
              </label>
            </>
          )}

          {/* Order Overload info */}
          {isOrderOverload && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                Deck:
                <select
                  value={room.settings.deckId ?? "cafe"}
                  onChange={(e) => updateRoomSettings(roomCode!, { deckId: e.target.value })}
                >
                  {Object.entries(DECKS).map(([id, { label }]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                Order Overload requires 2–6 players.{" "}
                {players.length < 2
                  ? `Need ${2 - players.length} more.`
                  : players.length > 6
                    ? "Too many players!"
                    : `${players.length} players — ready!`}
              </p>
            </>
          )}

          <div style={{ textAlign: "center" }}>
            <button onClick={handleStart} disabled={!canStart || starting}>
              {starting ? "Starting..." : "Start Game"}
            </button>
            {!canStart && (
              <p style={{ fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
                {isOrderOverload
                  ? players.length < 2
                    ? "Need at least 2 players for Order Overload"
                    : "Too many players (max 6 for Order Overload)"
                  : isWerewords
                    ? players.length < 4
                      ? "Need at least 4 players for Werewords"
                      : "Too many players (max 11 for Werewords)"
                    : isScout
                      ? players.length < 3
                        ? "Need at least 3 players for Scout"
                        : "Too many players (max 5 for Scout)"
                      : !knower
                        ? "Assign a Knower to start"
                        : `Need at least ${minNonKnowers} non-Knower player${minNonKnowers > 1 ? "s" : ""}`}
              </p>
            )}
          </div>
        </div>
      )}

      <button onClick={handleLeave} className="btn-danger" style={{ marginTop: "1rem" }}>
        {isHost ? "Disband Room" : "Leave Room"}
      </button>
    </div>
  );
}
