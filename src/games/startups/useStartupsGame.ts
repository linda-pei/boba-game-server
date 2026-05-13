import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import type {
  Room,
  StartupsCard,
  StartupsCompany,
  StartupsGame,
  StartupsHand,
  StartupsMarketStall,
  StartupsScoreBreakdown,
} from "../../types";
import {
  COMPANIES,
  REMOVED_AT_SETUP,
  STARTING_HAND,
  STARTING_SILVER,
  buildDeck,
  shuffle,
} from "./deck";

// ---- Hooks ----

export function useStartupsGame(roomCode: string | undefined) {
  const [game, setGame] = useState<StartupsGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snap) => {
      setGame(snap.exists() ? (snap.data() as StartupsGame) : null);
      setLoading(false);
    });
    return unsub;
  }, [roomCode]);

  return { game, loading };
}

export function useStartupsHand(roomCode: string | undefined, uid: string | null) {
  const [hand, setHand] = useState<StartupsHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;
    const unsub = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snap) => {
        if (snap.exists()) setHand(snap.data() as StartupsHand);
      }
    );
    return unsub;
  }, [roomCode, uid]);

  return hand;
}

// ---- Game start ----

export async function startStartupsGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const playerUids = Object.keys(room.players);
  const playerCount = playerUids.length;
  if (playerCount < 3 || playerCount > 6) {
    throw new Error(`Startups requires 3–6 players (got ${playerCount}).`);
  }

  const turnOrder = shuffle(playerUids);
  const roundsEnabled = room.settings.roundsEnabled === true;
  const totalRounds = roundsEnabled ? 4 : 1;

  const game = buildFreshRound({
    turnOrder,
    roundsEnabled,
    totalRounds,
    currentRound: 1,
    roundChips: emptyRoundChips(turnOrder),
    roundHistory: [],
  });

  const batch = writeBatch(db);
  batch.set(doc(db, "games", roomCode), game.gameData);
  for (const uid of turnOrder) {
    batch.set(doc(db, "games", roomCode, "hands", uid), game.hands[uid]);
  }
  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

// ---- Per-round setup (used at game-start and at start of each round in rounds mode) ----

interface FreshRoundInput {
  turnOrder: string[];
  roundsEnabled: boolean;
  totalRounds: number;
  currentRound: number;
  roundChips: Record<string, { plus2: number; plus1: number; minus1: number }>;
  roundHistory: StartupsGame["roundHistory"];
  /** When set, this player goes first (used in rounds 2+ for last-place player). */
  firstPlayer?: string;
}

interface FreshRoundOutput {
  gameData: StartupsGame;
  hands: Record<string, StartupsHand>;
}

function buildFreshRound(input: FreshRoundInput): FreshRoundOutput {
  const { turnOrder, roundsEnabled, totalRounds, currentRound, roundChips, roundHistory, firstPlayer } = input;

  const deck = shuffle(buildDeck());

  // Remove 5 random cards (already-shuffled deck → take from the top).
  const removedCards = deck.splice(0, REMOVED_AT_SETUP);

  // Deal STARTING_HAND cards to each player.
  const hands: Record<string, StartupsHand> = {};
  for (const uid of turnOrder) {
    hands[uid] = { cards: deck.splice(0, STARTING_HAND) };
  }

  // Setup public state.
  const portfolios: Record<string, StartupsCard[]> = {};
  const silver: Record<string, number> = {};
  const gold: Record<string, number> = {};
  const handSizes: Record<string, number> = {};
  for (const uid of turnOrder) {
    portfolios[uid] = [];
    silver[uid] = STARTING_SILVER;
    gold[uid] = 0;
    handSizes[uid] = STARTING_HAND;
  }

  const antiMonopoly = emptyAntiMonopoly();

  // Determine starting turn index.
  const startIndex = firstPlayer
    ? Math.max(0, turnOrder.indexOf(firstPlayer))
    : 0;

  const gameData: StartupsGame = {
    gameType: "startups",
    status: "playing",
    roundsEnabled,
    currentRound,
    totalRounds,
    turnOrder,
    currentTurn: startIndex,
    actionPhase: "take",
    tookFromMarketCompany: null,
    market: [],
    deck,
    removedCards,
    revealedRemovedCount: 0,
    portfolios,
    silver,
    gold,
    handSizes,
    antiMonopoly,
    roundChips,
    roundHistory,
    scoreBreakdowns: null,
    roundEndReady: {},
    winner: null,
    lastAction: null,
  };

  return { gameData, hands };
}

