import "./ready-list.css";

interface ReadyPlayer {
  id: string;
  name: string;
  ready: boolean;
}

interface Props {
  players: ReadyPlayer[];
  className?: string;
}

export default function ReadyList({ players, className }: Props) {
  return (
    <div className={`ready-list${className ? ` ${className}` : ""}`}>
      {players.map((p) => (
        <span key={p.id} className={`ready-chip${p.ready ? " ready" : ""}`}>
          {p.ready ? "✓" : "○"} {p.name}
        </span>
      ))}
    </div>
  );
}
