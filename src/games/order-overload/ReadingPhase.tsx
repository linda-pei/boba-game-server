import { useState } from "react";
import type { OrderOverloadGame, OrderOverloadHand, Room } from "../../types";
import { advanceReading, finishReading, getLevelStars } from "./useOrderOverloadGame";

interface Props {
  roomCode: string;
  game: OrderOverloadGame;
  hand: OrderOverloadHand | null;
  uid: string;
  room: Room;
}

function LevelBadge({ level }: { level: number }) {
  const stars = getLevelStars(level);
  return (
    <span>
      Level {level}
      {stars > 0 && ` ${"★".repeat(stars)}`}
    </span>
  );
}

export default function ReadingPhase({ roomCode, game, hand, uid, room }: Props) {
  const [acting, setActing] = useState(false);

  const orderTakerUid = game.turnOrder[game.orderTakerIndex];
  const isOrderTaker = uid === orderTakerUid;
  const orderTakerName = room.players[orderTakerUid]?.name ?? "Unknown";
  const allRead = game.readingIndex >= game.totalOrdersForLevel - 1;

  const handleNext = async () => {
    setActing(true);
    try {
      await advanceReading(roomCode);
    } catch (err) {
      console.error("Advance reading failed:", err);
    }
    setActing(false);
  };

  const handleDone = async () => {
    setActing(true);
    try {
      await finishReading(roomCode, game);
    } catch (err) {
      console.error("Finish reading failed:", err);
    }
    setActing(false);
  };

  if (!isOrderTaker) {
    return (
      <div className="screen">
        <h2><LevelBadge level={game.level} /></h2>
        <p style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>
          {orderTakerName} is reading orders...
        </p>
        <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>
          {game.readingIndex + 1} / {game.totalOrdersForLevel} orders read
        </p>
        <div
          style={{
            width: "80%",
            maxWidth: "300px",
            height: "8px",
            background: "var(--bg-secondary)",
            borderRadius: "4px",
            margin: "1rem auto",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((game.readingIndex + 1) / game.totalOrdersForLevel) * 100}%`,
              height: "100%",
              background: "var(--accent)",
              borderRadius: "4px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    );
  }

  // Order taker view
  const ordersToRead = hand?.ordersToRead ?? [];
  const currentOrder = ordersToRead[game.readingIndex] ?? "";

  return (
    <div className="screen">
      <h2><LevelBadge level={game.level} /></h2>
      <p style={{ color: "var(--text-light)", fontSize: "0.9rem", margin: "0.5rem 0" }}>
        You are the Order Taker. Read each order!
      </p>

      <p style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
        Order {game.readingIndex + 1} of {game.totalOrdersForLevel}
      </p>

      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "12px",
          padding: "1.5rem 2rem",
          margin: "1rem auto",
          maxWidth: "320px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>
          {currentOrder}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
        {!allRead ? (
          <button onClick={handleNext} disabled={acting}>
            {acting ? "..." : "Next Order"}
          </button>
        ) : (
          <button onClick={handleDone} disabled={acting}>
            {acting ? "Dealing..." : "Done Reading"}
          </button>
        )}
      </div>
    </div>
  );
}
