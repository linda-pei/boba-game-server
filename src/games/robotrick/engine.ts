import type {
  RobotrickAiCard,
  RobotrickCard,
  RobotrickColumn,
  RobotrickCriterion,
  RobotrickGame,
  RobotrickPlay,
  RobotrickSeat,
  RobotrickType,
} from "../../types";
import { shuffled } from "../../utils/shuffle";

export const DROCO_SEAT: RobotrickSeat = "droco";
export const ROBOTRICK_TYPES: RobotrickType[] = ["A", "B", "C", "D"];
export const ROBOTRICK_ROUNDS = 3;
export const ROBOTRICK_PLAYERS = 3;
export const HAND_SIZE = 12;
export const PASS_COUNT = 2;

// ---- Cards ----

/** VP printed on the cards: 1–10 = rank, 11–12 = 10, 13 = 15 (same for every type). */
export function cardVp(strength: number): number {
  if (strength === 13) return 15;
  if (strength >= 11) return 10;
  return strength;
}

export function createDeck(): RobotrickCard[] {
  return ROBOTRICK_TYPES.flatMap((type) =>
    Array.from({ length: 13 }, (_, index) => {
      const strength = index + 1;
      return { id: `${type}${strength}`, type, strength, vp: cardVp(strength) };
    }),
  );
}

const typeRank = (type: RobotrickType) => ROBOTRICK_TYPES.indexOf(type);

/** By type (A→D), then strength high→low — the order Droco's columns and hands display in. */
export function sortCards(cards: RobotrickCard[]): RobotrickCard[] {
  return [...cards].sort((a, b) => typeRank(a.type) - typeRank(b.type) || b.strength - a.strength);
}

// ---- AI cards (from the physical cards) ----

const ai = (
  id: number,
  lead: [RobotrickCriterion, RobotrickCriterion],
  follow: RobotrickCriterion,
  unfollow: [RobotrickCriterion, RobotrickCriterion],
): RobotrickAiCard => ({ id, lead, follow: [follow], unfollow });

export const AI_CARDS: RobotrickAiCard[] = [
  ai(1, ["high", "short"], "low", ["long", "low"]),
  ai(2, ["short", "high"], "low", ["low", "long"]),
  ai(3, ["high", "short"], "low", ["low", "long"]),
  ai(4, ["short", "high"], "low", ["long", "low"]),
  ai(5, ["low", "long"], "low", ["short", "high"]),
  ai(6, ["long", "low"], "low", ["high", "short"]),
  ai(7, ["low", "long"], "low", ["high", "short"]),
  ai(8, ["long", "low"], "low", ["short", "high"]),
  ai(9, ["short", "high"], "high", ["long", "low"]),
  ai(10, ["low", "long"], "high", ["short", "high"]),
];

export function getAiCard(id: number): RobotrickAiCard {
  const card = AI_CARDS.find((item) => item.id === id);
  if (!card) throw new Error(`Unknown AI card ${id}`);
  return card;
}

// ---- Dealing and seating ----

export interface RoundDeal {
  trump: RobotrickCard;
  setAside: RobotrickCard[];
  hands: RobotrickCard[][];
  drocoHand: RobotrickCard[];
}

/** Flip a trump, set 3 aside unseen, deal 12 each to three humans and Droco. */
export function dealRound(deck: RobotrickCard[] = shuffled(createDeck())): RoundDeal {
  if (deck.length !== 52) throw new Error("Robotrick needs the full 52-card deck.");
  const [trump, ...rest] = deck;
  const setAside = rest.slice(0, 3);
  const dealt = rest.slice(3);
  const hands = [0, 1, 2].map((seat) => sortCards(dealt.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE)));
  const drocoHand = sortCards(dealt.slice(3 * HAND_SIZE, 4 * HAND_SIZE));
  return { trump, setAside, hands, drocoHand };
}

/**
 * Droco sits left of the owner (host) in round 1, between the two others in round 2,
 * and right of the owner in round 3. `playerOrder` is clockwise with the host first.
 */
export function seatOrderForRound(playerOrder: string[], round: number): RobotrickSeat[] {
  if (playerOrder.length !== ROBOTRICK_PLAYERS) throw new Error("Robotrick needs exactly 3 players.");
  const insertAt = ((round - 1) % ROBOTRICK_ROUNDS) + 1;
  const seats: RobotrickSeat[] = [...playerOrder];
  seats.splice(insertAt, 0, DROCO_SEAT);
  return seats;
}

/** Each human passes to the next human clockwise (Droco doesn't pass). */
export function passTarget(playerOrder: string[], uid: string): string {
  const index = playerOrder.indexOf(uid);
  if (index === -1) throw new Error("Not a player in this game.");
  return playerOrder[(index + 1) % playerOrder.length];
}

export function nextSeat(seatOrder: RobotrickSeat[], seat: RobotrickSeat): RobotrickSeat {
  return seatOrder[(seatOrder.indexOf(seat) + 1) % seatOrder.length];
}

