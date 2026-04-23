import { useState, useEffect } from "react";

interface Props {
  dice: [number, number] | null;
  carriedCount: number;
  animate?: boolean;
}

function randomFace(): number {
  return Math.ceil(Math.random() * 3);
}

function DieFace({ value, rolling }: { value: number; rolling?: boolean }) {
  return (
    <div className={`ds-die${rolling ? " ds-die-rolling" : ""}`}>
      {Array.from({ length: value }, (_, i) => (
        <span key={i} className="ds-die-dot" />
      ))}
    </div>
  );
}

const FLICKER_MS = 80;
const FLICKER_COUNT = 8;
export const DICE_ANIM_MS = FLICKER_MS * FLICKER_COUNT;

export default function DiceRoll({ dice, carriedCount, animate }: Props) {
  const [rolling, setRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!dice) {
      setDisplayDice(null);
      setRolling(false);
      return;
    }

    if (!animate) {
      setDisplayDice([dice[0], dice[1]]);
      setRolling(false);
      return;
    }

    // Animate: flicker random faces then land on real result
    setRolling(true);
    setDisplayDice([randomFace(), randomFace()]);

    const d: [number, number] = [dice[0], dice[1]];
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame < FLICKER_COUNT) {
        setDisplayDice([randomFace(), randomFace()]);
      } else {
        clearInterval(interval);
        setDisplayDice(d);
        setRolling(false);
      }
    }, FLICKER_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice?.[0], dice?.[1], animate]);

  if (!displayDice) return null;

  const total = dice ? dice[0] + dice[1] : 0;
  const effective = Math.max(total - carriedCount, 0);

  return (
    <div className="ds-dice-result">
      <div className="ds-dice-pair">
        <DieFace value={displayDice[0]} rolling={rolling} />
        <DieFace value={displayDice[1]} rolling={rolling} />
      </div>
      {!rolling && dice && (
        <div className="ds-dice-math">
          {total}
          {carriedCount > 0 && (
            <span className="ds-dice-penalty"> - {carriedCount} carried</span>
          )}
          {" = "}
          <strong>{effective}</strong> {effective === 1 ? "step" : "steps"}
        </div>
      )}
    </div>
  );
}
