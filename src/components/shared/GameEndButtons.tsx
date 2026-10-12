import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clearGameData } from "../../hooks/clearGameData";
import { useAuthContext } from "../../hooks/useAuthContext";
import { leaveRoom } from "../../hooks/useRoom";

interface Props {
  isHost: boolean;
}

export default function GameEndButtons({ isHost }: Props) {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid } = useAuthContext();
  const [leaving, setLeaving] = useState(false);

  const handleBackToLobby = async () => {
    if (!roomCode) return;
    await clearGameData(roomCode);
    navigate(`/lobby/${roomCode}`);
  };

  const handleLeave = async () => {
    if (!roomCode || !uid) return;
    setLeaving(true);
    await leaveRoom(roomCode, uid);
    navigate("/");
  };

  return (
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
      {isHost && (
        <button className="btn btn--primary" onClick={handleBackToLobby}>
          Back to Lobby
        </button>
      )}
      <button
        onClick={handleLeave}
        className="btn btn--danger"
        disabled={leaving}
      >
        Leave Room
      </button>
    </div>
  );
}
