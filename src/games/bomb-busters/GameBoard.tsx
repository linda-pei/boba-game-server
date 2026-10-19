import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../hooks/useAuthContext";
import { useCelebration } from "../../hooks/useCelebration";
import { updateRoomSettings, useRoom } from "../../hooks/useRoom";
import type { BBDeclared, BBDetector, BBGame, BBHandWire, BBLabel, BBPublicSlot, Room } from "../../types";
import GameBanner from "../../components/shared/GameBanner";
import GameEndButtons from "../../components/shared/GameEndButtons";
import ResignButton from "../../components/shared/ResignButton";
import TurnStatus from "../../components/shared/TurnStatus";
import { areAdjacent, canRevealRed, describeDeclared, onOneStand, soloCutIndices, uncutOnStand, unwrapPublic } from "./engine";
import { getEquipment } from "./equipment";
import { MISSIONS, getMission } from "./missions";
import { deadlyCheck, describeRules, ruleCanCut, ruleCanReveal, ruleCanUseEquipment, ruleEquipmentFaceDown, ruleTurnStatus, setupInfoPolicy } from "./rules";
import { RULE_ACTIONS, RULE_PANELS, type RulePanelProps } from "./rules/ui";
import {
  type ResolveResult,
  activateStabilizer,
  openFalseBottom,
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
  resolveRedAlertAsOwner,
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

/** Log entries store `@uid@` mentions; swap in player names. */
const renderLog = (room: Room, text: string) => text.replace(/@([^@]+)@/g, (_, uid: string) => name(room, uid));

/** Flat index where each stand starts, for players with two stands. */
const standOffsets = (stands: unknown[][]) => stands.map((_, i) => stands.slice(0, i).reduce((sum, stand) => sum + stand.length, 0));

const DETECTOR_LABEL: Record<BBDetector, string> = { none: "Single wire", double: "with Double Detector", triple: "with Triple Detector", super: "with Super Detector" };
const DETECTOR_SLOTS: Record<BBDetector, number> = { none: 1, double: 2, triple: 3, super: 0 };
/** Your-turn equipment used from the Dual Cut controls rather than a Use button: #3, #5 and #10. */
const DUAL_CUT_EQUIPMENT = [3, 5, 10];

/** Equipment that opens extra controls on the board when used (others fire immediately or live in the cut panel). */
type EquipMode = "batteries" | "coffee" | "radar" | "post-it" | "label-neq" | "label-eq" | "walkie" | null;

/** Wire label: blue shows its value; red/yellow show their sorting decimal (e.g. 6.5, 4.1). */
const wireLabel = (color: string, sortKey: number) => (color === "blue" ? String(sortKey) : sortKey.toFixed(1));

function WireFace({ color, sortKey }: { color: string; sortKey: number }) {
  return <span className={`bb-wire bb-wire--${color}${color === "blue" ? "" : " bb-wire--decimal"}`}>{wireLabel(color, sortKey)}</span>;
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
  // A bracket under this wire and the next, with the symbol centered between them.
  return label ? (
    <span className="bb-label-mark" title={label.kind === "eq" ? "These two wires have the same value" : "These two wires have different values"}>
      <span className="bb-label-mark__symbol">{label.kind === "eq" ? "=" : "≠"}</span>
    </span>
  ) : null;
}

function Board({
  roomCode,
  game,
  room,
  uid,
  canUse,
  onUse,
  requestPick,
}: {
  roomCode: string;
  game: BBGame;
  room: Room;
  uid: string;
  canUse: (id: number) => boolean;
  onUse: (id: number) => void;
  requestPick: RulePanelProps["requestPick"];
}) {
  const mission = getMission(game.missionId);
  return (
    <section className="bb-board" aria-label="Bomb">
      <div className="bb-mission">
        <span className="bb-mission__id">Mission {mission.id}</span>
        <strong>{mission.name}</strong>
        <span className="bb-muted">{mission.subtitle}</span>
        {describeRules(game).map((line) => (
          <span key={line} className="bb-rule-line">⚠️ {line}</span>
        ))}
      </div>
      {getMission(game.missionId).rules.map(({ id }) => {
        const Panel = RULE_PANELS[id];
        return Panel ? <Panel key={id} roomCode={roomCode} game={game} room={room} uid={uid} requestPick={requestPick} /> : null;
      })}
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
          {/* Known wires show only how many are in play; "N out of M" candidates show their possible values. */}
          {(["red", "yellow"] as const).map((color) => {
            const known = game.markers.filter((marker) => marker.color === color && !marker.uncertain).length;
            return known > 0 ? (
              <span key={color} className={`bb-marker bb-marker--${color}`}>
                {known} {color}
              </span>
            ) : null;
          })}
          {game.markers
            .filter((marker) => marker.uncertain)
            .map((marker) => (
              <span key={`${marker.color}-${marker.sortKey}`} className={`bb-marker bb-marker--${marker.color}`}>
                ?{marker.sortKey}
              </span>
            ))}
          {game.markers.some((marker) => marker.uncertain) && (
            <span className="bb-muted">
              {(["red", "yellow"] as const)
                .filter((color) => game.markers.some((marker) => marker.color === color && marker.uncertain))
                .map((color) => `${game.wireTotals[color]} of these ${color}`)
                .join(", ")}{" "}
              in play
            </span>
          )}
        </div>
      )}
      <div className="bb-validation" aria-label="Validation track">
        {Object.keys(game.wireTotals.blue)
          .map(Number)
          .sort((a, b) => a - b)
          .map((value) => (
            <span key={value} className={`bb-validation__value${game.validated.includes(value) ? " bb-validation__value--done" : ""}`}>
              {value}
              {game.validated.includes(value) ? (
                <small className="bb-validation__check" aria-label="All cut">✓</small>
              ) : (
                <small>{game.cutCounts.blue[value] ?? 0}/{game.wireTotals.blue[value]}</small>
              )}
            </span>
          ))}
      </div>
      {game.log.length > 0 && (
        <p className="bb-last-action" aria-live="polite">{renderLog(room, game.log[game.log.length - 1].text)}</p>
      )}
      {game.radar && (
        <div className="bb-radar">
          <span className="bb-label">Radar: {game.radar.value}</span>
          {game.playerOrder.flatMap((player) => {
            const answer = game.radar!.answers[player];
            const stands = game.radar!.standAnswers?.[player];
            // Players with two stands answer for each stand separately.
            if (answer !== null && stands && stands.length > 1) {
              return stands.map((has, index) => (
                <span key={`${player}-${index}`} className="bb-tag">
                  {name(room, player)} (stand {index + 1}): {has ? "yes" : "no"}
                </span>
              ));
            }
            return [
              <span key={player} className="bb-tag">
                {name(room, player)}: {answer === null ? "…" : answer ? "yes" : "no"}
              </span>,
            ];
          })}
        </div>
      )}
      {game.equipment.length > 0 && (
        <div className="bb-equipment">
          {game.equipment.map((card) => {
            const info = getEquipment(card.id);
            if (ruleEquipmentFaceDown(game, card.id)) {
              return (
                <div key={card.id} className="bb-equipment__card bb-equipment__card--face-down" title="Face-down equipment">
                  <span className="bb-equipment__number">?</span>
                  <strong>Face down</strong>
                </div>
              );
            }
            return (
              <div
                key={card.id}
                className={`bb-equipment__card${card.unlocked ? " bb-equipment__card--unlocked" : ""}${card.used ? " bb-equipment__card--used" : ""}`}
              >
                <span className={`bb-equipment__number${card.id === 13 ? " bb-equipment__number--yellow" : ""}`}>{card.id === 13 ? "Y" : card.id}</span>
                {/* The full effect is behind the info icon (hover, or tap to focus) to keep the cards compact. */}
                <div className="bb-equipment__name">
                  <strong>{info.name}</strong>
                  <span className="bb-equipment__info" tabIndex={0} role="button" aria-label={`About ${info.name}`} aria-describedby={`bb-equipment-tip-${card.id}`}>
                    i
                  </span>
                  <span className="bb-equipment__tip" role="tooltip" id={`bb-equipment-tip-${card.id}`}>
                    {info.effect}
                  </span>
                </div>
                <span className="bb-muted">{card.used ? "Used" : card.unlocked ? (DUAL_CUT_EQUIPMENT.includes(card.id) ? "Ready · use via Dual Cut" : "Ready") : card.id === 13 ? "Unlocks at two yellow wires" : `Unlocks at two ${card.id}s`}</span>
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
  children,
}: {
  game: BBGame;
  room: Room;
  uid: string;
  selectable: boolean;
  selected: number[];
  onSelect: (slot: number) => void;
  /** The "is it…" prompt, shown under the stand you're pointing at. */
  children?: React.ReactNode;
}) {
  const stands = unwrapPublic(game.stands)[uid] ?? [];
  const offsets = standOffsets(stands);
  const labels = game.labels.filter((label) => label.uid === uid);
  return (
    <div className={`bb-player${game.turn === uid && game.phase === "playing" ? " bb-player--turn" : ""}`}>
      <div className="bb-player__header">
        <strong>{name(room, uid)}</strong>
        {uid === game.captain && <span className="bb-tag">Captain</span>}
        {game.besideTokens?.[uid] !== undefined && <span className="bb-tag" title="Info token beside the stand">No {game.besideTokens[uid]}s</span>}
        <span className={`bb-tag${game.characters[uid]?.used ? " bb-tag--used" : ""}`}>Double Detector</span>
      </div>
      {stands.map((slots, standIndex) => (
        <div key={standIndex} className={`bb-stand${labels.length > 0 ? " bb-stand--labeled" : ""}`}>
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
                  />
                )}
                <InfoToken slot={slot} />
                <LabelMark labels={labels} index={index} />
              </div>
            );
          })}
        </div>
      ))}
      {children}
    </div>
  );
}

