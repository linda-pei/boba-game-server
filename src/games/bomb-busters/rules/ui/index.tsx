import type { ComponentType } from "react";
import type { BBGame, Room } from "../../../../types";

export interface RulePanelProps {
  game: BBGame;
  room: Room;
  uid: string;
}

/** Board widgets for rules that show something (sequence cards, timer, number card, roles…). */
export const RULE_PANELS: Record<string, ComponentType<RulePanelProps>> = {};
