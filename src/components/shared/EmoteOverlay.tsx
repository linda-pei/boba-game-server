import type { Emote } from "../../hooks/useEmotes";

/** Stable pseudo-random x-offset (0–239px) derived from the emote id, so it never jumps between renders. */
function offsetFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % 240;
}

interface Props {
  emotes: Emote[];
}

export default function EmoteOverlay({ emotes }: Props) {
  if (emotes.length === 0) return null;

  return (
    <div className="emote-overlay">
      {emotes.map((emote) => (
        <div
          key={emote.id}
          className="emote-rise-wrapper"
          style={{ right: offsetFor(emote.id) }}
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
