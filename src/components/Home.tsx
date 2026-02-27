import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";
import { createRoom, joinRoom } from "../hooks/useRoom";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const { uid, username } = useAuthContext();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!uid || !username) return;
    setError("");
    setCreating(true);
    try {
      const code = await createRoom(uid, username);
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!uid || !username) return;
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 4) return;
    setError("");
    setJoining(true);
    try {
      await joinRoom(code, uid, username);
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="home screen">
      <h1>Boba Game Time!</h1>
      <p>Welcome, {username}!</p>

      {error && <p className="error-message">{error}</p>}

      <div className="home-actions">
        <button onClick={handleCreate} disabled={creating}>
          {creating ? "Creating..." : "Create New Room"}
        </button>

        <p className="divider">or</p>

        <div className="join-section">
          <input
            type="text"
            placeholder="ABCD"
            maxLength={4}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={handleJoin}
            disabled={roomCode.length !== 4 || joining}
            className="btn-secondary"
          >
            {joining ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
