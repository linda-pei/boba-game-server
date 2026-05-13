import { useState } from "react";
import type { Room, StartupsGame, StartupsScoreBreakdown } from "../../types";
import { useAuthContext } from "../../hooks/AuthContext";
import { advanceFromRoundEnd, revealNextRemovedCard } from "./useStartupsGame";
import { COMPANIES, COMPANY_COLOR, COMPANY_INK, COMPANY_SHORT } from "./deck";
import CompanyLogo from "./CompanyLogo";
import MiniCard from "./MiniCard";
import RoundHistoryTable from "./RoundHistoryTable";

interface Props {
  roomCode: string;
  game: StartupsGame;
  room: Room;
}

export default function RoundEndScreen({ roomCode, game, room }: Props) {
  const { uid } = useAuthContext();
  const isHost = room.host === uid;
  const [advancing, setAdvancing] = useState(false);

  if (!game.scoreBreakdowns) return <p>Scoring…</p>;

  const breakdowns = game.scoreBreakdowns;
  const ranking = [...game.turnOrder].sort(
    (a, b) => (breakdowns[b]?.totalPoints ?? 0) - (breakdowns[a]?.totalPoints ?? 0)
  );

  const isFinalRound = !game.roundsEnabled || game.currentRound >= game.totalRounds;
  const revealComplete =
    game.revealedRemovedCount >= game.removedCards.length;

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await advanceFromRoundEnd(roomCode);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="su-round-end">
      <h2 className="su-round-end-title">
        {game.roundsEnabled
          ? `Round ${game.currentRound}/${game.totalRounds} — results`
          : "Final scoring"}
      </h2>

      <RevealStage game={game} roomCode={roomCode} />

      {revealComplete && (
        <>
          <RoundHistoryTable game={game} room={room} />

          <div className="su-round-end-list">
            {ranking.map((pid, idx) => {
              const name = room.players[pid]?.name ?? pid.slice(0, 6);
              const b = breakdowns[pid];
              return (
                <BreakdownCard
                  key={pid}
                  rank={idx + 1}
                  name={name}
                  breakdown={b}
                  room={room}
                />
              );
            })}
          </div>

          {isHost && (
            <div className="su-round-end-actions">
              <button
                className="btn btn--primary"
                onClick={handleAdvance}
                disabled={advancing}
              >
                {advancing
                  ? "…"
                  : isFinalRound
                    ? "Show winner"
                    : "Continue to next round"}
              </button>
            </div>
          )}
          {!isHost && (
            <p className="su-hint">Waiting for the host to continue…</p>
          )}
        </>
      )}
    </div>
  );
}

function RevealStage({ game, roomCode }: { game: StartupsGame; roomCode: string }) {
  const [revealing, setRevealing] = useState(false);
  const total = game.removedCards.length;
  const shown = game.revealedRemovedCount;
  const allShown = shown >= total;

  const handleReveal = async () => {
    setRevealing(true);
    try {
      await revealNextRemovedCard(roomCode);
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="su-reveal">
      <p className="su-reveal-title">
        {allShown
          ? "The 5 cards removed at setup:"
          : `The 5 cards removed at setup — ${shown}/${total} revealed`}
      </p>
      <div className="su-reveal-row">
        {Array.from({ length: total }).map((_, i) => {
          const isShown = i < shown;
          const card = game.removedCards[i];
          return (
            <div
              key={i}
              className={`su-reveal-card${isShown ? " is-shown" : ""}`}
            >
              {isShown ? (
                <MiniCard card={card} width={84} />
              ) : (
                <div className="su-reveal-back" />
              )}
            </div>
          );
        })}
      </div>
      {!allShown && (
        <div className="su-round-end-actions">
          <button
            className="btn btn--secondary"
            onClick={handleReveal}
            disabled={revealing}
          >
            Reveal next card
          </button>
        </div>
      )}
    </div>
  );
}


function BreakdownCard({
  rank,
  name,
  breakdown,
  room,
}: {
  rank: number;
  name: string;
  breakdown: StartupsScoreBreakdown;
  room: Room;
}) {
  const rows = COMPANIES.map((company) => {
    const entry = breakdown.perCompany[company];
    if (!entry) return null;
    return { company, entry };
  }).filter((x) => x !== null) as { company: typeof COMPANIES[number]; entry: NonNullable<StartupsScoreBreakdown["perCompany"][typeof COMPANIES[number]]> }[];

  return (
    <div className="su-breakdown">
      <div className="su-breakdown-head">
        <span className="su-breakdown-rank">#{rank}</span>
        <span className="su-breakdown-name">{name}</span>
        <span className="su-breakdown-total">{breakdown.totalPoints} pts</span>
      </div>
      <div className="su-breakdown-chips">
        <span className="su-chip-stat">
          <span className="su-chip su-chip--silver" /> {breakdown.finalSilver}
        </span>
        <span className="su-chip-stat">
          <span className="su-chip su-chip--gold" /> {breakdown.finalGold}
          <span className="su-breakdown-mult">× 3</span>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="su-breakdown-empty">No shares held.</div>
      ) : (
        <div className="su-breakdown-rows">
          {rows.map(({ company, entry }) => {
            const majorityName = entry.majorityHolder
              ? room.players[entry.majorityHolder]?.name ?? entry.majorityHolder.slice(0, 6)
              : null;
            const status = entry.isMajority
              ? `+${entry.goldReceived} gold from others`
              : entry.majorityHolder
                ? `−${entry.goldOwed} gold to ${majorityName}`
                : "tied — no payout";
            return (
              <div key={company} className="su-breakdown-row">
                <span
                  className="su-portfolio-group"
                  style={{
                    background: COMPANY_COLOR[company],
                    color: COMPANY_INK[company],
                  }}
                >
                  <span className="su-portfolio-glyph">
                    <CompanyLogo company={company} size={16} />
                  </span>
                  <span className="su-portfolio-name">{COMPANY_SHORT[company]}</span>
                  <span className="su-portfolio-count">×{entry.shares}</span>
                </span>
                <span className={`su-breakdown-result${entry.isMajority ? " is-gain" : entry.majorityHolder ? " is-loss" : ""}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
