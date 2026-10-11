import { useEffect, useState } from "react";
import { useAuthContext } from "../../hooks/useAuthContext";
import { useCelebration } from "../../hooks/useCelebration";
import { useRoom } from "../../hooks/useRoom";
import type { RobotrickCard, RobotrickColumn, RobotrickGame, RobotrickSeat, Room } from "../../types";
import GameBanner from "../../components/shared/GameBanner";
import GameEndButtons from "../../components/shared/GameEndButtons";
import ResignButton from "../../components/shared/ResignButton";
import TurnStatus from "../../components/shared/TurnStatus";
import { PlayerScoreRow, PlayerScores } from "../../components/shared/PlayerScores";
import {
  DROCO_SEAT,
  PASS_COUNT,
  ROBOTRICK_ROUNDS,
  ROBOTRICK_TYPES,
  getAiCard,
  ledType,
  legalPlays,
  passTarget,
  roundScore,
  totalScore,
} from "./engine";
import {
  advanceRobotrickTrick,
  continueRobotrick,
  effectiveHand,
  playRobotrickCard,
  submitRobotrickPass,
  useRobotrickGame,
  useRobotrickHand,
} from "./useRobotrickGame";
import "./robotrick.css";

const TRICK_RESULT_MS = 2500;
const CRITERION_LABEL = { high: "High", low: "Low", long: "Long", short: "Short" } as const;
const COLUMN_LABEL: Record<RobotrickColumn, string> = { lead: "Lead", follow: "Follow", unfollow: "Unfollow" };

function seatName(room: Room, seat: RobotrickSeat): string {
  return seat === DROCO_SEAT ? "Droco" : room.players[seat]?.name ?? "Player";
}

