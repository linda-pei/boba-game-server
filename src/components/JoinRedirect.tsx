import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";
import { joinRoom } from "../hooks/useRoom";

export default function JoinRedirect() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid, username } = useAuthContext();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomCode || !uid || !username) return;

    const code = roomCode.toUpperCase();
    joinRoom(code, uid, username)
      .then(() => navigate(`/lobby/${code}`, { replace: true }))
      .catch((err) => setError((err as Error).message));
  }, [roomCode, uid, username, navigate]);

  if (error) {
    return (
      <div className="screen">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  return <p>Joining room...</p>;
}
