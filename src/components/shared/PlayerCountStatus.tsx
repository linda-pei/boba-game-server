interface Props {
  gameName: string;
  count: number;
  min: number;
  max: number;
}

export default function PlayerCountStatus({ gameName, count, min, max }: Props) {
  const message =
    count < min
      ? `Need ${min - count} more.`
      : count > max
        ? "Too many players!"
        : `${count} players — ready!`;
  return (
    <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
      {gameName} requires {min}–{max} players. {message}
    </p>
  );
}
