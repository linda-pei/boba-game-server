interface Props {
  dice: [number, number] | null;
  carriedCount: number;
}

function DieFace({ value }: { value: number }) {
  return (
    <div className="ds-die">
      {Array.from({ length: value }, (_, i) => (
        <span key={i} className="ds-die-dot" />
      ))}
    </div>
  );
}

export default function DiceRoll({ dice, carriedCount }: Props) {
  if (!dice) return null;

  const total = dice[0] + dice[1];
  const effective = Math.max(total - carriedCount, 0);

  return (
    <div className="ds-dice-result">
      <div className="ds-dice-pair">
        <DieFace value={dice[0]} />
        <DieFace value={dice[1]} />
      </div>
      <div className="ds-dice-math">
        {total}
        {carriedCount > 0 && (
          <span className="ds-dice-penalty"> - {carriedCount} carried</span>
        )}
        {" = "}
        <strong>{effective}</strong> {effective === 1 ? "step" : "steps"}
      </div>
    </div>
  );
}
