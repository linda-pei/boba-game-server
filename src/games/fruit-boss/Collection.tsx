import type { FruitStack, FruitCard } from "../../types";
import Stack from "./Stack";
import { sortedCollection } from "./useFruitBossGame";

interface Props {
  stacks: FruitStack[];
  pendingStars?: FruitCard[];
  /** Compact mode is used for opponents; full for the player's own row. */
  mode?: "full" | "compact";
}

/**
 * Renders a player's collection. Stacks are sorted by score-value descending;
 * the top 3 score positive and any 4+ score negative.
 */
export default function Collection({ stacks, pendingStars, mode = "full" }: Props) {
  const sorted = sortedCollection(stacks);
  const empty = sorted.length === 0 && (!pendingStars || pendingStars.length === 0);

  return (
    <div className={`fb-collection fb-collection--${mode}`}>
      {empty && <span className="fb-collection-empty">No collection yet</span>}
      {sorted.map((stack, i) => (
        <Stack
          key={stack.id}
          stack={stack}
          mode={mode}
          negative={i >= 3}
        />
      ))}
      {pendingStars && pendingStars.length > 0 && (
        <div className="fb-pending-stars" title="Pending star fruit — assigns to your next collected suit">
          ⭐ × {pendingStars.length} pending
        </div>
      )}
    </div>
  );
}
