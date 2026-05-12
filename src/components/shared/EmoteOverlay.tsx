import { useRef } from "react";
import type { Emote } from "../../hooks/useEmotes";

interface Props {
  emotes: Emote[];
}

export default function EmoteOverlay({ emotes }: Props) {
  const offsets = useRef<Record<string, number>>({});

  // Assign a stable random x-offset the first time we see each emote
  emotes.forEach((e) => {
    if (!(e.id in offsets.current)) {
      offsets.current[e.id] = Math.floor(Math.random() * 240);
    }
  });

  if (emotes.length === 0) return null;

  return (
    <div className="emote-overlay">
      {emotes.map((emote) => (
        <div
          key={emote.id}
          className="emote-rise-wrapper"
          style={{ right: offsets.current[emote.id] ?? 0 }}
        >
          <div className="emote-float">
            <span className="emote-float-emoji">{emote.emoji}</span>
            <span className="emote-float-name">{emote.playerName}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
