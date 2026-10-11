import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../hooks/useAuthContext";
import { useCelebration } from "../../hooks/useCelebration";
import { updateRoomSettings, useRoom } from "../../hooks/useRoom";
import type { BBDeclared, BBGame, BBHandWire, BBPublicSlot, Room } from "../../types";
import GameBanner from "../../components/shared/GameBanner";
import GameEndButtons from "../../components/shared/GameEndButtons";
import ResignButton from "../../components/shared/ResignButton";
import TurnStatus from "../../components/shared/TurnStatus";
import { canRevealRed, describeDeclared, soloCutIndices, unwrapPublic } from "./engine";
import { getEquipment } from "./equipment";
import { MISSIONS, getMission } from "./missions";
import {
  type ResolveResult,
  completeOwnCut,
  declareDualCut,
  placeSetupInfo,
  resolveDualCutAsTarget,
  revealRedWires,
  soloCut,
  startNextMission,
  useBombBustersGame,
  useBombBustersHand,
} from "./useBombBustersGame";
import "./bomb-busters.css";

const name = (room: Room, uid: string) => room.players[uid]?.name ?? "Player";

/** Flat index where each stand starts, for players with two stands. */
const standOffsets = (stands: unknown[][]) => stands.map((_, i) => stands.slice(0, i).reduce((sum, stand) => sum + stand.length, 0));

/** Log entries store `@uid@` mentions; swap in player names. */
const renderLog = (room: Room, text: string) => text.replace(/@([^@]+)@/g, (_, uid: string) => name(room, uid));

function WireFace({ color, sortKey, small = false }: { color: string; sortKey: number; small?: boolean }) {
  return (
    <span className={`bb-wire bb-wire--${color}${small ? " bb-wire--small" : ""}`}>
      {color === "blue" ? sortKey : color === "red" ? "✕" : "Y"}
    </span>
  );
}

function InfoToken({ slot }: { slot: BBPublicSlot }) {
  if (!slot.info) return <span className="bb-info bb-info--empty" />;
  return (
    <span className={`bb-info bb-info--${slot.info.color}`} title="Info token">
      {slot.info.color === "yellow" ? "Y" : slot.info.value}
    </span>
  );
}