function emptyRoundChips(uids: string[]) {
  const out: Record<string, { plus2: number; plus1: number; minus1: number }> = {};
  for (const uid of uids) out[uid] = { plus2: 0, plus1: 0, minus1: 0 };
  return out;
}

function emptyAntiMonopoly(): Record<StartupsCompany, string | null> {
  const out: Record<StartupsCompany, string | null> = {} as Record<
    StartupsCompany,
    string | null
  >;
  for (const c of COMPANIES) out[c] = null;
  return out;
}

// ---- Helpers (pure) ----

/** Companies for which `uid` currently holds the anti-monopoly chip. */
export function amChipsHeldBy(
  antiMonopoly: Record<StartupsCompany, string | null>,
  uid: string
): StartupsCompany[] {
  return COMPANIES.filter((c) => antiMonopoly[c] === uid);
}

/** Silver cost for `uid` to draw from the deck given the current market. */
export function deckDrawCost(
  market: StartupsMarketStall[],
  antiMonopoly: Record<StartupsCompany, string | null>,
  uid: string
): number {
  let cost = 0;
  for (const stall of market) {
    if (antiMonopoly[stall.card.company] !== uid) cost++;
  }
  return cost;
}

/** Recompute AM holder for `company` given the new portfolios after placing `placerUid`'s card. */
export function recomputeAntiMonopolyForCompany(
  company: StartupsCompany,
  portfolios: Record<string, StartupsCard[]>,
  currentHolder: string | null,
  placerUid: string
): string | null {
  // Count shares per player for this company.
  const counts: Record<string, number> = {};
  for (const [uid, cards] of Object.entries(portfolios)) {
    counts[uid] = cards.filter((c) => c.company === company).length;
  }

  // No shares of this company in play yet → no holder.
  if (Object.values(counts).every((n) => n === 0)) return null;

  // Find the strict max.
  let max = -1;
  let maxHolders: string[] = [];
  for (const [uid, n] of Object.entries(counts)) {
    if (n === 0) continue;
    if (n > max) {
      max = n;
      maxHolders = [uid];
    } else if (n === max) {
      maxHolders.push(uid);
    }
  }

  // Unique leader → they hold it.
  if (maxHolders.length === 1) return maxHolders[0];

  // Tied at the top.
  if (currentHolder && maxHolders.includes(currentHolder)) {
    // Current holder is among the tied → they keep it (rule: prior holder keeps on tie).
    return currentHolder;
  }
  // No prior holder among the tied — happens on the very first share placed for this company,
  // when the placing player creates a tie with someone who already had shares. The placer is the
  // new "first to reach this max" so they become the holder.
  if (maxHolders.includes(placerUid)) return placerUid;
  // Fallback: take any of them (shouldn't really hit this path).
  return maxHolders[0];
}

