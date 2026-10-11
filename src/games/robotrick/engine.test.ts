import { describe, expect, it } from "vitest";
import type { RobotrickCard, RobotrickPlay, RobotrickType } from "../../types";
import {
  AI_CARDS,
  DROCO_SEAT,
  applyTrick,
  buildRound,
  cardVp,
  chooseDrocoCard,
  createDeck,
  dealRound,
  getAiCard,
  ledType,
  legalPlays,
  nextSeat,
  passTarget,
  pickAiCardId,
  progressTrick,
  roundScore,
  seatOrderForRound,
  startNextTrick,
  trickWinner,
} from "./engine";

const card = (id: string): RobotrickCard => {
  const type = id[0] as RobotrickType;
  const strength = Number(id.slice(1));
  return { id, type, strength, vp: cardVp(strength) };
};
const cards = (...ids: string[]) => ids.map(card);
const play = (seat: string, id: string): RobotrickPlay => ({ seat, card: card(id) });

describe("deck and VP", () => {
  it("has 52 unique cards worth 360 VP", () => {
    const deck = createDeck();
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.reduce((sum, c) => sum + c.vp, 0)).toBe(360);
  });

  it("uses the printed VP values", () => {
    expect([1, 7, 10, 11, 12, 13].map(cardVp)).toEqual([1, 7, 10, 10, 10, 15]);
  });

  it("deals a trump, 3 aside, and 12 cards to each of four seats", () => {
    const deal = dealRound();
    expect(deal.setAside).toHaveLength(3);
    expect(deal.hands.map((h) => h.length)).toEqual([12, 12, 12]);
    expect(deal.drocoHand).toHaveLength(12);
    const all = [deal.trump, ...deal.setAside, ...deal.hands.flat(), ...deal.drocoHand].map((c) => c.id);
    expect(new Set(all).size).toBe(52);
  });
});

describe("seating and passing", () => {
  const players = ["host", "p2", "p3"];

  it("moves Droco each round per the rulebook", () => {
    expect(seatOrderForRound(players, 1)).toEqual(["host", DROCO_SEAT, "p2", "p3"]);
    expect(seatOrderForRound(players, 2)).toEqual(["host", "p2", DROCO_SEAT, "p3"]);
    expect(seatOrderForRound(players, 3)).toEqual(["host", "p2", "p3", DROCO_SEAT]);
  });

  it("passes to the next human clockwise", () => {
    expect(players.map((uid) => passTarget(players, uid))).toEqual(["p2", "p3", "host"]);
  });
});

describe("legal plays", () => {
  const hand = cards("A3", "A9", "C5");
  it("must follow the led type when possible", () => {
    expect(legalPlays(hand, "A").map((c) => c.id)).toEqual(["A3", "A9"]);
  });
  it("may play anything when void or leading", () => {
    expect(legalPlays(hand, "B")).toHaveLength(3);
    expect(legalPlays(hand, null)).toHaveLength(3);
  });
});

