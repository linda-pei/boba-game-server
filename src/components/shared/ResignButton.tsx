import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clearGameData } from "../../hooks/clearGameData";

/**
 * Two-click "Resign" button for use during an active game.
 * First click shows "Are you sure?", second click returns everyone to the lobby.
 * Resets after 3 seconds if not confirmed.
 */
export default function ResignButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    if (!roomCode || busy) return;
    setBusy(true);
    try {
      await clearGameData(roomCode);
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      console.error("Failed to resign:", err);
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <button
      className={`btn btn--sm ${confirming ? "btn--danger" : "btn--ghost"}`}
      onClick={handleClick}
      disabled={busy}
      style={{ whiteSpace: "nowrap" }}
    >
      {busy ? "Leaving…" : confirming ? "Confirm?" : "Resign"}
    </button>
  );
}
