import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../hooks/useAuthContext";
import { useCelebration } from "../../hooks/useCelebration";
import { updateRoomSettings, useRoom } from "../../hooks/useRoom";
import type { BBDeclared, BBDetector, BBGame, BBHandWire, BBLabel, BBPublicSlot, Room } from "../../types";
import GameBanner from "../../components/shared/GameBanner";
import GameEndButtons from "../../components/shared/GameEndButtons";
import ResignButton from "../../components/shared/ResignButton";
import TurnStatus from "../../components/shared/TurnStatus";
import { areAdjacent, canRevealRed, describeDeclared, soloCutIndices, unwrapPublic } from "./engine";
import { getEquipment } from "./equipment";
import { MISSIONS, getMission } from "./missions";
import {
  type ResolveResult,
  activateStabilizer,
  answerRadar,
  completeOwnCut,
  declareDualCut,
  finishWalkieTalkies,
  passTurnWithCoffee,
  placeLabel,
  placePostIt,
  placeSetupInfo,
  rechargeDetectors,
  resolveDualCutAsTarget,
  returnWalkieTalkies,
  revealRedWires,
  rewindDial,
  runGeneralRadar,
  soloCut,
  startNextMission,
  startWalkieTalkies,
  useBombBustersGame,
  useBombBustersHand,
} from "./useBombBustersGame";
import "./bomb-busters.css";

const name = (room: Room, uid: string) => room.players[uid]?.name ?? "Player";

/** Flat index where each stand starts, for players with two stands. */
const standOffsets = (stands: unknown[][]) => stands.map((_, i) => stands.slice(0, i).reduce((sum, stand) => sum + stand.length, 0));

/** Log entries store `@uid@` mentions; swap in player names. */
const renderLog = (room: Room, text: string) => text.replace(/@([^@]+)@/g, (_, uid: string) => name(room, uid));

const DETECTOR_LABEL: Record<BBDetector, string> = { none: "Single wire", double: "Double Detector", triple: "Triple Detector", super: "Super Detector" };
const DETECTOR_SLOTS: Record<BBDetector, number> = { none: 1, double: 2, triple: 3, super: 0 };

/** Equipment that opens extra controls on the board when used (others fire immediately or live in the cut panel). */
type EquipMode = "batteries" | "coffee" | "radar" | "post-it" | "label-neq" | "label-eq" | "walkie" | null;

function WireFace({ color, sortKey }: { color: string; sortKey: number }) {
  return <span className={`bb-wire bb-wire--${color}`}>{color === "blue" ? sortKey : color === "red" ? "✕" : "Y"}</span>;
}

function InfoToken({ slot }: { slot: BBPublicSlot }) {
  if (!slot.info) return <span className="bb-info bb-info--empty" />;
  return (
    <span className={`bb-info bb-info--${slot.info.color}`} title="Info token">
      {slot.info.color === "yellow" ? "Y" : slot.info.value}
    </span>
  );
}

function LabelMark({ labels, index }: { labels: BBLabel[]; index: number }) {
  const label = labels.find((item) => item.at === index);
  return label ? <span className="bb-label-mark" title={label.kind === "eq" ? "Same value" : "Different values"}>{label.kind === "eq" ? "=" : "≠"}</span> : null;
}

