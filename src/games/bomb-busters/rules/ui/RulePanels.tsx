import { useEffect, useRef, useState } from "react";
import { getMission } from "../../missions";
import { checkTimeUp, chooseBatCutter, claimTurn, declareRedAlert, revealBatNumber } from "../../useBombBustersGame";
import type { AudioTimerState } from "../audioTimer";
import type { BatRadarState } from "../batRadar";
import type { DeadlyValueState } from "../deadlyValue";
import { ruleCanClaimTurn } from "../index";
import type { TimerState } from "../timer";
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

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const formatClock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function TimerPanel({ game, roomCode }: RulePanelProps) {
  const state = game.ruleState.timer as TimerState | undefined;
  const now = useNow();
  const remaining = state?.endsAt ? state.endsAt - now : null;
  const live = game.phase === "playing" || game.phase === "resolving";
  // When time runs out, any client may end the mission (the action re-checks the clock).
  const expired = live && remaining !== null && remaining <= 0;
  useEffect(() => {
    if (expired) void checkTimeUp(roomCode).catch(() => undefined);
  }, [expired, roomCode]);
  if (!state) return null;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">⏱ Time left</span>
      <span className={`bb-clock${remaining !== null && remaining < 60_000 ? " bb-clock--urgent" : ""}`}>
        {remaining === null ? "Starts after setup" : formatClock(remaining)}
      </span>
    </div>
  );
}

export function FreeTurnsPanel({ game, room, uid, roomCode }: RulePanelProps) {
  const [error, setError] = useState<string | null>(null);
  if (game.phase !== "playing" || game.turn !== "") return null;
  const objection = ruleCanClaimTurn(game, uid);
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">Turn open</span>
      {objection ? (
        <span className="bb-muted">{objection}</span>
      ) : (
        <button className="btn btn--sm" type="button" onClick={() => void claimTurn(roomCode, uid).catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't take the turn."))}>
          ✂️ Snip!
        </button>
      )}
      {error && <span className="bb-muted">{error}</span>}
      <span className="bb-muted">{Object.keys(room.players).length > 2 ? "Anyone but the last player can go." : "Either player can go."}</span>
    </div>
  );
}

export function AudioTimerPanel({ game, roomCode }: RulePanelProps) {
  const state = game.ruleState.audioTimer as AudioTimerState | undefined;
  const audioRef = useRef<HTMLAudioElement>(null);
  const url = String(getMission(game.missionId).rules.find((rule) => rule.id === "audioTimer")?.params?.url ?? "");
  if (!state) return null;
  const live = game.phase === "playing" || game.phase === "resolving";
  const play = () => {
    const audio = audioRef.current;
    if (!audio || state.startedAt === null) return;
    // Join the track where the team is, so late joiners stay in sync.
    audio.currentTime = Math.max(0, (Date.now() - state.startedAt) / 1000);
    void audio.play();
  };
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">🔊 Mission audio</span>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onEnded={() => {
          if (live) void checkTimeUp(roomCode, "The audio timer ran out.").catch(() => undefined);
        }}
      />
      {state.startedAt === null ? (
        <span className="bb-muted">Starts after setup</span>
      ) : (
        live && (
          <button className="btn btn--sm" type="button" onClick={play}>
            ▶ Play / rejoin audio
          </button>
        )
      )}
    </div>
  );
}

export function RedAlertPanel({ game, uid, roomCode, requestPick }: RulePanelProps) {
  const [error, setError] = useState<string | null>(null);
  const myTurn = game.phase === "playing" && game.turn === uid && !game.pendingAction && !game.pendingSwap;
  const redsLeft = game.wireTotals.red - game.cutCounts.red;
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">🚨 Red Alert</span>
      <span className="bb-muted">{redsLeft > 0 ? `${redsLeft} red wires to cut at once` : "All reds cut"}</span>
      {myTurn && redsLeft > 0 && requestPick && (
        <button
          className="btn btn--danger btn--sm"
          type="button"
          onClick={() => {
            setError(null);
            requestPick(3, (picks) => void declareRedAlert(roomCode, uid, picks).catch((e: unknown) => setError(e instanceof Error ? e.message : "Red Alert failed.")));
          }}
        >
          Cut the three reds…
        </button>
      )}
      {error && <span className="bb-muted">{error}</span>}
    </div>
  );
}

export function BatRadarPanel({ game, room, uid, roomCode }: RulePanelProps) {
  const [error, setError] = useState<string | null>(null);
  const state = game.ruleState.batRadar as BatRadarState | undefined;
  if (!state || game.phase !== "playing" || !state.active) return null;
  const who = (player: string) => (player === uid ? "You" : room.players[player]?.name ?? "Player");
  const mine = state.active === uid && game.turn === uid && !game.pendingAction && !game.pendingSwap;
  const fail = (fallback: string) => (e: unknown) => setError(e instanceof Error ? e.message : fallback);
  const answers = game.radar?.value === state.current ? game.radar.answers : null;
  const waiting = !answers || Object.values(answers).some((answer) => answer === null);
  return (
    <div className="bb-rule-panel">
      <span className="bb-label">🦇 Number card</span>
      {state.current === null ? <span className="bb-muted">Not revealed</span> : <NumberCard value={state.current} state="current" />}
      {state.current === null && mine && (
        <button className="btn btn--sm" type="button" onClick={() => void revealBatNumber(roomCode, uid).catch(fail("Couldn't reveal the card."))}>
          Reveal number card
        </button>
      )}
      {state.current === null && !mine && <span className="bb-muted">{who(state.active)} reveals the next card</span>}
      {state.current !== null && state.designated === null && mine && waiting && <span className="bb-muted">Waiting for radar answers…</span>}
      {state.current !== null &&
        state.designated === null &&
        mine &&
        !waiting &&
        game.playerOrder
          .filter((player) => answers?.[player])
          .map((player) => (
            <button key={player} className="btn btn--secondary btn--sm" type="button" onClick={() => void chooseBatCutter(roomCode, uid, player).catch(fail("Couldn't choose."))}>
              {player === uid ? "I'll cut it" : `${who(player)} cuts`}
            </button>
          ))}
      {state.current !== null && state.designated === null && !mine && <span className="bb-muted">{who(state.active)} is choosing who cuts</span>}
      {state.designated !== null && (
        <span className="bb-muted">
          {who(state.designated)} {state.designated === uid ? "cut" : "cuts"} a {state.current}
        </span>
      )}
      {error && <span className="bb-muted">{error}</span>}
    </div>
  );
}
