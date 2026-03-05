import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../hooks/AuthContext";
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
    await deleteDoc(doc(db, "games", roomCode));
    await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
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
        <button onClick={handleBackToLobby}>
          Back to Lobby
        </button>
      )}
      <button
        onClick={handleLeave}
        className="btn-danger"
        disabled={leaving}
      >
        Leave Game
      </button>
    </div>
  );
}