function MyStand({
  hand,
  slots,
  labels,
  highlight,
  hint,
  titleFor,
  pickable,
  onPick,
}: {
  hand: BBHandWire[][];
  slots: BBPublicSlot[][];
  labels: BBLabel[];
  highlight: number[];
  /** Wires that could be solo cut right now (light outline). */
  hint: number[];
  /** Optional tooltip per wire (e.g. why it can't be picked). */
  titleFor?: (wire: BBHandWire) => string | undefined;
  pickable: (wire: BBHandWire, index: number) => boolean;
  onPick: (index: number) => void;
}) {
  const offsets = standOffsets(hand);
  return (
    <>
      {hand.map((stand, standIndex) => (
        <div key={standIndex} className={`bb-stand${labels.length > 0 ? " bb-stand--labeled" : ""}`}>
          {stand.map((wire, position) => {
            const index = offsets[standIndex] + position;
            const slot = slots[standIndex]?.[position] ?? { cut: wire.cut };
            return (
              <div key={wire.id} className="bb-slot">
                <button
                  type="button"
                  className={`bb-wire bb-wire--${wire.color}${wire.color === "blue" ? "" : " bb-wire--decimal"}${wire.cut ? " bb-wire--cut" : ""}${highlight.includes(index) ? " bb-wire--selected" : hint.includes(index) ? " bb-wire--solo" : ""}`}
                  disabled={!pickable(wire, index)}
                  onClick={() => onPick(index)}
                  title={titleFor?.(wire)}
                  aria-label={`Your wire ${index + 1}: ${wire.color === "blue" ? wire.sortKey : wire.color}${wire.cut ? " (cut)" : ""}`}
                >
                  {wireLabel(wire.color, wire.sortKey)}
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
  // A rule panel asked the player to pick wires anywhere (e.g. Red Alert's three reds).
  const [rulePick, setRulePick] = useState<{
    count: number;
    label: string;
    picks: { uid: string; slot: number }[];
    onDone: (picks: { uid: string; slot: number }[]) => Promise<void>;
  } | null>(null);
  const requestPick: RulePanelProps["requestPick"] = (count, label, onDone) => setRulePick({ count, label, picks: [], onDone });
  const [walkieTo, setWalkieTo] = useState<string | null>(null);
  const [recharge, setRecharge] = useState<string[]>([]);
  // Your own wires picked for a Solo Cut, one click per wire (like pointing at a teammate's).
  const [soloSelected, setSoloSelected] = useState<number[]>([]);
  // Red Herring's setup: the wire picked for a fake info token, awaiting its value.
  const [fakeSlot, setFakeSlot] = useState<number | null>(null);
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
    setSoloSelected([]);
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
      completeOwnCut(roomCode, uid)
        .then((result) => setChoice(result.status === "needs-choice" ? result : null))
        .catch(fail("Could not cut your wire."));
    } else if (swap?.by === uid && swap.stage === "await-return") {
      handledPending.current = autoKey;
      finishWalkieTalkies(roomCode, uid).catch(fail("Could not finish the swap."));
    } else if (pending?.kind === "red-alert" && pending.picks.some((pick) => pick.uid === uid) && !pending.confirmed.includes(uid)) {
      handledPending.current = autoKey;
      resolveRedAlertAsOwner(roomCode, uid).catch(fail("Could not check your wires."));
    } else if (radarOwed) {
      handledPending.current = autoKey;
      answerRadar(roomCode, uid).catch(fail("Could not answer the radar."));
    } else {
      // Remember idle states too, so the same step coming up again (e.g. mission 18's radar every
      // turn) isn't mistaken for the one already handled.
      handledPending.current = autoKey;
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
  // Unlocked, unused, and allowed for this player by the mission's rules (e.g. Red Herring can't use equipment).
  const ready = (id: number) => game.equipment.some((card) => card.id === id && card.unlocked && !card.used) && !ruleCanUseEquipment(game, uid, id);
  const neededSlots = DETECTOR_SLOTS[detector];
  const swapReturnOwed = swap?.to === uid && swap.stage === "await-target";
  const setupOwed = game.phase === "setup-info" && !(game.setupDone ?? []).includes(uid);
  const setupPolicy = setupInfoPolicy(game, uid);
  const setupPlacedCount = (game.setupPlaced ?? {})[uid] ?? 0;
  const mySlotsFlat = mySlots.flat();

  const declarable: BBDeclared[] = [
    ...new Set(myWires.filter((wire) => !wire.cut && wire.color === "blue").map((wire) => wire.sortKey)),
  ].sort((a, b) => a - b);
  if (myWires.some((wire) => !wire.cut && wire.color === "yellow")) declarable.push("yellow");
  // Values a mission rule forbids right now (e.g. out of sequence) aren't offered.
  const allowedDeclarable = declarable.filter((value) => !ruleCanCut(game, value));
  const soloOptions = allowedDeclarable.filter((value) => soloCutIndices(myStands, value, game.wireTotals, game.cutCounts));
  const soloIndices = (value: BBDeclared) => soloCutIndices(myStands, value, game.wireTotals, game.cutCounts) ?? [];
  const soloValueOf = (wire: BBHandWire): BBDeclared | null => {
    const value: BBDeclared = wire.color === "yellow" ? "yellow" : wire.sortKey;
    return !wire.cut && wire.color !== "red" && soloOptions.includes(value) ? value : null;
  };
  const soloHint = isMyTurn && !equipMode ? soloOptions.flatMap(soloIndices) : [];
  // The Solo Cut button appears once the selection is exactly one value's full remaining set.
  const soloReady = soloOptions.find((value) => {
    const indices = soloIndices(value);
    return indices.length === soloSelected.length && indices.every((index) => soloSelected.includes(index));
  });
  const detectorOptions: BBDetector[] = ["none"];
  if (!game.characters[uid]?.used) detectorOptions.push("double");
  if (ready(3)) detectorOptions.push("triple");
  if (ready(5)) detectorOptions.push("super");

  // Dual Cut equipment lives in the cut panel; the rest can be used here.
  const canUseEquipment = (id: number) => {
    if (!ready(id) || !idle || DUAL_CUT_EQUIPMENT.includes(id)) return false;
    if (id === 9 || id === 11) return isMyTurn && !(id === 9 && game.stabilized);
    if (id === 7) return Object.values(game.characters).some((character) => character.used);
    return true;
  };
  const onUseEquipment = (id: number) => {
    setError(null);
    if (id === 6) return void run(() => rewindDial(roomCode, uid));
    if (id === 9) return void run(() => activateStabilizer(roomCode, uid));
    if (id === 13) return void run(() => openFalseBottom(roomCode, uid));
    const modes: Record<number, EquipMode> = { 1: "label-neq", 2: "walkie", 4: "post-it", 7: "batteries", 8: "radar", 11: "coffee", 12: "label-eq" };
    setEquipMode((current) => (current === modes[id] ? null : modes[id]));
  };

  const selectTarget = (player: string, slot: number) => {
    const stands = unwrapPublic(game.stands)[player] ?? [];
    if (detector === "super") {
      setTarget({ uid: player, slots: uncutOnStand(stands, slot) });
      return;
    }
    setTarget((current) => {
      // Detectors point at one stand: a wire on another player or stand starts over.
      if (!current || current.uid !== player || !onOneStand(stands, [...current.slots, slot])) return { uid: player, slots: [slot] };
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
    if (rulePick) return !wire.cut;
    if (choice) return choice.options.includes(index);
    if (swapReturnOwed) return !wire.cut;
    if (equipMode === "post-it") return !wire.cut && wire.color === "blue";
    if (equipMode === "label-neq" || equipMode === "label-eq") return areAdjacent(myStands, index);
    if (equipMode === "walkie") return Boolean(walkieTo) && !wire.cut;
    if (isMyTurn && soloValueOf(wire) !== null) return true;
    if (setupOwed && setupPolicy.fake) return !wire.cut && wire.color !== "red" && !mySlotsFlat[index]?.info;
    if (setupOwed && setupPolicy.value !== undefined) return !wire.cut && wire.color === "blue" && wire.sortKey === setupPolicy.value;
    return setupOwed && !wire.cut && wire.color === "blue";
  };
  const pickForRule = (owner: string, slot: number) => {
    if (!rulePick) return;
    const key = (p: { uid: string; slot: number }) => `${p.uid}:${p.slot}`;
    const exists = rulePick.picks.some((p) => key(p) === `${owner}:${slot}`);
    if (!exists && rulePick.picks.length >= rulePick.count) return;
    const picks = exists ? rulePick.picks.filter((p) => key(p) !== `${owner}:${slot}`) : [...rulePick.picks, { uid: owner, slot }];
    setRulePick({ ...rulePick, picks });
  };
  // Like a Dual Cut: pick the wires first, then confirm the action.
  const confirmRulePick = () => {
    if (!rulePick || rulePick.picks.length !== rulePick.count) return;
    setRulePick(null);
    void run(() => rulePick.onDone(rulePick.picks));
  };
  const onPickMine = (index: number) => {
    if (rulePick) return pickForRule(uid, index);
    if (choice) {
      const resolve = choice.choose === "own" ? completeOwnCut : resolveDualCutAsTarget;
      setChoice(null);
      return void run(async () => {
        const result = await resolve(roomCode, uid, index);
        if (result.status === "needs-choice") setChoice(result);
      });
    }
    if (swapReturnOwed) return void run(() => returnWalkieTalkies(roomCode, uid, index));
    if (equipMode === "post-it") return void run(() => placePostIt(roomCode, uid, index));
    if (equipMode === "label-neq" || equipMode === "label-eq") return void run(() => placeLabel(roomCode, uid, equipMode === "label-eq" ? "eq" : "neq", index));
    if (equipMode === "walkie" && walkieTo) return void run(() => startWalkieTalkies(roomCode, uid, walkieTo, index));
    const soloValue = isMyTurn ? soloValueOf(myWires[index]) : null;
    if (soloValue !== null) {
      // Toggle this wire; picking a wire of a different value starts a fresh selection.
      return setSoloSelected((current) => {
        if (current.includes(index)) return current.filter((i) => i !== index);
        const sameValue = current.every((i) => soloValueOf(myWires[i]) === soloValue);
        return sameValue ? [...current, index] : [index];
      });
    }
    if (setupOwed && setupPolicy.fake) return setFakeSlot(index);
    void run(() => placeSetupInfo(roomCode, uid, index));
  };

  // A rule can forbid Reveal Red (mission 13: those reds go through Red Alert instead).
  const revealable = canRevealRed(myStands, deadlyCheck(game)) && !ruleCanReveal(game, uid);
  const ruled = uid && game.phase === "playing" ? ruleTurnStatus(game, uid) : null;
  const status = (() => {
    if (rulePick) {
      const left = rulePick.count - rulePick.picks.length;
      return { mood: "mine" as const, text: left > 0 ? `Pick ${left} more wire${left === 1 ? "" : "s"} (any stand).` : `${rulePick.label}, or Cancel.` };
    }
    if (choice) {
      const text = {
        own: "Correct! Choose which of your matching wires to cut.",
        cut: choice.options.length > 1 ? "More than one wire matches: choose which one is cut." : "It matches: click the highlighted wire to confirm the cut.",
        info: choice.options.length > 1 ? "Choose which wire gets the info token." : "No match: click the highlighted wire to place the info token.",
      }[choice.choose];
      return { mood: "mine" as const, text };
    }
    if (swapReturnOwed) return { mood: "mine" as const, text: `${name(room, swap!.by)} handed you a wire (Walkie-Talkies): pick one of yours to hand back.` };
    switch (game.phase) {
      case "setup-info":
        return setupOwed
          ? setupPolicy.fake
            ? { mood: "mine" as const, text: `You're Red Herring: place ${setupPolicy.count} fake info tokens (${setupPlacedCount}/${setupPolicy.count}). Pick a wire, then a value that doesn't match it.` }
            : setupPolicy.value !== undefined
            ? { mood: "mine" as const, text: `Your info token is a ${setupPolicy.value}: point it at one of your ${setupPolicy.value}s.` }
            : { mood: "mine" as const, text: "Place your info token: pick one of your blue wires." }
          : { mood: "waiting" as const, text: `Waiting for ${game.playerOrder.filter((player) => !(game.setupDone ?? []).includes(player)).map((player) => name(room, player)).join(", ")} to place an info token…` };
      case "playing":
        if (swap) return { mood: "waiting" as const, text: `Walkie-Talkies: waiting for ${name(room, swap.to)}…` };
        if (game.turn === "") return { mood: "neutral" as const, text: 'The turn is open: say "Snip!" to take it.' };
        if (ruled) return { mood: ruled.mine ? ("mine" as const) : ("waiting" as const), text: ruled.text };
        return isMyTurn ? { mood: "mine" as const, text: "Your turn" } : { mood: "waiting" as const, text: `Waiting for ${name(room, game.turn)}…` };
      case "resolving":
        if (pending?.kind === "red-alert") return { mood: "judging" as const, text: `🚨 Red Alert! Checking ${pending.picks.map((p) => name(room, p.uid)).join(" and ")}'s wires…` };
        return { mood: "judging" as const, text: pending?.kind === "dual-cut" ? `Checking ${name(room, pending.target)}'s wire…` : `${pending ? name(room, pending.by) : "A player"} is cutting the matching wire…` };
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

  // Only built once wires are selected (it reads the target).
  const cutPrompt = target && targetReady && (
    <div className="bb-cut-prompt">
      <span className="bb-muted">
                {useXray && xray === null
                  ? "Name the first value…"
                  : useXray
                  ? `First value: ${describeDeclared(xray!)}. Now the second…`
                  : detector === "super"
                  ? `${name(room, target.uid)}'s stand: is one of its wires…`
                  : target.slots.length === 1
                  ? `${name(room, target.uid)}'s wire: is it…`
                  : `${name(room, target.uid)}'s ${target.slots.length} wires: is one of them…`}
              </span>
              <div className="bb-values">
                {allowedDeclarable
                  .filter((value) => !(value === "yellow" && (detector === "triple" || detector === "super")))
                  .filter((value) => value !== xray)
                  .map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`btn btn--sm${value === "yellow" ? " bb-value--yellow" : ""}`}
                      disabled={busy}
                      onClick={() => declare(value)}
                    >
                      {describeDeclared(value)}
                    </button>
                  ))}
              </div>
    </div>
  );

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

        <Board
          roomCode={roomCode}
          game={game}
          room={room}
          uid={uid}
          canUse={canUseEquipment}
          onUse={onUseEquipment}
          requestPick={requestPick}
        />

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
              selectable={(isMyTurn && !equipMode) || Boolean(rulePick)}
              selected={rulePick ? rulePick.picks.filter((p) => p.uid === player).map((p) => p.slot) : target?.uid === player ? target.slots : []}
              onSelect={(slot) => (rulePick ? pickForRule(player, slot) : selectTarget(player, slot))}
            >
              {target?.uid === player && targetReady && cutPrompt}
            </TeammateStand>
          ))}
        </section>

        <section className="bb-me">
          <div className="bb-player__header">
            <strong>Your stand</strong>
            {uid === game.captain && <span className="bb-tag">Captain</span>}
            {game.besideTokens?.[uid] !== undefined && <span className="bb-tag" title="Info token beside your stand">No {game.besideTokens[uid]}s</span>}
            <span className={`bb-tag${game.characters[uid]?.used ? " bb-tag--used" : ""}`}>Double Detector</span>
            {soloHint.length > 0 && soloReady === undefined && (
              <span className="bb-solo-hint">✂️ Solo Cut available: select your {soloOptions.map((value) => `"${describeDeclared(value)}"`).join(" or ")} wires</span>
            )}
          </div>
          <MyStand
            hand={myStands}
            slots={mySlots}
            labels={game.labels.filter((label) => label.uid === uid)}
            highlight={rulePick ? rulePick.picks.filter((p) => p.uid === uid).map((p) => p.slot) : (choice?.options ?? soloSelected)}
            hint={soloHint}
            titleFor={(wire) =>
              setupOwed && !wire.cut && (setupPolicy.fake ? wire.color === "red" : wire.color !== "blue")
                ? `Info tokens can't go in front of ${wire.color} wires`
                : undefined
            }
            pickable={myPickable}
            onPick={onPickMine}
          />
          {setupOwed && fakeSlot !== null && (
            <div className="bb-fake-values" role="group" aria-label="Fake value">
              <span className="bb-muted">Wire #{fakeSlot + 1} shows:</span>
              {[...Array.from({ length: 12 }, (_, i) => i + 1), "yellow" as const].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  className={`btn btn--sm${value === "yellow" ? " bb-value--yellow" : ""}`}
                  disabled={busy}
                  onClick={() => {
                    const slot = fakeSlot;
                    setFakeSlot(null);
                    void run(() => placeSetupInfo(roomCode, uid, slot, value));
                  }}
                >
                  {describeDeclared(value)}
                </button>
              ))}
            </div>
          )}
          {setupOwed && !setupPolicy.fake && setupPolicy.value === undefined && myWires.some((wire) => wire.color !== "blue") && (
            <p className="bb-setup-note">
              Info tokens can&apos;t go in front of {[...new Set(myWires.filter((wire) => wire.color !== "blue").map((wire) => wire.color))].join(" or ")} wires.
            </p>
          )}
          {setupOwed && setupPolicy.value !== undefined && !myWires.some((wire) => !wire.cut && wire.color === "blue" && wire.sortKey === setupPolicy.value) && (
            <div className="bb-actions">
              <button className="btn" type="button" disabled={busy} onClick={() => void run(() => placeSetupInfo(roomCode, uid, null))}>
                No {setupPolicy.value}s: place it beside your stand
              </button>
            </div>
          )}
          {setupOwed && !setupPolicy.fake && setupPolicy.value === undefined && !myWires.some((wire) => wire.color === "blue") && (
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
                    className="bb-select"
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
              {(soloReady !== undefined || revealable) && (
                <div className="bb-cut__row bb-cut__row--actions">
                  {soloReady !== undefined && (
                    <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void run(() => soloCut(roomCode, uid, soloReady))}>
                      Solo Cut {soloSelected.length} × {describeDeclared(soloReady)}
                    </button>
                  )}
                  {revealable && (
                    <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => void run(() => revealRedWires(roomCode, uid))}>
                      Reveal your red wires
                    </button>
                  )}
                </div>
              )}
              {rulePick ? (
                <div className="bb-cut__row bb-cut__row--rule">
                  <span className="bb-muted">
                    {rulePick.picks.length} of {rulePick.count} wires picked
                  </span>
                  {rulePick.picks.length === rulePick.count && (
                    <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={confirmRulePick}>
                      {rulePick.label}
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRulePick(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="bb-cut__row bb-cut__row--rule">
                  {getMission(game.missionId).rules.map(({ id }) => {
                    const Action = RULE_ACTIONS[id];
                    return Action ? <Action key={id} roomCode={roomCode} game={game} room={room} uid={uid} requestPick={requestPick} /> : null;
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {finished && (
          <section className="bb-result">
            <h3>{game.phase === "mission-won" ? "Mission complete!" : "Mission failed"}</h3>
            {game.phase === "mission-lost" && <p className="bb-muted">{game.result?.reason}</p>}
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

      </main>
    </div>
  );
}
