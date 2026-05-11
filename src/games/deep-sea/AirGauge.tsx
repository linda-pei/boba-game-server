interface Props {
  air: number;
  maxAir?: number;
}

function segmentColor(index: number, maxAir: number): string {
  const pct = ((index + 1) / maxAir) * 100;
  if (pct > 50) return "var(--jade-500)";
  if (pct > 25) return "var(--peach-500)";
  return "var(--rose-500)";
}

export default function AirGauge({ air, maxAir = 25 }: Props) {
  return (
    <div className="ds-air-gauge">
      <span className="ds-air-label">Air</span>
      <div className="ds-air-segments">
        {Array.from({ length: maxAir }, (_, i) => (
          <div
            key={i}
            className={`ds-air-seg${i < air ? " ds-air-seg-filled" : ""}`}
            style={i < air ? { backgroundColor: segmentColor(i, maxAir) } : undefined}
          />
        ))}
      </div>
      <span className="ds-air-value">{air}</span>
    </div>
  );
}
