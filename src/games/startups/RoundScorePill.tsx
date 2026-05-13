interface Props {
  /** Cumulative round-chip score across previously-completed rounds. */
  score: number;
}

/** Tiny pill that surfaces a player's running 4-round score during play. */
export default function RoundScorePill({ score }: Props) {
  const sign = score > 0 ? "+" : "";
  const tone = score > 0 ? "is-gain" : score < 0 ? "is-loss" : "is-neutral";
  return (
    <span className={`su-round-pill ${tone}`} title="Round chip score so far">
      {sign}
      {score}
    </span>
  );
}
