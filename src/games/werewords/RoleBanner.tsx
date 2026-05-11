import type { WerewordsHand, WerewordsGame } from "../../types";

const ROLE_LABELS: Record<string, string> = {
  seer: "Seer",
  werewolf: "Werewolf",
  villager: "Villager",
};

const ROLE_COLORS: Record<string, string> = {
  seer: "var(--peach-500)",
  werewolf: "var(--rose-500)",
  villager: "var(--jade-500)",
};

export default function RoleBanner({
  hand,
  game,
  uid,
}: {
  hand: WerewordsHand | null;
  game: WerewordsGame;
  uid: string;
}) {
  if (!hand) return null;

  const isMayor = game.mayor === uid;

  return (
    <div className="ww-role-banner" style={{ borderLeftColor: ROLE_COLORS[hand.role] }}>
      You are a{" "}
      <strong style={{ color: ROLE_COLORS[hand.role] }}>
        {ROLE_LABELS[hand.role]}
      </strong>
      {isMayor && (
        <span style={{ color: "var(--ink-mute)", fontSize: "0.85em" }}>
          {" "}(Mayor)
        </span>
      )}
    </div>
  );
}
