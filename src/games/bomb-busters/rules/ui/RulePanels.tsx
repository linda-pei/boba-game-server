import type { DeadlyValueState } from "../deadlyValue";
import { coverDone, type RedTapeState } from "../redTape";
import type { RussianToolboxState } from "../russianToolbox";
import type { SecretRoleState } from "../secretRole";
import type { SequenceState } from "../sequence";
import type { RulePanelProps } from "./index";

/** A small face-up number card. */
export function NumberCard({ value, state = "normal" }: { value: number | string; state?: "normal" | "current" | "done" | "danger" }) {
  return <span className={`bb-number-card bb-number-card--${state}`}>{value}</span>;
}

export function SequencePanel({ game }: RulePanelProps) {
  const state = game.ruleState.sequence as SequenceState | undefined;
  if (!state) return null;
  return (
    <div className="bb-rule-panel" aria-label="Cutting order">
      <span className="bb-label">Order</span>
      {state.cards.map((value, index) => (
        <span key={value} className="bb-rule-panel__step">
          {index > 0 && <span className="bb-rule-panel__arrow">→</span>}
          <NumberCard value={index < state.index ? "✓" : value} state={index < state.index ? "done" : index === state.index ? "current" : "normal"} />
        </span>
      ))}
    </div>
  );
}

export function DeadlyValuePanel({ game }: RulePanelProps) {
  const state = game.ruleState.deadlyValue as DeadlyValueState | undefined;
  if (!state) return null;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">Acts like red</span>
      <NumberCard value={state.value} state="danger" />
    </div>
  );
}

export function RedTapePanel({ game }: RulePanelProps) {
  const state = game.ruleState.redTape as RedTapeState | undefined;
  if (!state) return null;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">Red tape</span>
      {Object.entries(state.covers).map(([cardId, value]) => (
        <span key={cardId} className="bb-rule-panel__step" title={`Equipment #${cardId} also needs a pair of ${value}s`}>
          #{cardId === "13" ? "Y" : cardId}
          <NumberCard value={coverDone(state, Number(cardId), game.cutCounts) ? "✓" : value} state={coverDone(state, Number(cardId), game.cutCounts) ? "done" : "normal"} />
        </span>
      ))}
    </div>
  );
}

export function RussianToolboxPanel({ game }: RulePanelProps) {
  const state = game.ruleState.russianToolbox as RussianToolboxState | undefined;
  if (!state) return null;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">Unlocks the next tool</span>
      {state.current === null ? <span className="bb-muted">No number cards left</span> : <NumberCard value={state.current} state="current" />}
      <span className="bb-muted">
        {state.flipped}/{game.equipment.length} tools flipped
      </span>
    </div>
  );
}

function RolePanel({ game, room, uid, ruleId, title }: RulePanelProps & { ruleId: string; title: string }) {
  const state = game.ruleState[ruleId] as SecretRoleState | undefined;
  if (!state) return null;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">{title}</span>
      <span className="bb-tag bb-tag--role">{state.uid === uid ? "You" : room.players[state.uid]?.name ?? "Player"}</span>
    </div>
  );
}

export const RookiePanel = (props: RulePanelProps) => <RolePanel {...props} ruleId="rookie" title="🔰 Rookie" />;
export const RedHerringPanel = (props: RulePanelProps) => <RolePanel {...props} ruleId="redHerring" title="🐟 Red Herring" />;
