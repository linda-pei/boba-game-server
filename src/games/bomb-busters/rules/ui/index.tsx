import type { ComponentType } from "react";
import type { BBGame, Room } from "../../../../types";
import {
  AudioTimerPanel,
  BatRadarPanel,
  RedAlertAction,
  RedAlertPanel,
  DeadlyValuePanel,
  FreeTurnsPanel,
  RedHerringPanel,
  RedTapePanel,
  RookiePanel,
  RussianToolboxPanel,
  SequencePanel,
  TimerPanel,
} from "./RulePanels";

export interface RulePanelProps {
  roomCode: string;
  game: BBGame;
  room: Room;
  uid: string;
  /** Ask the player to pick `count` uncut wires on any stand; `onDone` gets the picks. */
  requestPick?: (count: number, onDone: (picks: { uid: string; slot: number }[]) => void) => void;
}

/** Board widgets for rules that show something (sequence cards, timer, number card, roles…). */
export const RULE_PANELS: Record<string, ComponentType<RulePanelProps>> = {
  sequence: SequencePanel,
  deadlyValue: DeadlyValuePanel,
  redTape: RedTapePanel,
  russianToolbox: RussianToolboxPanel,
  rookie: RookiePanel,
  redHerring: RedHerringPanel,
  timer: TimerPanel,
  freeTurns: FreeTurnsPanel,
  audioTimer: AudioTimerPanel,
  redAlert: RedAlertPanel,
  batRadar: BatRadarPanel,
};

/** Rule-specific actions shown with Solo Cut / Reveal under Dual Cut on your turn. */
export const RULE_ACTIONS: Record<string, ComponentType<RulePanelProps>> = {
  redAlert: RedAlertAction,
};
