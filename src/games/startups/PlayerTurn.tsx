import { useEffect, useState } from "react";
import type {
  Room,
  StartupsCompany,
  StartupsGame,
  StartupsHand,
} from "../../types";
import TurnStatus from "../../components/shared/TurnStatus";
import MarketRow from "./MarketRow";
import PortfolioPanel from "./PortfolioPanel";
import OpponentPanel from "./OpponentPanel";
import HandDisplay from "./HandDisplay";
import RoundScorePill from "./RoundScorePill";
import {
  amChipsHeldBy,
  deckDrawCost,
  drawFromDeck,
  placeToMarket,
  placeToPortfolio,
  takeFromMarket,
} from "./useStartupsGame";

interface Props {
  roomCode: string;
  game: StartupsGame;
  hand: StartupsHand | null;
  uid: string;
  room: Room;
}

export default function PlayerTurn({ roomCode, game, hand, uid, room }: Props) {
  const isMyTurn = game.turnOrder[game.currentTurn] === uid;
  const currentUid = game.turnOrder[game.currentTurn];
  const currentName = room.players[currentUid]?.name ?? "?";
  const myName = room.players[uid]?.name ?? "Player";
  const opponentUids = game.turnOrder.filter((id) => id !== uid);

  const myAMs = new Set<StartupsCompany>(amChipsHeldBy(game.antiMonopoly, uid));
  const drawCost = deckDrawCost(game.market, game.antiMonopoly, uid);
  const canAffordDeck = (game.silver[uid] ?? 0) >= drawCost && game.deck.length > 0;

  const roundScoreFor = (pid: string): number | null => {
    if (!game.roundsEnabled) return null;
    const c = game.roundChips[pid];
    if (!c) return 0;
    return c.plus2 * 2 + c.plus1 - c.minus1;
  };
  const myRoundScore = roundScoreFor(uid);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset transient state on turn change / phase change.
  useEffect(() => {
    setSelectedCardId(null);
    setErrorMsg(null);
  }, [game.currentTurn, game.actionPhase]);

  const handCards = hand?.cards ?? [];

  const handleDeck = async () => {
    if (!isMyTurn || acting) return;
    setActing(true);
    setErrorMsg(null);
    try {
      await drawFromDeck(roomCode, uid, myName);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handleStall = async (stallId: string) => {
    if (!isMyTurn || acting) return;
    setActing(true);
    setErrorMsg(null);
    try {
      await takeFromMarket(roomCode, uid, myName, stallId);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handlePlacePortfolio = async () => {
    if (!isMyTurn || acting || !selectedCardId) return;
    setActing(true);
    setErrorMsg(null);
    try {
      await placeToPortfolio(roomCode, uid, myName, selectedCardId);
      setSelectedCardId(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handlePlaceMarket = async () => {
    if (!isMyTurn || acting || !selectedCardId) return;
    setActing(true);
    setErrorMsg(null);
    try {
      await placeToMarket(roomCode, uid, myName, selectedCardId);
      setSelectedCardId(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const selectedCard = handCards.find((c) => c.id === selectedCardId) ?? null;
  const sameCompanyAsTaken =
    !!selectedCard &&
    game.tookFromMarketCompany !== null &&
    selectedCard.company === game.tookFromMarketCompany;

  const inTakePhase = isMyTurn && game.actionPhase === "take";
  const inPlacePhase = isMyTurn && game.actionPhase === "place";

  return (
    <div className="su-play">
      <TurnStatus mood={isMyTurn ? "mine" : "waiting"}>
        {isMyTurn
          ? game.actionPhase === "take"
            ? "Your turn — take a card"
            : "Your turn — place a card"
          : `Waiting for ${currentName}…`}
      </TurnStatus>

      <section className="su-section">
        <h4 className="su-section-title">Market</h4>
        <MarketRow
          market={game.market}
          deckSize={game.deck.length}
          blockedCompanies={myAMs}
          onStallClick={inTakePhase ? handleStall : undefined}
          onDeckClick={inTakePhase ? handleDeck : undefined}
          deckCost={inTakePhase ? drawCost : undefined}
          deckEnabled={inTakePhase && canAffordDeck}
        />
        {inTakePhase && !canAffordDeck && game.deck.length > 0 && (
          <div className="su-hint">
            Not enough silver to draw ({drawCost} needed). Take from market instead.
          </div>
        )}
      </section>

      <section className="su-section">
        <h4 className="su-section-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s-2)" }}>
            Your portfolio
            {myRoundScore !== null && <RoundScorePill score={myRoundScore} />}
          </span>
          <span className="su-section-meta">
            <span className="su-chip su-chip--silver" /> {game.silver[uid] ?? 0}
            {(game.gold[uid] ?? 0) > 0 && (
              <>
                {" "}
                <span className="su-chip su-chip--gold" /> {game.gold[uid] ?? 0}
              </>
            )}
          </span>
        </h4>
        <PortfolioPanel cards={game.portfolios[uid] ?? []} amCompanies={myAMs} />
      </section>

      <section className="su-section">
        <h4 className="su-section-title">Your hand</h4>
        <HandDisplay
          cards={handCards}
          selectedId={selectedCardId}
          onSelect={inPlacePhase ? (id) => setSelectedCardId(id === selectedCardId ? null : id) : undefined}
        />
        {inPlacePhase && (
          <div className="su-place-actions">
            <button
              className="btn btn--primary"
              onClick={handlePlacePortfolio}
              disabled={!selectedCardId || acting}
            >
              Place in portfolio
            </button>
            <button
              className="btn btn--secondary"
              onClick={handlePlaceMarket}
              disabled={!selectedCardId || acting || sameCompanyAsTaken}
              title={sameCompanyAsTaken ? "Can't return the company you took from the market" : undefined}
            >
              Place on market
            </button>
          </div>
        )}
        {inPlacePhase && !selectedCardId && (
          <div className="su-hint">Pick a card from your hand to place it.</div>
        )}
        {inPlacePhase && sameCompanyAsTaken && (
          <div className="su-hint">
            That card matches the company you took from the market — pick another or place in portfolio.
          </div>
        )}
        {errorMsg && <div className="su-error">{errorMsg}</div>}
      </section>

      {game.lastAction && (
        <p className="su-last-action">Last action: {game.lastAction}</p>
      )}

      {opponentUids.length > 0 && (
        <section className="su-section">
          <h4 className="su-section-title">Opponents</h4>
          <div className="su-opponents">
            {opponentUids.map((pid) => {
              const oppAMs = new Set<StartupsCompany>(
                amChipsHeldBy(game.antiMonopoly, pid)
              );
              return (
                <OpponentPanel
                  key={pid}
                  name={room.players[pid]?.name ?? pid}
                  portfolio={game.portfolios[pid] ?? []}
                  silver={game.silver[pid] ?? 0}
                  gold={game.gold[pid] ?? 0}
                  handSize={game.handSizes[pid] ?? 0}
                  amCompanies={oppAMs}
                  isCurrent={pid === currentUid}
                  roundScore={roundScoreFor(pid)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