function Board({ game }: { game: BBGame }) {
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
                <span className="bb-muted">{card.used ? "Used" : card.unlocked ? "Ready" : `Unlocks at two ${card.id}s`}</span>
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
            const canPick = selectable && !slot.cut;
            return (
              <div key={index} className="bb-slot">
                {slot.cut && slot.revealed ? (
                  <WireFace color={slot.revealed.color} sortKey={slot.revealed.sortKey} />
                ) : (
                  <button
                    type="button"
                    className={`bb-wire bb-wire--back${selected.includes(index) ? " bb-wire--selected" : ""}`}
                    disabled={!canPick}
                    onClick={() => onSelect(index)}
                    aria-label={`${name(room, uid)}'s wire ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                )}
                <InfoToken slot={slot} />
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
  highlight,
  pickable,
  onPick,
}: {
  hand: BBHandWire[][];
  slots: BBPublicSlot[][];
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
            const canPick = pickable(wire, index);
            return (
              <div key={wire.id} className="bb-slot">
                <button
                  type="button"
                  className={`bb-wire bb-wire--${wire.color}${wire.cut ? " bb-wire--cut" : ""}${highlight.includes(index) ? " bb-wire--selected" : ""}`}
                  disabled={!canPick}
                  onClick={() => onPick(index)}
                  aria-label={`Your wire ${index + 1}: ${wire.color === "blue" ? wire.sortKey : wire.color}${wire.cut ? " (cut)" : ""}`}
                >
                  {wire.color === "blue" ? wire.sortKey : wire.color === "red" ? "✕" : "Y"}
                </button>
                <InfoToken slot={slot} />
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
  const [useDetector, setUseDetector] = useState(false);
  const [choice, setChoice] = useState<Extract<ResolveResult, { status: "needs-choice" }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledPending = useRef<string | null>(null);

  useCelebration(game?.phase === "mission-won");

  // Clear the in-progress selection whenever the turn or phase moves on.
  const selectionKey = `${game?.missionId}-${game?.phase}-${game?.turn}-${game?.log.length}`;
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionKey);
  if (lastSelectionKey !== selectionKey) {
    setLastSelectionKey(selectionKey);
    setTarget(null);
    setUseDetector(false);
  }

  // The steps of a Dual Cut that only this client can perform run automatically.
  const pending = game?.pendingAction ?? null;
  const pendingKey = pending ? JSON.stringify(pending) : null;
  useEffect(() => {
    if (!pending || !uid || !pendingKey || handledPending.current === pendingKey) return;
    if (pending.kind === "dual-cut" && pending.target === uid) {
      handledPending.current = pendingKey;
      resolveDualCutAsTarget(roomCode, uid)
        .then((result) => setChoice(result.status === "needs-choice" ? result : null))
        .catch((resolveError: unknown) => setError(resolveError instanceof Error ? resolveError.message : "Could not resolve the cut."));
    } else if (pending.kind === "own-cut" && pending.by === uid) {
      handledPending.current = pendingKey;
      completeOwnCut(roomCode, uid).catch((cutError: unknown) =>
        setError(cutError instanceof Error ? cutError.message : "Could not cut your wire."),
      );
    }
  }, [pending, pendingKey, roomCode, uid]);

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
  const isMyTurn = game.phase === "playing" && game.turn === uid && !game.pendingAction;
  const detectorAvailable = !game.characters[uid]?.used;
  const neededSlots = useDetector ? 2 : 1;

  const declarable: BBDeclared[] = [
    ...new Set(myWires.filter((wire) => !wire.cut && wire.color === "blue").map((wire) => wire.sortKey)),
  ].sort((a, b) => a - b);
  if (myWires.some((wire) => !wire.cut && wire.color === "yellow")) declarable.push("yellow");
  const soloOptions = declarable.filter((value) => soloCutIndices(myStands, value, game.wireTotals, game.cutCounts));

  const selectTarget = (player: string, slot: number) => {
    setTarget((current) => {
      if (!current || current.uid !== player) return { uid: player, slots: [slot] };
      if (current.slots.includes(slot)) return { uid: player, slots: current.slots.filter((s) => s !== slot) };
      return { uid: player, slots: [...current.slots, slot].slice(-neededSlots) };
    });
  };

  const status = (() => {
    switch (game.phase) {
      case "setup-info":
        return game.setupTurn === uid
          ? { mood: "mine" as const, text: "Place your info token: pick one of your blue wires." }
          : { mood: "waiting" as const, text: `Waiting for ${name(room, game.setupTurn ?? "")} to place an info token…` };
      case "playing":
        return isMyTurn
          ? { mood: "mine" as const, text: "Your turn" }
          : { mood: "waiting" as const, text: `Waiting for ${name(room, game.turn)}…` };
      case "resolving":
        if (choice) return { mood: "mine" as const, text: choice.choose === "cut" ? "Both wires match: choose which one is cut." : "Choose which wire gets the info token." };
        return { mood: "judging" as const, text: pending?.kind === "dual-cut" ? `Checking ${name(room, pending.target)}'s wire…` : "Cutting the matching wire…" };
      case "mission-won":
        return { mood: "judging" as const, text: "Bomb defused! Every wire is cut." };
      default:
        return { mood: "neutral" as const, text: `💥 Boom. ${game.result?.reason ?? ""}` };
    }
  })();

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

        <Board game={game} />

        <section className="bb-teammates">
          {teammates.map((player) => (
            <TeammateStand
              key={player}
              game={game}
              room={room}
              uid={player}
              selectable={isMyTurn}
              selected={target?.uid === player ? target.slots : []}
              onSelect={(slot) => selectTarget(player, slot)}
            />
          ))}
        </section>

        <section className="bb-me">
          <div className="bb-player__header">
            <strong>Your stand</strong>
            {uid === game.captain && <span className="bb-tag">Captain</span>}
            <span className={`bb-tag${detectorAvailable ? "" : " bb-tag--used"}`}>Double Detector</span>
          </div>
          <MyStand
            hand={myStands}
            slots={mySlots}
            highlight={choice?.options ?? []}
            pickable={(wire, index) =>
              choice
                ? choice.options.includes(index)
                : game.phase === "setup-info" && game.setupTurn === uid && !wire.cut && wire.color === "blue"
            }
            onPick={(index) => {
              if (choice) {
                setChoice(null);
                void run(async () => {
                  const result = await resolveDualCutAsTarget(roomCode, uid, index);
                  if (result.status === "needs-choice") setChoice(result);
                });
              } else {
                void run(() => placeSetupInfo(roomCode, uid, index));
              }
            }}
          />
          {game.phase === "setup-info" && game.setupTurn === uid && !myWires.some((wire) => wire.color === "blue") && (
            <div className="bb-actions">
              <button className="btn" type="button" disabled={busy} onClick={() => void run(() => placeSetupInfo(roomCode, uid, null))}>
                No blue wires: skip
              </button>
            </div>
          )}

          {isMyTurn && (
            <div className="bb-cut">
              <div className="bb-cut__row">
                <span className="bb-label">Dual Cut</span>
                <span className="bb-muted">
                  {target?.slots.length === neededSlots
                    ? `${name(room, target.uid)}'s wire ${target.slots.map((s) => `#${s + 1}`).join(" & ")}: is it…`
                    : `Pick ${neededSlots === 2 ? "2 wires" : "a wire"} on a teammate's stand.`}
                </span>
                {detectorAvailable && (
                  <label className="bb-detector">
                    <input type="checkbox" checked={useDetector} onChange={(e) => {
                      setUseDetector(e.target.checked);
                      setTarget(null);
                    }} />
                    Double Detector
                  </label>
                )}
              </div>
              <div className="bb-values">
                {declarable.map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    className={`btn btn--sm${value === "yellow" ? " bb-value--yellow" : ""}`}
                    disabled={busy || target?.slots.length !== neededSlots}
                    onClick={() =>
                      target && void run(() => declareDualCut(roomCode, uid, target.uid, target.slots, value, useDetector ? "double" : "none"))
                    }
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

