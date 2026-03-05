import { useEffect, useRef } from "react";
import { confirmWordReveal } from "./useWerewordsGame";
import type { WerewordsGame, WerewordsHand, Room } from "../../types";
import RoleBanner from "./RoleBanner";

interface Props {
  roomCode: string;
  game: WerewordsGame;
  hand: WerewordsHand | null;
  uid: string;
  room: Room;
}

export default function WordReveal({ roomCode, game, hand, uid, room }: Props) {
  const needsToConfirm = uid in game.wordRevealed;
  const hasConfirmed = game.wordRevealed[uid] === true;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!needsToConfirm || hasConfirmed || firedRef.current) return;
    const timer = setTimeout(() => {
      firedRef.current = true;
      confirmWordReveal(roomCode, uid);
    }, 5000);
    return () => clearTimeout(timer);
  }, [needsToConfirm, hasConfirmed, roomCode, uid]);

  // Seer or werewolf who needs to see the word
  if (needsToConfirm) {
    return (
      <div className="screen">
        <h2>The Magic Word</h2>
        <RoleBanner hand={hand} game={game} uid={uid} />
        <div className="turn-status" style={{ fontSize: "1.3rem", margin: "1.5rem 0" }}>
          <strong style={{ textTransform: "capitalize" }}>{game.magicWord}</strong>
        </div>
        <p style={{ color: "var(--text-muted)" }}>
          {hasConfirmed ? "Waiting for others..." : "Memorize the word..."}
        </p>
      </div>
    );
  }

  // Villagers / Mayor — just wait
  return (
    <div className="screen">
      <h2>Word Reveal</h2>
      <RoleBanner hand={hand} game={game} uid={uid} />
      <div className="turn-status">
        Seer and Werewolf are viewing the magic word...
      </div>
    </div>
  );
}
