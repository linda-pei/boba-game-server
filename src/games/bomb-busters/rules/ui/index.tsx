import type { ComponentType } from "react";
import type { BBGame, Room } from "../../../../types";
import { DeadlyValuePanel, RedHerringPanel, RedTapePanel, RookiePanel, RussianToolboxPanel, SequencePanel } from "./RulePanels";

export interface RulePanelProps {
  game: BBGame;
  room: Room;
  uid: string;
}

/** Board widgets for rules that show something (sequence cards, timer, number card, roles…). */
export const RULE_PANELS: Record<string, ComponentType<RulePanelProps>> = {
  sequence: SequencePanel,
  deadlyValue: DeadlyValuePanel,
  redTape: RedTapePanel,
  russianToolbox: RussianToolboxPanel,
  rookie: RookiePanel,
  redHerring: RedHerringPanel,
};