// ---- Playing ----

export function ledType(trick: RobotrickPlay[]): RobotrickType | null {
  return trick[0]?.card.type ?? null;
}

/** Cards that may legally be played: must follow the led type when possible. */
export function legalPlays(hand: RobotrickCard[], led: RobotrickType | null): RobotrickCard[] {
  if (!led) return hand;
  const following = hand.filter((card) => card.type === led);
  return following.length > 0 ? following : hand;
}

function applyCriterion(
  candidates: RobotrickCard[],
  criterion: RobotrickCriterion,
  fullHand: RobotrickCard[],
): RobotrickCard[] {
  if (criterion === "high" || criterion === "low") {
    const strengths = candidates.map((card) => card.strength);
    const target = criterion === "high" ? Math.max(...strengths) : Math.min(...strengths);
    return candidates.filter((card) => card.strength === target);
  }
  // Long/Short compare how many of each type Droco holds (types with no cards don't count).
  const counts = new Map<RobotrickType, number>();
  fullHand.forEach((card) => counts.set(card.type, (counts.get(card.type) ?? 0) + 1));
  const candidateTypes = [...new Set(candidates.map((card) => card.type))];
  const typeCounts = candidateTypes.map((type) => counts.get(type) ?? 0);
  const target = criterion === "long" ? Math.max(...typeCounts) : Math.min(...typeCounts);
  return candidates.filter((card) => (counts.get(card.type) ?? 0) === target);
}

const CRITERION_LABEL: Record<RobotrickCriterion, string> = { high: "High", low: "Low", long: "Long", short: "Short" };
const COLUMN_LABEL: Record<RobotrickColumn, string> = { lead: "Lead", follow: "Follow", unfollow: "Unfollow" };

export interface DrocoChoice {
  card: RobotrickCard;
  column: RobotrickColumn;
  /** Human-readable trace, e.g. "Follow → Low: B3". */
  reason: string;
}

/** Apply the AI card: column by situation, primary then secondary criterion, then A>B>C>D. */
export function chooseDrocoCard(
  drocoHand: RobotrickCard[],
  aiCard: RobotrickAiCard,
  led: RobotrickType | null,
): DrocoChoice {
  if (drocoHand.length === 0) throw new Error("Droco has no cards left.");
  const canFollow = led !== null && drocoHand.some((card) => card.type === led);
  const column: RobotrickColumn = led === null ? "lead" : canFollow ? "follow" : "unfollow";
  let candidates = column === "follow" ? drocoHand.filter((card) => card.type === led) : drocoHand;

  const used: string[] = [];
  for (const criterion of aiCard[column]) {
    if (!criterion || candidates.length <= 1) break;
    candidates = applyCriterion(candidates, criterion, drocoHand);
    used.push(CRITERION_LABEL[criterion]);
  }
  let tiebreak = false;
  if (candidates.length > 1) {
    candidates = [...candidates].sort((a, b) => typeRank(a.type) - typeRank(b.type));
    tiebreak = true;
  }
  const card = candidates[0];
  const reason = `${COLUMN_LABEL[column]} → ${used.join(", then ")}${tiebreak ? ", then A>B>C>D" : ""}: ${card.id}`;
  return { card, column, reason };
}

/** Highest trump wins if any trump was played; otherwise the highest card of the led type. */
export function trickWinner(plays: RobotrickPlay[], trumpType: RobotrickType): RobotrickSeat {
  if (plays.length === 0) throw new Error("Empty trick.");
  const led = plays[0].card.type;
  const trumps = plays.filter((play) => play.card.type === trumpType);
  const contenders = trumps.length > 0 ? trumps : plays.filter((play) => play.card.type === led);
  return contenders.reduce((best, play) => (play.card.strength > best.card.strength ? play : best)).seat;
}

export interface TrickOutcome {
  hangars: Record<string, RobotrickCard[]>;
  penalties: Record<string, RobotrickCard[]>;
}

/**
 * Droco wins: every human keeps the card they played face down.
 * A human wins: they take Droco's card face up (face down if hangars are full); the rest is set aside.
 */
export function applyTrick(
  plays: RobotrickPlay[],
  winner: RobotrickSeat,
  hangars: Record<string, RobotrickCard[]>,
  penalties: Record<string, RobotrickCard[]>,
  hangarLimit: number,
): TrickOutcome {
  const nextHangars = { ...hangars };
  const nextPenalties = { ...penalties };
  if (winner === DROCO_SEAT) {
    plays.forEach(({ seat, card }) => {
      if (seat !== DROCO_SEAT) nextPenalties[seat] = [...(nextPenalties[seat] ?? []), card];
    });
  } else {
    const drocoCard = plays.find((play) => play.seat === DROCO_SEAT)?.card;
    if (drocoCard) {
      const current = nextHangars[winner] ?? [];
      if (current.length < hangarLimit) nextHangars[winner] = [...current, drocoCard];
      else nextPenalties[winner] = [...(nextPenalties[winner] ?? []), drocoCard];
    }
  }
  return { hangars: nextHangars, penalties: nextPenalties };
}