describe("Droco's AI choice", () => {
  it("matches the rulebook example: Lead High then Short picks D10 over A10", () => {
    const hand = cards("A10", "A4", "A3", "A2", "D10", "D5", "D1", "B7");
    const choice = chooseDrocoCard(hand, getAiCard(1), null); // card 1 leads High / Short
    expect(choice.card.id).toBe("D10");
    expect(choice.column).toBe("lead");
    expect(choice.reason).toBe("Lead → High, then Short: D10");
  });

  it("falls back to A>B>C>D when criteria still tie", () => {
    const hand = cards("A10", "A4", "A3", "D10", "D5", "D1");
    expect(chooseDrocoCard(hand, getAiCard(1), null).card.id).toBe("A10");
  });

  it("follows with only the led type", () => {
    const hand = cards("B12", "B3", "A1");
    const low = chooseDrocoCard(hand, getAiCard(1), "B"); // follow: Low
    expect(low.card.id).toBe("B3");
    const high = chooseDrocoCard(hand, getAiCard(9), "B"); // follow: High
    expect(high.card.id).toBe("B12");
  });

  it("uses the Unfollow column when void in the led type", () => {
    const hand = cards("A9", "A2", "C8"); // A is long (2), C is short (1)
    const choice = chooseDrocoCard(hand, getAiCard(1), "D"); // unfollow: Long / Low
    expect(choice.column).toBe("unfollow");
    expect(choice.card.id).toBe("A2");
  });

  it("ignores types Droco has none of for Short", () => {
    const hand = cards("A9", "A2", "C8", "C1", "C5");
    expect(chooseDrocoCard(hand, getAiCard(2), null).card.id).toBe("A9"); // lead Short / High
  });

  it("has all 10 AI cards", () => {
    expect(AI_CARDS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("trick resolution", () => {
  it("highest led type wins without trump; off-type can't win", () => {
    const plays = [play("p1", "B5"), play(DROCO_SEAT, "B9"), play("p2", "A13"), play("p3", "B2")];
    expect(trickWinner(plays, "C")).toBe(DROCO_SEAT);
  });

  it("highest trump wins when trump is played", () => {
    const plays = [play("p1", "B13"), play(DROCO_SEAT, "C2"), play("p2", "C7"), play("p3", "B2")];
    expect(trickWinner(plays, "C")).toBe("p2");
  });

  it("Droco winning gives every human their own card face down", () => {
    const plays = [play("p1", "B5"), play(DROCO_SEAT, "B9"), play("p2", "B3"), play("p3", "B2")];
    const out = applyTrick(plays, DROCO_SEAT, {}, {}, 3);
    expect(out.penalties.p1.map((c) => c.id)).toEqual(["B5"]);
    expect(out.penalties.p3.map((c) => c.id)).toEqual(["B2"]);
    expect(out.penalties[DROCO_SEAT]).toBeUndefined();
    expect(out.hangars).toEqual({});
  });

  it("a human winner takes Droco's card face up, or face down when hangars are full", () => {
    const plays = [play("p1", "B13"), play(DROCO_SEAT, "B9"), play("p2", "B3"), play("p3", "B2")];
    const open = applyTrick(plays, "p1", {}, {}, 3);
    expect(open.hangars.p1.map((c) => c.id)).toEqual(["B9"]);
    expect(open.penalties).toEqual({});

    const full = applyTrick(plays, "p1", { p1: cards("A1", "A2", "A3") }, {}, 3);
    expect(full.hangars.p1).toHaveLength(3);
    expect(full.penalties.p1.map((c) => c.id)).toEqual(["B9"]);
  });

  it("scores face-up minus face-down", () => {
    expect(roundScore(cards("A13", "B11"), cards("C7"))).toBe(15 + 10 - 7);
    expect(roundScore([], cards("D12"))).toBe(-10);
  });
});

describe("AI card selection", () => {
  it("keeps round 1's card when fixed", () => {
    expect(pickAiCardId(7, true)).toBe(7);
    expect(pickAiCardId(7, false, () => 0)).toBe(1);
    expect(pickAiCardId(null, true, () => 0.99)).toBe(10);
  });
});

describe("trick flow", () => {
  const players = ["host", "p2", "p3"];
  const options = { hangars: 3, fixedAiCard: false };
  const base = () => buildRound({ playerOrder: players, round: 1, options, previousAiCardId: null, roundScores: {}, random: () => 0 }).game;

  it("starts a round waiting for passes with Droco to lead", () => {
    const game = base();
    expect(game.phase).toBe("passing");
    expect(game.seatOrder).toEqual(["host", DROCO_SEAT, "p2", "p3"]);
    expect(game.turn).toBe(DROCO_SEAT);
    expect(game.aiCardId).toBe(1);
  });

  it("auto-plays Droco's lead, then waits for the next human", () => {
    const game = progressTrick({ ...base(), phase: "playing" });
    expect(game.currentTrick).toHaveLength(1);
    expect(game.currentTrick[0].seat).toBe(DROCO_SEAT);
    expect(game.drocoHand).toHaveLength(11);
    expect(game.drocoReason).toMatch(/^Lead →/);
    expect(game.turn).toBe("p2");
  });

  it("auto-plays Droco mid-trick and resolves a full trick", () => {
    const game = {
      ...base(),
      phase: "playing" as const,
      trump: card("D1"),
      drocoHand: cards("B9", "B2", "A5"),
      leader: "host",
      turn: DROCO_SEAT,
      currentTrick: [play("host", "B5")],
    };
    const afterDroco = progressTrick(game); // card 1 follows Low → B2
    expect(afterDroco.currentTrick.map((p) => p.card.id)).toEqual(["B5", "B2"]);
    const full = progressTrick({ ...afterDroco, currentTrick: [...afterDroco.currentTrick, play("p2", "B7"), play("p3", "B3")] });
    expect(full.phase).toBe("trick-result");
    expect(full.lastTrick?.winner).toBe("p2");
    expect(full.hangars.p2.map((c) => c.id)).toEqual(["B2"]);
    expect(full.leader).toBe("p2");
  });

  it("scores the round after trick 12", () => {
    const game = { ...base(), phase: "trick-result" as const, trickNumber: 12, hangars: { host: cards("A13"), p2: [], p3: [] }, penalties: { host: [], p2: cards("B7"), p3: [] } };
    const ended = startNextTrick(game);
    expect(ended.phase).toBe("round-end");
    expect(ended.roundScores).toEqual({ host: [15], p2: [-7], p3: [0] });
  });
});

describe("full game simulation", () => {
  it("plays 3 rounds of 12 tricks with legal random moves", () => {
    const players = ["host", "p2", "p3"];
    let seed = 7;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    let roundScores: Record<string, number[]> = { host: [], p2: [], p3: [] };
    let previousAiCardId: number | null = null;

    for (let round = 1; round <= 3; round += 1) {
      const built = buildRound({ playerOrder: players, round, options: { hangars: 3, fixedAiCard: false }, previousAiCardId, roundScores, random });
      const hands = { ...built.hands };
      // Pass the two lowest cards left.
      const outgoing = Object.fromEntries(players.map((uid) => [uid, hands[uid].slice(-2)]));
      players.forEach((uid) => {
        hands[uid] = hands[uid].filter((c) => !outgoing[uid].includes(c));
      });
      players.forEach((uid) => {
        hands[passTarget(players, uid)] = [...hands[passTarget(players, uid)], ...outgoing[uid]];
      });

      let game = progressTrick({ ...built.game, phase: "playing" });
      let guard = 0;
      while (game.phase !== "round-end") {
        guard += 1;
        expect(guard).toBeLessThan(200);
        if (game.phase === "trick-result") {
          expect(game.lastTrick?.plays).toHaveLength(4);
          game = startNextTrick(game);
          continue;
        }
        const uid = game.turn;
        expect(uid).not.toBe(DROCO_SEAT);
        const options = legalPlays(hands[uid], ledType(game.currentTrick));
        const chosen = options[Math.floor(random() * options.length)];
        hands[uid] = hands[uid].filter((c) => c.id !== chosen.id);
        game = progressTrick({ ...game, currentTrick: [...game.currentTrick, { seat: uid, card: chosen }], turn: nextSeat(game.seatOrder, uid) });
      }

      expect(game.trickNumber).toBe(12);
      expect(game.drocoHand).toHaveLength(0);
      players.forEach((uid) => {
        expect(hands[uid]).toHaveLength(0);
        expect(game.hangars[uid].length).toBeLessThanOrEqual(3);
      });
      roundScores = game.roundScores;
      previousAiCardId = game.aiCardId;
    }

    players.forEach((uid) => expect(roundScores[uid]).toHaveLength(3));
  });
});