/** Compute end-of-round score breakdowns. Hands have already been folded into portfolios. */
export function computeScoreBreakdowns(
  portfolios: Record<string, StartupsCard[]>,
  silver: Record<string, number>
): Record<string, StartupsScoreBreakdown> {
  // Per-company majority holder (or null if tied at the top).
  const majorityByCompany: Record<StartupsCompany, string | null> = {} as Record<
    StartupsCompany,
    string | null
  >;
  const sharesByCompanyByPlayer: Record<
    StartupsCompany,
    Record<string, number>
  > = {} as Record<StartupsCompany, Record<string, number>>;

  for (const company of COMPANIES) {
    const counts: Record<string, number> = {};
    for (const [uid, cards] of Object.entries(portfolios)) {
      counts[uid] = cards.filter((c) => c.company === company).length;
    }
    sharesByCompanyByPlayer[company] = counts;

    let max = 0;
    let leaders: string[] = [];
    for (const [uid, n] of Object.entries(counts)) {
      if (n === 0) continue;
      if (n > max) {
        max = n;
        leaders = [uid];
      } else if (n === max) {
        leaders.push(uid);
      }
    }
    majorityByCompany[company] =
      leaders.length === 1 && max > 0 ? leaders[0] : null;
  }

  // Build breakdowns.
  const breakdowns: Record<string, StartupsScoreBreakdown> = {};
  for (const uid of Object.keys(portfolios)) {
    const startingSilver = silver[uid] ?? 0;
    const perCompany: StartupsScoreBreakdown["perCompany"] = {};

    let goldReceived = 0;
    let goldOwed = 0;

    for (const company of COMPANIES) {
      const shares = sharesByCompanyByPlayer[company][uid] ?? 0;
      if (shares === 0) continue;

      const majority = majorityByCompany[company];
      const isMajority = majority === uid;

      let received = 0;
      let owed = 0;

      if (isMajority) {
        // Sum of every other shareholder's share count.
        for (const [otherUid, otherShares] of Object.entries(
          sharesByCompanyByPlayer[company]
        )) {
          if (otherUid === uid) continue;
          received += otherShares;
        }
        goldReceived += received;
      } else if (majority) {
        owed = shares;
        goldOwed += owed;
      }

      perCompany[company] = {
        shares,
        isMajority,
        majorityHolder: majority,
        goldReceived: received,
        goldOwed: owed,
      };
    }

    // Each minority shareholder hands over one chip per share (silver → flipped to
    // gold as it changes hands). So:
    //   - minority loses 1 silver per share they own in a non-majority company
    //   - majority gains 1 gold per share each minority owns of their company
    // The two sides are independent (you don't pay debts with received gold).
    // If silver goes negative, the difference is the "minus point markers" from the rules.
    const finalSilver = startingSilver - goldOwed;
    const finalGold = goldReceived;
    const totalPoints = finalSilver + finalGold * 3;

    breakdowns[uid] = {
      startingSilver,
      perCompany,
      finalSilver,
      finalGold,
      totalPoints,
    };
  }

  return breakdowns;
}

// ---- Turn actions ----

/** Take a card from the draw pile. Pays 1 silver chip per market card (except your AM-protected ones). */
export async function drawFromDeck(roomCode: string, uid: string, name: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", roomCode);
    const handRef = doc(db, "games", roomCode, "hands", uid);
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Missing doc");
    const game = gameSnap.data() as StartupsGame;
    const hand = handSnap.data() as StartupsHand;
    assertMyTakeTurn(game, uid);

    if (game.deck.length === 0) throw new Error("Deck is empty");

    const cost = deckDrawCost(game.market, game.antiMonopoly, uid);
    if ((game.silver[uid] ?? 0) < cost) {
      throw new Error("Not enough silver to draw");
    }

    // Pay 1 silver per non-AM-protected market stall.
    const newSilver = { ...game.silver };
    newSilver[uid] -= cost;
    const newMarket: StartupsMarketStall[] = game.market.map((stall) => {
      if (game.antiMonopoly[stall.card.company] === uid) return stall;
      return { ...stall, chips: stall.chips + 1 };
    });

    // Draw the top card.
    const newDeck = [...game.deck];
    const drawn = newDeck.shift()!;

    const newHandCards = [...hand.cards, drawn];
    const newHandSizes = { ...game.handSizes, [uid]: newHandCards.length };

    tx.update(gameRef, {
      market: newMarket,
      deck: newDeck,
      silver: newSilver,
      handSizes: newHandSizes,
      actionPhase: "place",
      tookFromMarketCompany: null,
      lastAction: `${name} drew from the deck${cost > 0 ? ` (paid ${cost})` : ""}`,
    });
    tx.update(handRef, { cards: newHandCards });
  });
}

