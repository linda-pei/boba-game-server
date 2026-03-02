import type { WerewordsHand } from "../../types";

const ROLE_LABELS: Record<string, string> = {
  mayor: "Mayor",
  seer: "Seer",
  werewolf: "Werewolf",
  villager: "Villager",
};

const ROLE_COLORS: Record<string, string> = {
  mayor: "var(--accent-primary)",
  seer: "var(--accent-primary)",
  werewolf: "var(--accent-danger)",
  villager: "var(--accent-secondary)",
};

export default function RoleBanner({ hand }: { hand: WerewordsHand | null }) {
  if (!hand) return null;

  return (
    <div className="ww-role-banner" style={{ borderLeftColor: ROLE_COLORS[hand.role] }}>
      You are a{" "}
      <strong style={{ color: ROLE_COLORS[hand.role] }}>
        {ROLE_LABELS[hand.role]}
      </strong>
    </div>
  );
}
