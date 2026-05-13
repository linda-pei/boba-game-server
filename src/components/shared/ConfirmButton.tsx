import { useEffect, useRef, useState } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "lg";
type Mode = "swap" | "pair";

interface Props {
  /** Primary label shown initially. */
  label: string;
  /** Label after first click (swap mode) or on the confirm button (pair mode). */
  confirmLabel?: string;
  /** Cancel label (pair mode only). */
  cancelLabel?: string;
  /** Optional busy label while onConfirm is running. */
  busyLabel?: string;
  /** Button visual variant. */
  variant?: Variant;
  /** Button size modifier. */
  size?: Size;
  /**
   * swap (default): single button whose label changes to confirmLabel on first click.
   *                 Auto-resets after resetMs.
   * pair: shows the original button until first click, then reveals confirm + cancel buttons.
   */
  mode?: Mode;
  /** Auto-reset timeout for swap mode (ms). Default 3000. Set to 0 to disable. */
  resetMs?: number;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ConfirmButton({
  label,
  confirmLabel = "Confirm?",
  cancelLabel = "Cancel",
  busyLabel,
  variant = "danger",
  size,
  mode = "swap",
  resetMs = 3000,
  onConfirm,
  disabled,
  className,
  style,
}: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearReset = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const armReset = () => {
    if (mode !== "swap" || resetMs <= 0) return;
    clearReset();
    timerRef.current = setTimeout(() => setArmed(false), resetMs);
  };

  const handlePrimary = async () => {
    if (!armed) {
      setArmed(true);
      armReset();
      return;
    }
    if (busy) return;
    clearReset();
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  const cancel = () => {
    clearReset();
    setArmed(false);
  };

  const baseClass = ["btn", `btn--${variant}`, size && `btn--${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (mode === "pair" && armed) {
    return (
      <div style={{ display: "inline-flex", gap: "0.5rem", ...style }}>
        <button
          type="button"
          className={baseClass}
          onClick={handlePrimary}
          disabled={disabled || busy}
        >
          {busy && busyLabel ? busyLabel : confirmLabel}
        </button>
        <button
          type="button"
          className={`btn btn--secondary${size ? ` btn--${size}` : ""}`}
          onClick={cancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
      </div>
    );
  }

  // swap mode (or pair mode before first click)
  return (
    <button
      type="button"
      className={baseClass}
      onClick={handlePrimary}
      disabled={disabled || busy}
      style={style}
    >
      {busy && busyLabel ? busyLabel : armed ? confirmLabel : label}
    </button>
  );
}