function Board({ game, room, canUse, onUse }: { game: BBGame; room: Room; canUse: (id: number) => boolean; onUse: (id: number) => void }) {
  const mission = getMission(game.missionId);
  return (
    <section className="bb-board" aria-label="Bomb">
      <div className="bb-mission">
        <span className="bb-mission__id">Mission {mission.id}</span>
        <strong>{mission.name}</strong>
        <span className="bb-muted">{mission.subtitle}</span>
      </div>
      <div className="bb-dial" aria-label={`Detonator: ${game.dial.wrongGuesses} of ${game.dial.limit}`}>
        <span className="bb-label">Detonator</span>
        <div className="bb-dial__track">
          {Array.from({ length: game.dial.limit }, (_, index) => (
            <span
              key={index}
              className={`bb-dial__step${index < game.dial.wrongGuesses ? " bb-dial__step--hit" : ""}${index === game.dial.limit - 1 ? " bb-dial__step--skull" : ""}`}
            >
              {index === game.dial.limit - 1 ? "☠" : ""}
            </span>
          ))}
        </div>
        {game.stabilized && <span className="bb-tag bb-tag--on">🛡️ Stabilizer on</span>}
      </div>
      {game.markers.length > 0 && (
        <div className="bb-markers">
          <span className="bb-label">In play</span>
          {game.markers.map((marker) => (
            <span key={`${marker.color}-${marker.sortKey}`} className={`bb-marker bb-marker--${marker.color}`}>
              {marker.uncertain ? "?" : ""}
              {marker.sortKey}
            </span>
          ))}
        </div>
      )}
      <div className="bb-validation" aria-label="Validation track">
        {Object.keys(game.wireTotals.blue)
          .map(Number)
          .sort((a, b) => a - b)
          .map((value) => (
            <span key={value} className={`bb-validation__value${game.validated.includes(value) ? " bb-validation__value--done" : ""}`}>
              {value}
              <small>{game.cutCounts.blue[value] ?? 0}/{game.wireTotals.blue[value]}</small>
            </span>
          ))}
      </div>
      {game.radar && (
        <div className="bb-radar">
          <span className="bb-label">Radar: {game.radar.value}</span>
          {game.playerOrder.map((player) => (
            <span key={player} className="bb-tag">
              {name(room, player)}: {game.radar!.answers[player] === null ? "…" : game.radar!.answers[player] ? "yes" : "no"}
            </span>
          ))}
        </div>
      )}
      {game.equipment.length > 0 && (
        <div className="bb-equipment">
          {game.equipment.map((card) => {
            const info = getEquipment(card.id);
            return (
              <div
                key={card.id}
                className={`bb-equipment__card${card.unlocked ? " bb-equipment__card--unlocked" : ""}${card.used ? " bb-equipment__card--used" : ""}`}
                title={info.effect}
              >
                <span className="bb-equipment__number">{card.id}</span>
                <strong>{info.name}</strong>
                <span className="bb-muted">{card.used ? "Used" : card.unlocked ? info.effect : `Unlocks at two ${card.id}s`}</span>
                {canUse(card.id) && (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => onUse(card.id)}>
                    Use
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TeammateStand({
  game,
  room,
  uid,
  selectable,
  selected,
  onSelect,
}: {
  game: BBGame;
  room: Room;
  uid: string;
  selectable: boolean;
  selected: number[];
  onSelect: (slot: number) => void;
}) {
  const stands = unwrapPublic(game.stands)[uid] ?? [];
  const offsets = standOffsets(stands);
  const labels = game.labels.filter((label) => label.uid === uid);
  return (
    <div className={`bb-player${game.turn === uid && game.phase === "playing" ? " bb-player--turn" : ""}`}>
      <div className="bb-player__header">
        <strong>{name(room, uid)}</strong>
        {uid === game.captain && <span className="bb-tag">Captain</span>}
        <span className={`bb-tag${game.characters[uid]?.used ? " bb-tag--used" : ""}`}>Double Detector</span>
      </div>
      {stands.map((slots, standIndex) => (
        <div key={standIndex} className="bb-stand">
          {slots.map((slot, position) => {
            const index = offsets[standIndex] + position;
            return (
              <div key={index} className="bb-slot">
                {slot.cut && slot.revealed ? (
                  <WireFace color={slot.revealed.color} sortKey={slot.revealed.sortKey} />
                ) : (
                  <button
                    type="button"
                    className={`bb-wire bb-wire--back${selected.includes(index) ? " bb-wire--selected" : ""}`}
                    disabled={!selectable || slot.cut}
                    onClick={() => onSelect(index)}
                    aria-label={`${name(room, uid)}'s wire ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                )}
                <InfoToken slot={slot} />
                <LabelMark labels={labels} index={index} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MyStand({
  hand,
  slots,
  labels,
  highlight,
  pickable,
  onPick,
}: {
  hand: BBHandWire[][];
  slots: BBPublicSlot[][];
  labels: BBLabel[];
  highlight: number[];
  pickable: (wire: BBHandWire, index: number) => boolean;
  onPick: (index: number) => void;
}) {
  const offsets = standOffsets(hand);
  return (
    <>
      {hand.map((stand, standIndex) => (
        <div key={standIndex} className="bb-stand">
          {stand.map((wire, position) => {
            const index = offsets[standIndex] + position;
            const slot = slots[standIndex]?.[position] ?? { cut: wire.cut };
            return (
              <div key={wire.id} className="bb-slot">
                <button
                  type="button"
                  className={`bb-wire bb-wire--${wire.color}${wire.cut ? " bb-wire--cut" : ""}${highlight.includes(index) ? " bb-wire--selected" : ""}`}
                  disabled={!pickable(wire, index)}
                  onClick={() => onPick(index)}
                  aria-label={`Your wire ${index + 1}: ${wire.color === "blue" ? wire.sortKey : wire.color}${wire.cut ? " (cut)" : ""}`}
                >
                  {wire.color === "blue" ? wire.sortKey : wire.color === "red" ? "✕" : "Y"}
                </button>
                <InfoToken slot={slot} />
                <LabelMark labels={labels} index={index} />
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

export default function BombBustersGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useBombBustersGame(roomCode);
  const hand = useBombBustersHand(roomCode, uid);
  const [target, setTarget] = useState<{ uid: string; slots: number[] } | null>(null);
  const [detector, setDetector] = useState<BBDetector>("none");
  const [xray, setXray] = useState<BBDeclared | null>(null);
  const [useXray, setUseXray] = useState(false);
  const [equipMode, setEquipMode] = useState<EquipMode>(null);
  const [walkieTo, setWalkieTo] = useState<string | null>(null);
  const [recharge, setRecharge] = useState<string[]>([]);
  const [choice, setChoice] = useState<Extract<ResolveResult, { status: "needs-choice" }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledPending = useRef<string | null>(null);

  useCelebration(game?.phase === "mission-won");

  // Clear in-progress selections whenever the game moves on.
  const selectionKey = `${game?.missionId}-${game?.phase}-${game?.turn}-${game?.log.length}`;
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionKey);
  if (lastSelectionKey !== selectionKey) {
    setLastSelectionKey(selectionKey);
    setTarget(null);
    setDetector("none");
    setXray(null);
    setUseXray(false);
    setEquipMode(null);
    setWalkieTo(null);
    setRecharge([]);
  }

  // Steps only this client can perform (it alone can read its stand) run automatically.
  const pending = game?.pendingAction ?? null;
  const swap = game?.pendingSwap ?? null;
  const radarOwed = Boolean(uid && game?.radar && game.radar.answers[uid] === null);
  const autoKey = JSON.stringify({ pending, swap, radarOwed });
  useEffect(() => {
    if (!uid || handledPending.current === autoKey) return;
    const fail = (message: string) => (autoError: unknown) => setError(autoError instanceof Error ? autoError.message : message);
    if (pending?.kind === "dual-cut" && pending.target === uid) {
      handledPending.current = autoKey;
      resolveDualCutAsTarget(roomCode, uid)
        .then((result) => setChoice(result.status === "needs-choice" ? result : null))
        .catch(fail("Could not resolve the cut."));
    } else if (pending?.kind === "own-cut" && pending.by === uid) {
      handledPending.current = autoKey;
      completeOwnCut(roomCode, uid).catch(fail("Could not cut your wire."));
    } else if (swap?.by === uid && swap.stage === "await-return") {
      handledPending.current = autoKey;
      finishWalkieTalkies(roomCode, uid).catch(fail("Could not finish the swap."));
    } else if (radarOwed) {
      handledPending.current = autoKey;
      answerRadar(roomCode, uid).catch(fail("Could not answer the radar."));
    }
  }, [autoKey, pending, swap, radarOwed, roomCode, uid]);

  if (loading || !room) return <p>Loading Bomb Busters…</p>;
  if (!game || !uid) return <p>Bomb Busters game not found.</p>;

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const myStands = hand ?? [];
  const myWires = myStands.flat();
  const mySlots = unwrapPublic(game.stands)[uid] ?? [];
  const teammates = game.playerOrder.filter((player) => player !== uid);
  const idle = game.phase === "playing" && !game.pendingAction && !game.pendingSwap;
  const isMyTurn = idle && game.turn === uid;
  const ready = (id: number) => game.equipment.some((card) => card.id === id && card.unlocked && !card.used);
  const neededSlots = DETECTOR_SLOTS[detector];
  const swapReturnOwed = swap?.to === uid && swap.stage === "await-target";

  const declarable: BBDeclared[] = [
    ...new Set(myWires.filter((wire) => !wire.cut && wire.color === "blue").map((wire) => wire.sortKey)),
  ].sort((a, b) => a - b);
  if (myWires.some((wire) => !wire.cut && wire.color === "yellow")) declarable.push("yellow");
  const soloOptions = declarable.filter((value) => soloCutIndices(myStands, value, game.wireTotals, game.cutCounts));
  const detectorOptions: BBDetector[] = ["none"];
  if (!game.characters[uid]?.used) detectorOptions.push("double");
  if (ready(3)) detectorOptions.push("triple");
  if (ready(5)) detectorOptions.push("super");

  // Your-turn equipment (#3, #5, #10) lives in the cut panel; the rest can be used here.
  const canUseEquipment = (id: number) => {
    if (!ready(id) || !idle || [3, 5, 10].includes(id)) return false;
    if (id === 9 || id === 11) return isMyTurn && !(id === 9 && game.stabilized);
    if (id === 7) return Object.values(game.characters).some((character) => character.used);
    return true;
  };
  const onUseEquipment = (id: number) => {
    setError(null);
    if (id === 6) return void run(() => rewindDial(roomCode, uid));
    if (id === 9) return void run(() => activateStabilizer(roomCode, uid));
    const modes: Record<number, EquipMode> = { 1: "label-neq", 2: "walkie", 4: "post-it", 7: "batteries", 8: "radar", 11: "coffee", 12: "label-eq" };
    setEquipMode((current) => (current === modes[id] ? null : modes[id]));
  };

  const selectTarget = (player: string, slot: number) => {
    if (detector === "super") {
      const uncut = (unwrapPublic(game.stands)[player] ?? []).flat().flatMap((s, index) => (s.cut ? [] : [index]));
      setTarget({ uid: player, slots: uncut });
      return;
    }
    setTarget((current) => {
      if (!current || current.uid !== player) return { uid: player, slots: [slot] };
      if (current.slots.includes(slot)) return { uid: player, slots: current.slots.filter((s) => s !== slot) };
      return { uid: player, slots: [...current.slots, slot].slice(-neededSlots) };
    });
  };
  const targetReady = Boolean(target && (detector === "super" ? target.slots.length > 0 : target.slots.length === neededSlots));

  const declare = (value: BBDeclared) => {
    if (!target) return;
    if (useXray && xray === null) return setXray(value);
    void run(() => declareDualCut(roomCode, uid, target.uid, target.slots, useXray ? xray! : value, detector, useXray ? value : undefined));
  };

  // What clicking one of your own wires does right now.
  const myPickable = (wire: BBHandWire, index: number) => {
    if (choice) return choice.options.includes(index);
    if (swapReturnOwed) return !wire.cut;
    if (equipMode === "post-it") return !wire.cut && wire.color === "blue";
    if (equipMode === "label-neq" || equipMode === "label-eq") return areAdjacent(myStands, index);
    if (equipMode === "walkie") return Boolean(walkieTo) && !wire.cut;
    return game.phase === "setup-info" && game.setupTurn === uid && !wire.cut && wire.color === "blue";
  };
  const onPickMine = (index: number) => {
    if (choice) {
      setChoice(null);
      return void run(async () => {
        const result = await resolveDualCutAsTarget(roomCode, uid, index);
        if (result.status === "needs-choice") setChoice(result);
      });
    }
    if (swapReturnOwed) return void run(() => returnWalkieTalkies(roomCode, uid, index));
    if (equipMode === "post-it") return void run(() => placePostIt(roomCode, uid, index));
    if (equipMode === "label-neq" || equipMode === "label-eq") return void run(() => placeLabel(roomCode, uid, equipMode === "label-eq" ? "eq" : "neq", index));
    if (equipMode === "walkie" && walkieTo) return void run(() => startWalkieTalkies(roomCode, uid, walkieTo, index));
    void run(() => placeSetupInfo(roomCode, uid, index));
  };

  const status = (() => {
    if (choice) return { mood: "mine" as const, text: choice.choose === "cut" ? "More than one wire matches: choose which one is cut." : "Choose which wire gets the info token." };
    if (swapReturnOwed) return { mood: "mine" as const, text: `${name(room, swap!.by)} handed you a wire (Walkie-Talkies): pick one of yours to hand back.` };
    switch (game.phase) {
      case "setup-info":
        return game.setupTurn === uid
          ? { mood: "mine" as const, text: "Place your info token: pick one of your blue wires." }
          : { mood: "waiting" as const, text: `Waiting for ${name(room, game.setupTurn ?? "")} to place an info token…` };
      case "playing":
        if (swap) return { mood: "waiting" as const, text: `Walkie-Talkies: waiting for ${name(room, swap.to)}…` };
        return isMyTurn ? { mood: "mine" as const, text: "Your turn" } : { mood: "waiting" as const, text: `Waiting for ${name(room, game.turn)}…` };
      case "resolving":
        return { mood: "judging" as const, text: pending?.kind === "dual-cut" ? `Checking ${name(room, pending.target)}'s wire…` : "Cutting the matching wire…" };
      case "mission-won":
        return { mood: "judging" as const, text: "Bomb defused! Every wire is cut." };
      default:
        return { mood: "neutral" as const, text: `💥 Boom. ${game.result?.reason ?? ""}` };
    }
  })();

  const equipHint: Record<Exclude<EquipMode, null>, string> = {
    batteries: "Recharge 1 or 2 used Double Detectors:",
    coffee: "Choose who goes next:",
    radar: "Run the radar for:",
    "post-it": "Click one of your uncut blue wires to mark it.",
    "label-neq": "Click the left wire of two adjacent wires with different values.",
    "label-eq": "Click the left wire of two adjacent wires with the same value.",
    walkie: "Choose a teammate, then click the wire you hand them:",
  };

  const isHost = room.host === uid;
  const finished = game.phase === "mission-won" || game.phase === "mission-lost";
  const nextMissionId = Math.min(game.missionId + 1, MISSIONS.length);
  const goToMission = (missionId: number) =>
    run(async () => {
      if (game.phase === "mission-won") {
        const completed = [...new Set([...(room.settings.bombBustersCompleted ?? []), game.missionId])].sort((a, b) => a - b);
        await updateRoomSettings(roomCode, { bombBustersCompleted: completed, bombBustersMission: missionId });
      }
      await startNextMission(roomCode, uid, room.host, game, missionId);
    });

  return (
    <div className="game-screen-wrap bb-wrap">
      <GameBanner game="bb" subtitle={`mission ${game.missionId}`} actions={<ResignButton />} />
      <main className="screen bb-screen">
        <TurnStatus mood={status.mood}>{status.text}</TurnStatus>
        {error && <p className="error-message" role="alert">{error}</p>}

        <Board game={game} room={room} canUse={canUseEquipment} onUse={onUseEquipment} />

        {equipMode && (
          <section className="bb-equip-panel">
            <span>{equipHint[equipMode]}</span>
            {equipMode === "batteries" && (
              <>
                {game.playerOrder.filter((player) => game.characters[player]?.used).map((player) => (
                  <label key={player} className="bb-detector">
                    <input
                      type="checkbox"
                      checked={recharge.includes(player)}
                      onChange={(e) => setRecharge((current) => (e.target.checked ? [...current, player].slice(-2) : current.filter((p) => p !== player)))}
                    />
                    {name(room, player)}
                  </label>
                ))}
                <button className="btn btn--sm" type="button" disabled={busy || recharge.length === 0} onClick={() => void run(() => rechargeDetectors(roomCode, uid, recharge))}>
                  Recharge
                </button>
              </>
            )}
            {equipMode === "coffee" &&
              game.playerOrder
                .filter((player) => player !== uid && unwrapPublic(game.stands)[player].flat().some((slot) => !slot.cut))
                .map((player) => (
                  <button key={player} className="btn btn--sm" type="button" disabled={busy} onClick={() => void run(() => passTurnWithCoffee(roomCode, uid, player))}>
                    {name(room, player)}
                  </button>
                ))}
            {equipMode === "radar" &&
              Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
                <button key={value} className="btn btn--sm" type="button" disabled={busy} onClick={() => void run(() => runGeneralRadar(roomCode, uid, value))}>
                  {value}
                </button>
              ))}
            {equipMode === "walkie" &&
              teammates.map((player) => (
                <button key={player} className={`btn btn--sm${walkieTo === player ? "" : " btn--ghost"}`} type="button" onClick={() => setWalkieTo(player)}>
                  {name(room, player)}
                </button>
              ))}
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEquipMode(null)}>
              Cancel
            </button>
          </section>
        )}

        <section className="bb-teammates">
          {teammates.map((player) => (
            <TeammateStand
              key={player}
              game={game}
              room={room}
              uid={player}
              selectable={isMyTurn && !equipMode}
              selected={target?.uid === player ? target.slots : []}
              onSelect={(slot) => selectTarget(player, slot)}
            />
          ))}
        </section>

        <section className="bb-me">
          <div className="bb-player__header">
            <strong>Your stand</strong>
            {uid === game.captain && <span className="bb-tag">Captain</span>}
            <span className={`bb-tag${game.characters[uid]?.used ? " bb-tag--used" : ""}`}>Double Detector</span>
          </div>
          <MyStand
            hand={myStands}
            slots={mySlots}
            labels={game.labels.filter((label) => label.uid === uid)}
            highlight={choice?.options ?? []}
            pickable={myPickable}
            onPick={onPickMine}
          />
          {game.phase === "setup-info" && game.setupTurn === uid && !myWires.some((wire) => wire.color === "blue") && (
            <div className="bb-actions">
              <button className="btn" type="button" disabled={busy} onClick={() => void run(() => placeSetupInfo(roomCode, uid, null))}>
                No blue wires: skip
              </button>
            </div>
          )}

          {isMyTurn && !equipMode && (
            <div className="bb-cut">
              <div className="bb-cut__row">
                <span className="bb-label">Dual Cut</span>
                {detectorOptions.length > 1 && (
                  <select
                    value={detector}
                    onChange={(e) => {
                      setDetector(e.target.value as BBDetector);
                      setTarget(null);
                    }}
                    aria-label="Detector"
                  >
                    {detectorOptions.map((option) => (
                      <option key={option} value={option}>{DETECTOR_LABEL[option]}</option>
                    ))}
                  </select>
                )}
                {ready(10) && (
                  <label className="bb-detector">
                    <input type="checkbox" checked={useXray} onChange={(e) => { setUseXray(e.target.checked); setXray(null); }} />
                    X or Y Ray (name 2 values)
                  </label>
                )}
              </div>
              <span className="bb-muted">
                {!targetReady
                  ? detector === "super"
                    ? "Click any wire on a teammate's stand to point at the whole stand."
                    : `Pick ${neededSlots === 1 ? "a wire" : `${neededSlots} wires`} on one teammate's stand.`
                  : useXray && xray === null
                  ? "Name the first value…"
                  : useXray
                  ? `First value: ${describeDeclared(xray!)}. Now the second…`
                  : `${name(room, target!.uid)}'s ${detector === "super" ? "stand" : `wire ${target!.slots.map((s) => `#${s + 1}`).join(" / ")}`}: is it…`}
              </span>
              <div className="bb-values">
                {declarable
                  .filter((value) => !(value === "yellow" && (detector === "triple" || detector === "super")))
                  .filter((value) => value !== xray)
                  .map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`btn btn--sm${value === "yellow" ? " bb-value--yellow" : ""}`}
                      disabled={busy || !targetReady}
                      onClick={() => declare(value)}
                    >
                      {describeDeclared(value)}
                    </button>
                  ))}
              </div>
              {(soloOptions.length > 0 || canRevealRed(myStands)) && (
                <div className="bb-cut__row">
                  {soloOptions.map((value) => (
                    <button key={String(value)} type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void run(() => soloCut(roomCode, uid, value))}>
                      Solo Cut all {describeDeclared(value)}
                    </button>
                  ))}
                  {canRevealRed(myStands) && (
                    <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => void run(() => revealRedWires(roomCode, uid))}>
                      Reveal your red wires
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {finished && (
          <section className="bb-result">
            <h3>{game.phase === "mission-won" ? "Mission complete!" : "Mission failed"}</h3>
            <p className="bb-muted">{game.result?.reason}</p>
            {isHost ? (
              <div className="bb-actions">
                {game.phase === "mission-won" && game.missionId < MISSIONS.length && (
                  <button className="btn" type="button" disabled={busy} onClick={() => void goToMission(nextMissionId)}>
                    Next mission ({nextMissionId})
                  </button>
                )}
                <button className="btn btn--secondary" type="button" disabled={busy} onClick={() => void goToMission(game.missionId)}>
                  {game.phase === "mission-won" ? "Play again" : "Retry mission"}
                </button>
              </div>
            ) : (
              <p className="bb-muted">Waiting for the host. The captain passes to the left.</p>
            )}
            <GameEndButtons isHost={isHost} />
          </section>
        )}

        {game.log.length > 0 && (
          <section className="bb-log" aria-label="Turn log">
            <span className="bb-label">Log</span>
            <ol>
              {[...game.log].reverse().slice(0, 12).map((entry) => (
                <li key={`${entry.at}-${entry.text}`}>{renderLog(room, entry.text)}</li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
