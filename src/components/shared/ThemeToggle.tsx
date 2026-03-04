import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        width: 36,
        height: 36,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "var(--surface)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        fontSize: 16,
        cursor: "pointer",
      }}
    >
      {isDark ? "\u2600" : "\u263E"}
    </button>
  );
}
