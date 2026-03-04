import { useState, useEffect } from "react";

function getInitialDark(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(isDark: boolean) {
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
}

export function useTheme() {
  const [isDark, setIsDark] = useState(getInitialDark);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return { isDark, toggleTheme };
}