function RobotCard({
  card,
  selected = false,
  disabled = false,
  small = false,
  faceDown = false,
  onClick,
}: {
  card?: RobotrickCard;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
}) {
  if (faceDown || !card) return <div className={`rt-card rt-card--back${small ? " rt-card--small" : ""}`} aria-label="Face-down card" />;
  return (
    <div
      className={`rt-card rt-card--${card.type}${small ? " rt-card--small" : ""}${onClick ? " game-card" : ""}${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-label={`${card.type}${card.strength}, ${card.vp} VP`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(event) => {
        if (onClick && !disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <span className="rt-card__type">{card.type}</span>
      <span className="rt-card__strength">{card.strength}</span>
      <span className="rt-card__vp" title="Victory points">{card.vp}</span>
    </div>
  );
}

function AiCardPanel({ game, activeColumn }: { game: RobotrickGame; activeColumn: RobotrickColumn | null }) {
  const aiCard = getAiCard(game.aiCardId);
  return (
    <div className="rt-ai" aria-label={`AI card ${aiCard.id}`}>
      <div className="rt-ai__title">AI card #{aiCard.id}</div>
      <div className="rt-ai__columns">
        {(["lead", "follow", "unfollow"] as const).map((column) => (
          <div key={column} className={`rt-ai__column${activeColumn === column ? " rt-ai__column--active" : ""}`}>
            <span className="rt-ai__label">{COLUMN_LABEL[column]}</span>
            {aiCard[column].filter(Boolean).map((criterion, index) => (
              <span key={index} className="rt-ai__criterion">{index + 1}. {CRITERION_LABEL[criterion!]}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="rt-ai__tiebreak">Ties: A &gt; B &gt; C &gt; D</div>
    </div>
  );
}

function DrocoHand({ cards }: { cards: RobotrickCard[] }) {
  return (
    <div className="rt-droco-hand" aria-label="Droco's hand">
      {ROBOTRICK_TYPES.map((type) => {
        const ofType = cards.filter((card) => card.type === type);
        return (
          <div key={type} className="rt-droco-hand__column">
            <span className={`rt-droco-hand__type rt-type--${type}`}>{type}</span>
            {/* Fill top-to-bottom, 4 per column; a 5th card starts a second column */}
            <div className="rt-droco-hand__cards" style={{ gridTemplateRows: `repeat(${Math.max(1, Math.min(ofType.length, 4))}, auto)` }}>
              {ofType.map((card) => <RobotCard key={card.id} card={card} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrickArea({ game, room }: { game: RobotrickGame; room: Room }) {
  const plays = game.phase === "trick-result" && game.lastTrick ? game.lastTrick.plays : game.currentTrick;
  const winner = game.phase === "trick-result" ? game.lastTrick?.winner : null;
  return (
    <div className="rt-trick" aria-label="Current trick">
      {game.seatOrder.map((seat) => {
        const play = plays.find((item) => item.seat === seat);
        const isTurn = game.phase === "playing" && game.turn === seat;
        return (
          <div key={seat} className={`rt-trick__seat${isTurn ? " rt-trick__seat--turn" : ""}${winner === seat ? " rt-trick__seat--winner" : ""}`}>
            <span className="rt-trick__name">{seatName(room, seat)}{seat === game.leader && game.phase === "playing" ? " · leads" : ""}</span>
            {play ? <RobotCard card={play.card} /> : <div className="rt-card rt-card--empty" />}
          </div>
        );
      })}
    </div>
  );
}

function Standings({ game, room, uid }: { game: RobotrickGame; room: Room; uid: string }) {
  return (
    <PlayerScores title="Hangars">
      {game.playerOrder.map((playerUid) => {
        const hangar = game.hangars[playerUid] ?? [];
        const penalties = game.penalties[playerUid] ?? [];
        return (
          <PlayerScoreRow
            key={playerUid}
            name={room.players[playerUid]?.name ?? "Player"}
            isYou={playerUid === uid}
            isActive={game.phase === "playing" && game.turn === playerUid}
            className="rt-standing"
          >
            <span className="rt-hangar">
              {Array.from({ length: game.options.hangars }, (_, index) =>
                hangar[index] ? <RobotCard key={index} card={hangar[index]} small /> : <span key={index} className="rt-hangar__slot" />,
              )}
            </span>
            <span className="score-detail" title="Face-down cards score negative">
              {penalties.length} face down (−{penalties.reduce((sum, card) => sum + card.vp, 0)})
            </span>
            <span className="score-cumulative">{roundScore(hangar, penalties)} pts</span>
          </PlayerScoreRow>
        );
      })}
    </PlayerScores>
  );
}

export default function RobotrickGameBoard({ roomCode }: { roomCode: string }) {
  const { uid } = useAuthContext();
  const { room } = useRoom(roomCode);
  const { game, loading } = useRobotrickGame(roomCode);
  const hand = useRobotrickHand(roomCode, uid);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalTotals = game?.playerOrder.map((playerUid) => totalScore(game.roundScores[playerUid])) ?? [];
  const best = Math.max(...finalTotals);
  const iWon = Boolean(game && uid && game.phase === "finished" && totalScore(game.roundScores[uid]) === best);
  useCelebration(iWon);

  // Every client advances past the trick result after a beat; the trickNumber guard makes it idempotent.
  const resultTrick = game?.phase === "trick-result" ? game.trickNumber : null;
  useEffect(() => {
    if (resultTrick === null) return;
    const timer = window.setTimeout(() => void advanceRobotrickTrick(roomCode, resultTrick).catch(() => undefined), TRICK_RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [roomCode, resultTrick]);

  // Drop selections that no longer apply (new phase, card already played).
  const selectionKey = `${game?.phase}-${game?.round}-${game?.trickNumber}-${Boolean(uid && game?.passSubmitted.includes(uid))}`;
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionKey);
  // Set when our pass is saved, so the button stays hidden until the server state catches up.
  const [passSent, setPassSent] = useState(false);
  if (lastSelectionKey !== selectionKey) {
    setLastSelectionKey(selectionKey);
    setPassSent(false);
    setSelected([]);
  }

  if (loading || !room) return <p>Loading Robotrick…</p>;
  if (!game || !uid) return <p>Robotrick game not found.</p>;

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      // Selection is cleared by the selection-key reset once the server state arrives,
      // so buttons don't flash back to "0 selected" in between.
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const myCards = effectiveHand(hand);
  const isMyTurn = game.phase === "playing" && game.turn === uid;
  const led = ledType(game.currentTrick);
  const legalIds = new Set(legalPlays(myCards, led).map((card) => card.id));
  const hasPassed = game.passSubmitted.includes(uid) || passSent;
  const passTo = room.players[passTarget(game.playerOrder, uid)]?.name ?? "the next player";
  const drocoColumn: RobotrickColumn | null = game.drocoReason
    ? (game.drocoReason.split(" ")[0].toLowerCase() as RobotrickColumn)
    : null;

  const toggle = (cardId: string) => {
    if (game.phase === "passing") {
      setSelected((current) =>
        current.includes(cardId) ? current.filter((id) => id !== cardId) : current.length < PASS_COUNT ? [...current, cardId] : current,
      );
    } else {
      setSelected((current) => (current[0] === cardId ? [] : [cardId]));
    }
  };

  const status = (() => {
    switch (game.phase) {
      case "passing":
        return hasPassed
          ? { mood: "waiting" as const, text: `Waiting for passes (${game.passSubmitted.length}/${game.playerOrder.length})…` }
          : { mood: "mine" as const, text: `Choose ${PASS_COUNT} cards to pass to ${passTo}.` };
      case "playing":
        return isMyTurn
          ? { mood: "mine" as const, text: "Your turn" }
          : { mood: "waiting" as const, text: `Waiting for ${seatName(room, game.turn)}…` };
      case "trick-result": {
        const winner = game.lastTrick?.winner ?? DROCO_SEAT;
        return winner === DROCO_SEAT
          ? { mood: "judging" as const, text: "Droco wins the trick: everyone keeps their card face down." }
          : { mood: "judging" as const, text: `${seatName(room, winner)} wins and takes Droco's card.` };
      }
      case "round-end":
        return { mood: "neutral" as const, text: `Round ${game.round} complete.` };
      default:
        return { mood: "neutral" as const, text: "Game over." };
    }
  })();

  const subtitle =
    game.phase === "finished"
      ? "final results"
      : game.phase === "passing"
      ? `round ${game.round}/${ROBOTRICK_ROUNDS} · passing`
      : `round ${game.round}/${ROBOTRICK_ROUNDS} · trick ${game.trickNumber}/12`;

  return (
    <div className="game-screen-wrap rt-wrap">
      <GameBanner game="rt" subtitle={subtitle} actions={<ResignButton />} />
      <main className="screen rt-screen">
        <TurnStatus mood={status.mood}>{status.text}</TurnStatus>
        {error && <p className="error-message" role="alert">{error}</p>}

        {(game.phase === "passing" || game.phase === "playing" || game.phase === "trick-result") && (
          <>
            <section className="rt-table">
              <div className="rt-droco">
                <div className="rt-droco__header">
                  <h3>Droco&apos;s hand</h3>
                  <div className="rt-trump">
                    Trump <RobotCard card={game.trump} small />
                  </div>
                </div>
                <DrocoHand cards={game.drocoHand} />
              </div>
              <div className="rt-ai-wrap">
                <AiCardPanel game={game} activeColumn={drocoColumn} />
                {game.drocoReason && <p className="rt-droco-reason">Droco played: {game.drocoReason}</p>}
              </div>
            </section>

            {game.phase !== "passing" && <TrickArea game={game} room={room} />}

            <section className="rt-hand">
              <h4>Your hand ({myCards.length})</h4>
              <div className="rt-hand__cards">
                {myCards.map((card) => {
                  const canSelect = game.phase === "passing" ? !hasPassed : isMyTurn && legalIds.has(card.id);
                  return (
                    <RobotCard
                      key={card.id}
                      card={card}
                      selected={selected.includes(card.id)}
                      disabled={!canSelect}
                      onClick={() => toggle(card.id)}
                    />
                  );
                })}
              </div>
              <div className="rt-actions">
                {game.phase === "passing" && !hasPassed && (
                  <button
                    className="btn"
                    type="button"
                    disabled={busy || selected.length !== PASS_COUNT}
                    onClick={() => void run(async () => {
                      await submitRobotrickPass(roomCode, uid, selected);
                      setPassSent(true);
                    })}
                  >
                    {busy ? "Passing…" : `Pass ${selected.length}/${PASS_COUNT} to ${passTo}`}
                  </button>
                )}
                {isMyTurn && (
                  <button
                    className="btn"
                    type="button"
                    disabled={busy || selected.length !== 1}
                    onClick={() => void run(() => playRobotrickCard(roomCode, uid, selected[0]))}
                  >
                    Play card
                  </button>
                )}
                {game.phase === "trick-result" && (
                  <button className="btn btn--secondary" type="button" onClick={() => void advanceRobotrickTrick(roomCode, game.trickNumber)}>
                    Next trick
                  </button>
                )}
              </div>
            </section>

            <Standings game={game} room={room} uid={uid} />
          </>
        )}

        {game.phase === "round-end" && (
          <section className="rt-results">
            <PlayerScores title={`Round ${game.round} scores`}>
              {game.playerOrder.map((playerUid) => {
                const scores = game.roundScores[playerUid] ?? [];
                return (
                  <PlayerScoreRow key={playerUid} name={room.players[playerUid]?.name ?? "Player"} isYou={playerUid === uid}>
                    <span className="score-round">{scores[scores.length - 1] ?? 0} this round</span>
                    <span className="score-cumulative">Total: {totalScore(scores)}</span>
                  </PlayerScoreRow>
                );
              })}
            </PlayerScores>
            {room.host === uid ? (
              <div className="rt-actions">
                <button className="btn" type="button" disabled={busy} onClick={() => void run(() => continueRobotrick(roomCode, uid, room.host))}>
                  {game.round >= ROBOTRICK_ROUNDS ? "See final results" : `Deal round ${game.round + 1}`}
                </button>
              </div>
            ) : (
              <p className="rt-muted">Waiting for the host to continue.</p>
            )}
          </section>
        )}

        {game.phase === "finished" && (
          <section className="rt-results">
            <PlayerScores title="Final standings">
              {[...game.playerOrder]
                .sort((a, b) => totalScore(game.roundScores[b]) - totalScore(game.roundScores[a]))
                .map((playerUid) => {
                  const scores = game.roundScores[playerUid] ?? [];
                  return (
                    <PlayerScoreRow
                      key={playerUid}
                      name={room.players[playerUid]?.name ?? "Player"}
                      isYou={playerUid === uid}
                      isActive={totalScore(scores) === best}
                    >
                      <span className="score-detail">{scores.join(" / ")}</span>
                      <span className="score-cumulative">{totalScore(scores)} pts</span>
                    </PlayerScoreRow>
                  );
                })}
            </PlayerScores>
            <GameEndButtons isHost={room.host === uid} />
          </section>
        )}
      </main>
    </div>
  );
}
