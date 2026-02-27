import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";
import { useRoom, leaveRoom, updateRoomSettings } from "../hooks/useRoom";
import { startGame } from "../hooks/useGame";

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid } = useAuthContext();
  const { room, loading, error } = useRoom(roomCode);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

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
  const knower = room.settings.knower;
  const mode = room.settings.mode ?? "competitive";
  const nonKnowerCount = players.filter(([id]) => id !== knower).length;
  const minNonKnowers = mode === "coop" ? 1 : 2;
  const canStart = !!knower && nonKnowerCount >= minNonKnowers;

  const handleLeave = async () => {
    if (!uid || !roomCode) return;
    await leaveRoom(roomCode, uid, isHost);
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

  const handleStart = async () => {
    if (!roomCode || !room) return;
    setStarting(true);
    try {
      await startGame(roomCode, room);
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
              {id === knower && <span className="badge badge-knower">Knower</span>}
              {isHost && id !== knower && (
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

          <div style={{ textAlign: "center" }}>
            <button onClick={handleStart} disabled={!canStart || starting}>
              {starting ? "Starting..." : "Start Game"}
            </button>
            {!canStart && (
              <p style={{ fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
                {!knower
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
