import { useState } from "react";
import type { TakeTimeGame, TakeTimeHand, TakeTimeSegmentRule, Room } from "../../types";
import { placeCard, getCardsPlayedByPlayer } from "./useTakeTimeGame";
import { getLevelLabel, getLevelHints } from "./levels";
import ClockDisplay from "./ClockDisplay";
import CardSVG from "./CardSVG";
import { toSuit } from "./theme";
import { PlayerScores, PlayerScoreRow } from "../../components/shared/PlayerScores";
import TurnStatus from "../../components/shared/TurnStatus";

interface Props {
  roomCode: string;
  game: TakeTimeGame;
  hand: TakeTimeHand;
  uid: string;
  room: Room;
}

/** Get rules at a physical position accounting for board rotation */
function getRulesAtPos(game: TakeTimeGame, physPos: number): TakeTimeSegmentRule[] {
  const logical = ((physPos - 1 - (game.boardRotation ?? 0) + 600) % 6) + 1;
  return game.levelDef.segmentRules[logical] || [];
}

/** Check if a physical segment is blocked */
function isBlocked(game: TakeTimeGame, physPos: number): boolean {
  const rules = getRulesAtPos(game, physPos);
  if (rules.some((r) => r.type === "blocked")) return true;
  if (game.secondHandPosition !== undefined) {
    const sh = game.secondHandPosition;
    const opposite = ((sh - 1 + 3) % 6) + 1;
    if (physPos === sh || physPos === opposite) return true;
  }
  return false;
}

/** Which cards can the player select given clock rule constraints? */
function getPlayableCardIds(game: TakeTimeGame, hand: TakeTimeHand): Set<string> {
  const { clockRule } = game.levelDef;
  const all = new Set(hand.cards.map((c) => c.id));
  if (clockRule === "high-to-low") {
    const maxVal = Math.max(...hand.cards.map((c) => c.value));
    return new Set(hand.cards.filter((c) => c.value === maxVal).map((c) => c.id));
  } else if (clockRule === "low-to-high") {
    const minVal = Math.min(...hand.cards.map((c) => c.value));
    return new Set(hand.cards.filter((c) => c.value === minVal).map((c) => c.id));
  } else if (clockRule === "locked-order") {
    return hand.cards.length > 0 ? new Set([hand.cards[0].id]) : all;
  }
  return all;
}

