import { useEffect } from "react";
import confetti from "canvas-confetti";

/** Fires a short two-sided confetti burst whenever `active` becomes true. */
export function useCelebration(active: boolean, durationMs = 2000) {
  useEffect(() => {
    if (!active) return;
    const end = Date.now() + durationMs;
    let cancelled = false;
    const frame = () => {
      if (cancelled) return;
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    return () => {
      cancelled = true;
    };
  }, [active, durationMs]);
}