export function roundScore(hangar: RobotrickCard[] = [], penalties: RobotrickCard[] = []): number {
  const sum = (cards: RobotrickCard[]) => cards.reduce((total, card) => total + card.vp, 0);
  return sum(hangar) - sum(penalties);
}

/** Draw a random AI card id, or keep round 1's when the "fixed AI card" option is on. */
export function pickAiCardId(previous: number | null, fixed: boolean, random: () => number = Math.random): number {
  if (fixed && previous !== null) return previous;
  return AI_CARDS[Math.floor(random() * AI_CARDS.length)].id;
}

// ---- Turn progression (pure, so the whole trick flow is unit-testable) ----

/**
 * After a human plays (or a trick/round begins), auto-play Droco whenever it's Droco's turn,
 * then resolve the trick once all four seats have played.
 */
export function progressTrick(game: RobotrickGame): RobotrickGame {
  const next: RobotrickGame = { ...game, currentTrick: [...game.currentTrick], drocoHand: [...game.drocoHand] };
  const trumpType = next.trump.type;

  while (next.currentTrick.length < next.seatOrder.length && next.turn === DROCO_SEAT) {
    const choice = chooseDrocoCard(next.drocoHand, getAiCard(next.aiCardId), ledType(next.currentTrick));
    next.drocoHand = next.drocoHand.filter((card) => card.id !== choice.card.id);
    next.currentTrick.push({ seat: DROCO_SEAT, card: choice.card });
    next.drocoReason = choice.reason;
    next.turn = nextSeat(next.seatOrder, DROCO_SEAT);
  }

  if (next.currentTrick.length < next.seatOrder.length) return next;

  const winner = trickWinner(next.currentTrick, trumpType);
  const outcome = applyTrick(next.currentTrick, winner, next.hangars, next.penalties, next.options.hangars);
  return {
    ...next,
    ...outcome,
    phase: "trick-result",
    leader: winner,
    turn: winner,
    lastTrick: { plays: next.currentTrick, winner, drocoReason: next.drocoReason },
  };
}

/** Clear the finished trick and start the next one (winner leads), or end the round after trick 12. */
export function startNextTrick(game: RobotrickGame): RobotrickGame {
  if (game.trickNumber >= HAND_SIZE) {
    const roundScores = { ...game.roundScores };
    game.playerOrder.forEach((uid) => {
      roundScores[uid] = [...(roundScores[uid] ?? []), roundScore(game.hangars[uid], game.penalties[uid])];
    });
    return { ...game, phase: "round-end", currentTrick: [], drocoReason: null, roundScores };
  }
  return progressTrick({
    ...game,
    phase: "playing",
    trickNumber: game.trickNumber + 1,
    currentTrick: [],
    drocoReason: null,
    turn: game.leader,
  });
}

export function totalScore(roundScores: number[] = []): number {
  return roundScores.reduce((sum, score) => sum + score, 0);
}

export interface BuiltRound {
  game: RobotrickGame;
  hands: Record<string, RobotrickCard[]>;
}

/** Fresh state for a round: deal, seat Droco, pick the AI card, and wait for passes. */
export function buildRound(params: {
  playerOrder: string[];
  round: number;
  options: RobotrickGame["options"];
  previousAiCardId: number | null;
  roundScores: Record<string, number[]>;
  deck?: RobotrickCard[];
  random?: () => number;
}): BuiltRound {
  const { playerOrder, round, options, previousAiCardId, roundScores } = params;
  const deal = dealRound(params.deck);
  const empty = () => Object.fromEntries(playerOrder.map((uid) => [uid, [] as RobotrickCard[]]));
  const game: RobotrickGame = {
    gameType: "robotrick",
    phase: "passing",
    round,
    playerOrder,
    seatOrder: seatOrderForRound(playerOrder, round),
    options,
    aiCardId: pickAiCardId(previousAiCardId, options.fixedAiCard, params.random),
    trump: deal.trump,
    drocoHand: deal.drocoHand,
    passSubmitted: [],
    trickNumber: 1,
    leader: DROCO_SEAT,
    turn: DROCO_SEAT,
    currentTrick: [],
    drocoReason: null,
    lastTrick: null,
    hangars: empty(),
    penalties: empty(),
    handCounts: Object.fromEntries(playerOrder.map((uid) => [uid, HAND_SIZE])),
    roundScores,
    lastAction: `Round ${round}: choose ${PASS_COUNT} cards to pass.`,
  };
  const hands = Object.fromEntries(playerOrder.map((uid, index) => [uid, deal.hands[index]]));
  return { game, hands };
}
