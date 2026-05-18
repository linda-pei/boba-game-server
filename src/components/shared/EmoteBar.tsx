import { useState, useRef, useEffect } from "react";

const EMOJIS = ["\u{1F44F}", "\u{1F602}", "\u{1F525}", "\u{1F631}", "\u{1F389}", "\u{1F914}"];
const STORAGE_KEY = "emote-recents";
const MAX_RECENTS = 16;

// ---- Emoji catalogue (curated) ----
const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😂","🤣","😅","😆","😊","🥰","😍","🤩","😘",
      "😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑",
      "😶","🙄","😏","😬","😮","😯","😲","😳","🥺","😢",
      "😭","😤","😡","🤯","😱","🥶","🥵","😈","💀","☠️",
    ],
  },
  {
    label: "Gestures",
    icon: "👋",
    emojis: [
      "👋","🤚","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰",
      "🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎",
      "✊","👊","🤛","🤜","👏","🙌","🫶","🤝","🙏","💪",
    ],
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
    ],
  },
  {
    label: "Animals",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧",
      "🐦","🦅","🦉","🐺","🐗","🐴","🦄","🐝","🐛","🦋",
    ],
  },
  {
    label: "Food",
    icon: "🍕",
    emojis: [
      "🍎","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍑","🍒",
      "🥑","🥦","🥕","🌽","🍄","🧅","🥒","🫑","🍆","🥔",
      "🍕","🍔","🍟","🌮","🌯","🥪","🌭","🍣","🍱","🍜",
      "🍝","🍛","🍲","🥗","🧀","🥚","🍳","🥓","🥩","🍗",
      "🍖","🦐","🦞","🦀","🍩","🍪","🧁","🎂","🍰","🍫",
      "🍬","🍭","🍮","🍡","🍧","🍨","🍦","☕","🍵","🧋",
      "🍺","🍷","🥂","🧃","🥤","🍿","🌶️","🧈","🥞","🧇",
    ],
  },
  {
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","🎯","🎮",
      "🕹️","🎲","♟️","🎭","🎨","🎬","🎤","🎧","🎵","🎶",
      "🏆","🥇","🥈","🥉","🎖️","🏅","🎪","🎸","🥁","🎻",
    ],
  },
  {
    label: "Objects",
    icon: "💡",
    emojis: [
      "💡","🔥","⭐","🌟","✨","💫","🌈","☀️","🌙","⚡",
      "💎","🔔","🎁","🎈","🎊","🎉","💯","💥","💦","💨",
      "🚀","✈️","🏠","⏰","🔑","🗝️","💰","📱","💻","📸",
    ],
  },
  {
    label: "Flags",
    icon: "🏁",
    emojis: [
      "🏁","🚩","🏳️","🏴","🏳️‍🌈","🏴‍☠️","🇺🇸","🇬🇧","🇫🇷","🇩🇪",
      "🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇧🇷","🇨🇦","🇦🇺","🇲🇽","🇮🇹","🇪🇸",
    ],
  },
];

function getRecents(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(emoji: string) {
  try {
    const prev = getRecents().filter((e) => e !== emoji);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([emoji, ...prev].slice(0, MAX_RECENTS)));
  } catch { /* noop */ }
}

interface Props {
  onSend: (emoji: string) => void;
  canSend: boolean;
}

export default function EmoteBar({ onSend, canSend }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(-1); // -1 = recents
  const [recents, setRecents] = useState<string[]>(getRecents);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const handlePickEmoji = (emoji: string) => {
    onSend(emoji);
    saveRecent(emoji);
    setRecents(getRecents());
    setPickerOpen(false);
  };

  // Show recents tab if there are any, otherwise default to first category
  const showRecents = recents.length > 0;
  const effectiveTab = activeTab === -1 && !showRecents ? 0 : activeTab;
  const currentEmojis = effectiveTab === -1 ? recents : CATEGORIES[effectiveTab]?.emojis ?? [];

  // Quick-access: last used custom emoji (not in preset list)
  const lastCustom = recents.find((e) => !EMOJIS.includes(e)) ?? null;

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

      <div className="emote-divider" />

      {/* Last-used custom emoji quick button */}
      {lastCustom && (
        <button
          className="emote-btn"
          onClick={() => onSend(lastCustom)}
          disabled={!canSend}
          title="Last custom emoji"
        >
          {lastCustom}
        </button>
      )}

      {/* Emoji keyboard toggle */}
      <div className="emote-picker-wrap" ref={pickerRef}>
        <button
          className="emote-btn emote-btn--add"
          onClick={() => {
            setPickerOpen(!pickerOpen);
            if (!pickerOpen) setActiveTab(showRecents ? -1 : 0);
          }}
          title="Emoji keyboard"
        >
          +
        </button>
        {pickerOpen && (
          <div className="emote-keyboard">
            <div className="emote-kb-tabs">
              {showRecents && (
                <button
                  className={`emote-kb-tab${effectiveTab === -1 ? " emote-kb-tab--active" : ""}`}
                  onClick={() => setActiveTab(-1)}
                  title="Recent"
                >
                  🕐
                </button>
              )}
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  className={`emote-kb-tab${effectiveTab === i ? " emote-kb-tab--active" : ""}`}
                  onClick={() => setActiveTab(i)}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            <div className="emote-kb-grid">
              {currentEmojis.map((emoji) => (
                <button
                  key={emoji}
                  className="emote-kb-cell"
                  onClick={() => handlePickEmoji(emoji)}
                  disabled={!canSend}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
