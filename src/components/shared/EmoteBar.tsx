const EMOJIS = ["\u{1F44F}", "\u{1F602}", "\u{1F525}", "\u{1F631}", "\u{1F389}", "\u{1F914}"];

interface Props {
  onSend: (emoji: string) => void;
  canSend: boolean;
}

export default function EmoteBar({ onSend, canSend }: Props) {
  return (
    <div className="emote-bar">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="emote-btn"
          onClick={() => onSend(emoji)}
          disabled={!canSend}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