/** Take a market stall (the card + any chips on it). Blocked for AM-held companies. */
export async function takeFromMarket(
  roomCode: string,
  uid: string,
  name: string,
  stallId: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", roomCode);
    const handRef = doc(db, "games", roomCode, "hands", uid);
    const gameSnap = await tx.get(gameRef);
    const handSnap = await tx.get(handRef);
    if (!gameSnap.exists() || !handSnap.exists()) throw new Error("Missing doc");
    const game = gameSnap.data() as StartupsGame;
    const hand = handSnap.data() as StartupsHand;
    assertMyTakeTurn(game, uid);

    const stall = game.market.find((s) => s.id === stallId);
    if (!stall) throw new Error("Stall not found");
    if (game.antiMonopoly[stall.card.company] === uid) {
      throw new Error("You hold the anti-monopoly chip for this company");
    }

    const newMarket = game.market.filter((s) => s.id !== stallId);
    const newSilver = { ...game.silver };
    newSilver[uid] = (newSilver[uid] ?? 0) + stall.chips;

    const newHandCards = [...hand.cards, stall.card];
    const newHandSizes = { ...game.handSizes, [uid]: newHandCards.length };

    tx.update(gameRef, {
      market: newMarket,
      silver: newSilver,
      handSizes: newHandSizes,
      actionPhase: "place",
      tookFromMarketCompany: stall.card.company,
      lastAction: `${name} took ${stall.card.company} from market${stall.chips > 0 ? ` (+${stall.chips} silver)` : ""}`,
    });
    tx.update(handRef, { cards: newHandCards });
  });
}

/** Place a card from hand into your portfolio. AM chips recompute for that company. */
export async function placeToPortfolio(
  roomCode: string,
  uid: string,
  name: string,
  cardId: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", roomCode);
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("Missing game doc");
    const game = gameSnap.data() as StartupsGame;
    assertMyPlaceTurn(game, uid);

    // Read every player's hand up-front (Firestore tx requires all reads before
    // any writes). We need them if this place ends the round.
    const handRefs = game.turnOrder.map((u) =>
      doc(db, "games", roomCode, "hands", u)
    );
    const handSnaps = await Promise.all(handRefs.map((r) => tx.get(r)));
    const myHandIdx = game.turnOrder.indexOf(uid);
    const myHandSnap = handSnaps[myHandIdx];
    if (!myHandSnap.exists()) throw new Error("Missing hand doc");
    const myHand = myHandSnap.data() as StartupsHand;

    const card = myHand.cards.find((c) => c.id === cardId);
    if (!card) throw new Error("Card not in hand");

    const newHandCards = myHand.cards.filter((c) => c.id !== cardId);
    const newPortfolios = {
      ...game.portfolios,
      [uid]: [...game.portfolios[uid], card],
    };
    const newHandSizes = { ...game.handSizes, [uid]: newHandCards.length };
    const newAntiMonopoly = {
      ...game.antiMonopoly,
      [card.company]: recomputeAntiMonopolyForCompany(
        card.company,
        newPortfolios,
        game.antiMonopoly[card.company],
        uid
      ),
    };

    const after = advanceTurnFields(game);
    const endingRound = after.status === "round-end";

    if (endingRound) {
      // Fold all hands (incl. mine post-place) into portfolios + compute scoring atomically.
      const finalPortfolios: Record<string, StartupsCard[]> = { ...newPortfolios };
      const finalHandSizes: Record<string, number> = { ...newHandSizes };
      handSnaps.forEach((snap, i) => {
        if (!snap.exists()) return;
        const playerUid = game.turnOrder[i];
        const h = snap.data() as StartupsHand;
        const remaining = playerUid === uid ? newHandCards : h.cards;
        finalPortfolios[playerUid] = [
          ...(finalPortfolios[playerUid] ?? []),
          ...remaining,
        ];
        finalHandSizes[playerUid] = 0;
      });

      const breakdowns = computeScoreBreakdowns(finalPortfolios, game.silver);
      const finalSilver: Record<string, number> = {};
      const finalGold: Record<string, number> = {};
      for (const playerUid of game.turnOrder) {
        finalSilver[playerUid] = breakdowns[playerUid].finalSilver;
        finalGold[playerUid] = breakdowns[playerUid].finalGold;
      }

      tx.update(gameRef, {
        portfolios: finalPortfolios,
        handSizes: finalHandSizes,
        antiMonopoly: newAntiMonopoly,
        silver: finalSilver,
        gold: finalGold,
        scoreBreakdowns: breakdowns,
        ...after,
        lastAction: `${name} placed ${card.company} ${card.number} in portfolio — round end`,
      });
      // Empty every player's hand.
      handRefs.forEach((r) => tx.update(r, { cards: [] }));
    } else {
      tx.update(gameRef, {
        portfolios: newPortfolios,
        handSizes: newHandSizes,
        antiMonopoly: newAntiMonopoly,
        ...after,
        lastAction: `${name} placed ${card.company} ${card.number} in portfolio`,
      });
      tx.update(handRefs[myHandIdx], { cards: newHandCards });
    }
  });
}