export default function PlacementPhase({ roomCode, game, hand, uid, room }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState(false);
  const [placing, setPlacing] = useState(false);

  const isFirstCard = game.cardsPlayed === 0;
  const isMyTurn = isFirstCard || game.turnOrder[game.currentTurn] === uid;
  const currentPlayerName = isFirstCard
    ? null
    : room.players[game.turnOrder[game.currentTurn]]?.name ?? "???";

  const canPlayFaceUp = game.faceUpRemaining > 0;
  const playableCards = getPlayableCardIds(game, hand);

  // Segments that are blocked (can't click)
  const blockedSegments = new Set<number>();
  for (let s = 1; s <= 6; s++) {
    if (isBlocked(game, s)) blockedSegments.add(s);
  }

  const handleSegmentClick = async (segIndex: number) => {
    if (!selectedCard || !isMyTurn || placing) return;
    if (blockedSegments.has(segIndex)) return;
    setPlacing(true);
    try {
      await placeCard(roomCode, game, uid, selectedCard, segIndex, faceUp);
      setSelectedCard(null);
      setFaceUp(false);
    } catch (err) {
      console.error("Failed to place card:", err);
    } finally {
      setPlacing(false);
    }
  };

  const showRevealMessage = game.turnOrder.length === 2 &&
    game.cardsPlayed === 4 &&
    game.twoPlayerRevealed;

  const visibleCards = hand.cards;
  const hiddenCards = hand.hiddenCards ?? [];
  const N = visibleCards.length;

  const playerNames = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => [id, p.name])
  );

  return (
    <div>
      <TurnStatus mood={isMyTurn ? "mine" : "neutral"}>
        <span className="tt-level-label">{getLevelLabel(game.chapter, game.test)}</span>
        {" — "}
        {isMyTurn
          ? selectedCard
            ? "Click a segment to place your card"
            : "Select a card from your hand"
          : `Waiting for ${currentPlayerName}...`}
      </TurnStatus>

      {isFirstCard && isMyTurn && (
        <p className="tt-muted-text" style={{ textAlign: "center", fontSize: "0.85rem" }}>
          Any player may play the first card.
        </p>
      )}
      {getLevelHints(game.levelDef).length > 0 && (
        <div className="tt-hints tt-hints--compact">
          {getLevelHints(game.levelDef).map((h, i) => (
            <p key={i} className="tt-hint">{h}</p>
          ))}
        </div>
      )}

      <ClockDisplay
        segments={game.segments}
        segmentRules={game.levelDef.segmentRules}
        clockRotation={game.clockRotation}
        clockRule={game.levelDef.clockRule}
        chapter={game.chapter}
        test={game.test}
        specialRules={game.levelDef.specialRules}
        highlightSegment={selectedCard && isMyTurn ? -1 : null}
        interactive={!!selectedCard && isMyTurn && !placing}
        onSegmentClick={handleSegmentClick}
        playerNames={playerNames}
        uid={uid}
        blockedSegments={blockedSegments}
        boardRotation={game.boardRotation}
        secondHandPosition={game.secondHandPosition}
        hourHand={game.levelDef.hourHand}
        betweenRules={game.levelDef.betweenRules}
        maxSpread={game.levelDef.maxSpread}
      />

      <div className="tt-status-bar">
        <span className="tt-muted-text">Cards placed: {game.cardsPlayed}{game.deck === undefined ? "/12" : ""}</span>
        <span className="tt-muted-text">Reminder tokens: {game.faceUpRemaining}</span>
        {game.deck !== undefined && (
          <span className="tt-muted-text">Deck: {game.deck.length}</span>
        )}
      </div>

      {showRevealMessage && (
        <TurnStatus style={{ marginBottom: "0.5rem" }}>
          Hidden cards revealed! Check your hand.
        </TurnStatus>
      )}

      {/* Hand — fanned */}
      <h4 style={{ textAlign: "center" }}>Your Hand ({visibleCards.length} cards)</h4>
      <div className={`tt-hand${isMyTurn ? " tt-hand--active" : ""}`}>
        {visibleCards.map((card, i) => {
          const offset = i - (N - 1) / 2;
          const tilt = offset * 4;
          const dy = Math.abs(offset) * 6;
          const isSelected = selectedCard === card.id;
          const liftExtra = isSelected ? 28 : 0;
          const canPlay = playableCards.has(card.id);
          return (
            <div
              key={card.id}
              className="tt-hand-card"
              style={{
                transform: `translateY(${dy - liftExtra}px) rotate(${tilt}deg)`,
                transformOrigin: "50% 100%",
                zIndex: isSelected ? 20 : i,
                opacity: isMyTurn && !canPlay ? 0.4 : 1,
                cursor: isMyTurn && canPlay ? "pointer" : "default",
              }}
              onClick={() => {
                if (!isMyTurn || !canPlay) return;
                setSelectedCard(selectedCard === card.id ? null : card.id);
              }}
            >
              <CardSVG
                suit={toSuit(card.color)}
                value={card.value}
                faceUp
                w={90}
                h={126}
              />
            </div>
          );
        })}
      </div>
      {hiddenCards.length > 0 && (
        <div className="tt-hidden-pile">
          <div className="tt-hidden-pile-stack">
            {hiddenCards.map((card, i) => (
              <div
                key={`hidden-${i}`}
                style={{
                  position: i === 0 ? "relative" : "absolute",
                  top: 0,
                  left: i * 30,
                  transform: `rotate(${(i - 0.5) * 10}deg)`,
                  transformOrigin: "50% 100%",
                }}
              >
                <CardSVG suit={toSuit(card.color)} faceUp={false} w={78} h={109} />
              </div>
            ))}
          </div>
          <span className="tt-hidden-pile-label">Hidden ({hiddenCards.length})</span>
        </div>
      )}

      {/* Face-up toggle */}
      {isMyTurn && selectedCard && (
        <div className="tt-faceup-toggle">
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: canPlayFaceUp ? "pointer" : "not-allowed" }}>
            <input
              type="checkbox"
              checked={faceUp}
              onChange={(e) => setFaceUp(e.target.checked)}
              disabled={!canPlayFaceUp}
            />
            Play face-up
          </label>
          <span className="tt-muted-text" style={{ fontSize: "0.75rem" }}>
            ({game.faceUpRemaining} remaining)
          </span>
        </div>
      )}

      {/* Players */}
      <PlayerScores>
        {game.turnOrder.map((pid) => {
          const name = room.players[pid]?.name ?? pid;
          const isActive = isFirstCard || game.turnOrder[game.currentTurn] === pid;
          const colors = game.handColorSizes?.[pid];
          const hidden = game.hiddenColorSizes?.[pid];
          const remaining = game.handSizes
            ? game.handSizes[pid] ?? 0
            : colors
              ? colors.white + colors.black
              : Math.floor(12 / game.turnOrder.length) - (getCardsPlayedByPlayer(game)[pid] ?? 0);
          return (
            <PlayerScoreRow
              key={pid}
              name={name}
              isYou={pid === uid}
              isActive={isActive}
            >
              <span className="score-cards">
                {remaining} card{remaining !== 1 ? "s" : ""}
                {colors && (
                  <span className="tt-hand-breakdown">
                    {" "}· <span className="tt-solar-count">☀</span> {colors.white}
                    {" "}<span className="tt-lunar-count">🌙</span> {colors.black}
                  </span>
                )}
                {hidden && (hidden.white + hidden.black) > 0 && (
                  <span className="tt-hand-breakdown" style={{ marginLeft: "0.5rem" }}>
                    Hidden: <span className="tt-solar-count">☀</span> {hidden.white}
                    {" "}<span className="tt-lunar-count">🌙</span> {hidden.black}
                  </span>
                )}
              </span>
            </PlayerScoreRow>
          );
        })}
      </PlayerScores>
    </div>
  );
}