/** Place a card from hand into the market (new face-up stall, 0 chips). Blocked if same company as just taken. */
export async function placeToMarket(
  roomCode: string,
  uid: string,
  name: string,
  cardId: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", roomCode);
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("Missing game doc");
    const game = gameSnap.data() as StartupsGame;
    assertMyPlaceTurn(game, uid);

    const handRefs = game.turnOrder.map((u) =>
      doc(db, "games", roomCode, "hands", u)
    );
    const handSnaps = await Promise.all(handRefs.map((r) => tx.get(r)));
    const myHandIdx = game.turnOrder.indexOf(uid);
    const myHandSnap = handSnaps[myHandIdx];
    if (!myHandSnap.exists()) throw new Error("Missing hand doc");
    const myHand = myHandSnap.data() as StartupsHand;

    const card = myHand.cards.find((c) => c.id === cardId);
    if (!card) throw new Error("Card not in hand");
    if (
      game.tookFromMarketCompany &&
      card.company === game.tookFromMarketCompany
    ) {
      throw new Error("Can't return the same company you took from market");
    }

    const newHandCards = myHand.cards.filter((c) => c.id !== cardId);
    const newStall: StartupsMarketStall = {
      id: `stall-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      card,
      chips: 0,
    };
    const newMarket = [...game.market, newStall];
    const newHandSizes = { ...game.handSizes, [uid]: newHandCards.length };

    const after = advanceTurnFields(game);
    const endingRound = after.status === "round-end";

    if (endingRound) {
      const finalPortfolios: Record<string, StartupsCard[]> = { ...game.portfolios };
      const finalHandSizes: Record<string, number> = { ...newHandSizes };
      handSnaps.forEach((snap, i) => {
        if (!snap.exists()) return;
        const playerUid = game.turnOrder[i];
        const h = snap.data() as StartupsHand;
        const remaining = playerUid === uid ? newHandCards : h.cards;
        finalPortfolios[playerUid] = [
          ...(finalPortfolios[playerUid] ?? []),
          ...remaining,
        ];
        finalHandSizes[playerUid] = 0;
      });

      const breakdowns = computeScoreBreakdowns(finalPortfolios, game.silver);
      const finalSilver: Record<string, number> = {};
      const finalGold: Record<string, number> = {};
      for (const playerUid of game.turnOrder) {
        finalSilver[playerUid] = breakdowns[playerUid].finalSilver;
        finalGold[playerUid] = breakdowns[playerUid].finalGold;
      }

      tx.update(gameRef, {
        market: newMarket,
        portfolios: finalPortfolios,
        handSizes: finalHandSizes,
        silver: finalSilver,
        gold: finalGold,
        scoreBreakdowns: breakdowns,
        ...after,
        lastAction: `${name} put ${card.company} ${card.number} on the market — round end`,
      });
      handRefs.forEach((r) => tx.update(r, { cards: [] }));
    } else {
      tx.update(gameRef, {
        market: newMarket,
        handSizes: newHandSizes,
        ...after,
        lastAction: `${name} put ${card.company} ${card.number} on the market`,
      });
      tx.update(handRefs[myHandIdx], { cards: newHandCards });
    }
  });
}

// ---- Internal helpers ----

function assertMyTakeTurn(game: StartupsGame, uid: string) {
  if (game.status !== "playing") throw new Error("Game not in play");
  if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn");
  if (game.actionPhase !== "take") throw new Error("Not the take phase");
}

function assertMyPlaceTurn(game: StartupsGame, uid: string) {
  if (game.status !== "playing") throw new Error("Game not in play");
  if (game.turnOrder[game.currentTurn] !== uid) throw new Error("Not your turn");
  if (game.actionPhase !== "place") throw new Error("Not the place phase");
}

/** Compute the fields to merge after a place action. If the deck is empty, the round ends. */
function advanceTurnFields(game: StartupsGame): {
  status: StartupsGame["status"];
  currentTurn: number;
  actionPhase: "take" | "place";
  tookFromMarketCompany: null;
} {
  if (game.deck.length === 0) {
    return {
      status: "round-end",
      currentTurn: game.currentTurn,
      actionPhase: "take",
      tookFromMarketCompany: null,
    };
  }
  return {
    status: "playing",
    currentTurn: (game.currentTurn + 1) % game.turnOrder.length,
    actionPhase: "take",
    tookFromMarketCompany: null,
  };
}

/** Any player can flip the next removed-card face-up during the round-end reveal phase. */
export async function revealNextRemovedCard(roomCode: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", roomCode);
    const snap = await tx.get(gameRef);
    if (!snap.exists()) return;
    const game = snap.data() as StartupsGame;
    if (game.status !== "round-end") return;
    if (game.revealedRemovedCount >= game.removedCards.length) return;
    tx.update(gameRef, {
      revealedRemovedCount: game.revealedRemovedCount + 1,
    });
  });
}

// ---- Round / game advance ----

/**
 * Host action shown on the round-end screen.
 *  - If rounds mode and another round remains: award round chips, reset state, start next round
 *    with the last-place player going first.
 *  - Otherwise: finalise the game and pick the winner.
 */
export async function advanceFromRoundEnd(roomCode: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;
  const game = snap.data() as StartupsGame;
  if (game.status !== "round-end" || !game.scoreBreakdowns) return;

  const ranking = rankByScore(game.turnOrder, game.scoreBreakdowns);
  const awarded = roundChipAward(ranking, game.turnOrder);

  // Update cumulative round chips.
  const newRoundChips = { ...game.roundChips };
  for (const uid of game.turnOrder) {
    const cur = newRoundChips[uid] ?? { plus2: 0, plus1: 0, minus1: 0 };
    newRoundChips[uid] = {
      plus2: cur.plus2 + (awarded[uid]?.plus2 ?? 0),
      plus1: cur.plus1 + (awarded[uid]?.plus1 ?? 0),
      minus1: cur.minus1 + (awarded[uid]?.minus1 ?? 0),
    };
  }

  // Record round history.
  const scoresThisRound: Record<string, number> = {};
  for (const uid of game.turnOrder) {
    scoresThisRound[uid] = game.scoreBreakdowns[uid].totalPoints;
  }
  const newRoundHistory = [
    ...game.roundHistory,
    { ranking, awarded, scores: scoresThisRound },
  ];

  if (game.roundsEnabled && game.currentRound < game.totalRounds) {
    // Reset to a fresh round, last-place starts.
    const lastPlace = ranking[ranking.length - 1];
    const fresh = buildFreshRound({
      turnOrder: game.turnOrder,
      roundsEnabled: true,
      totalRounds: game.totalRounds,
      currentRound: game.currentRound + 1,
      roundChips: newRoundChips,
      roundHistory: newRoundHistory,
      firstPlayer: lastPlace,
    });

    const batch = writeBatch(db);
    batch.set(gameRef, fresh.gameData);
    for (const uid of game.turnOrder) {
      batch.set(doc(db, "games", roomCode, "hands", uid), fresh.hands[uid]);
    }
    await batch.commit();
    return;
  }

  // Game over.
  const winner = pickFinalWinner(game, newRoundChips, newRoundHistory);
  await runTransaction(db, async (tx) => {
    tx.update(gameRef, {
      status: "finished",
      roundChips: newRoundChips,
      roundHistory: newRoundHistory,
      winner,
    });
  });
}

/** Rank players by their score breakdowns (highest totalPoints first). Stable for ties. */
function rankByScore(
  uids: string[],
  breakdowns: Record<string, StartupsScoreBreakdown>
): string[] {
  return [...uids].sort(
    (a, b) =>
      (breakdowns[b]?.totalPoints ?? 0) - (breakdowns[a]?.totalPoints ?? 0)
  );
}

/** +2 / +1 / -1 chip awards based on this round's ranking. Ties at top/bottom — only the strict first/second/last get the awards. */
function roundChipAward(
  ranking: string[],
  allUids: string[]
): Record<string, { plus2: number; plus1: number; minus1: number }> {
  const out: Record<string, { plus2: number; plus1: number; minus1: number }> = {};
  for (const uid of allUids) out[uid] = { plus2: 0, plus1: 0, minus1: 0 };
  if (ranking.length > 0) out[ranking[0]].plus2 = 1;
  if (ranking.length > 1) out[ranking[1]].plus1 = 1;
  if (ranking.length > 2) out[ranking[ranking.length - 1]].minus1 = 1;
  return out;
}

/** Pick the final winner. Single-game: highest totalPoints. Rounds: highest cumulative round-chip score with tiebreakers. */
function pickFinalWinner(
  game: StartupsGame,
  roundChips: StartupsGame["roundChips"],
  roundHistory: StartupsGame["roundHistory"]
): string | null {
  if (!game.roundsEnabled) {
    if (!game.scoreBreakdowns) return null;
    const ranked = rankByScore(game.turnOrder, game.scoreBreakdowns);
    return ranked[0] ?? null;
  }

  // Rounds mode tiebreakers: most round-chip points, then most +2s, then most +1s,
  // then last round's winner.
  const score = (uid: string) =>
    (roundChips[uid]?.plus2 ?? 0) * 2 +
    (roundChips[uid]?.plus1 ?? 0) -
    (roundChips[uid]?.minus1 ?? 0);

  const sorted = [...game.turnOrder].sort((a, b) => {
    const s = score(b) - score(a);
    if (s !== 0) return s;
    const p2 = (roundChips[b]?.plus2 ?? 0) - (roundChips[a]?.plus2 ?? 0);
    if (p2 !== 0) return p2;
    const p1 = (roundChips[b]?.plus1 ?? 0) - (roundChips[a]?.plus1 ?? 0);
    if (p1 !== 0) return p1;
    // Last round's winner wins the tiebreaker.
    const lastWinner = roundHistory[roundHistory.length - 1]?.ranking[0];
    if (a === lastWinner) return -1;
    if (b === lastWinner) return 1;
    return 0;
  });

  return sorted[0] ?? null;
}
