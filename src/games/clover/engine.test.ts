import { describe, expect, it } from "vitest";
import type { CloverCard, CloverPlacement } from "../../types";
import {
  cloverWordPosition,
  dealtCloverPlacement,
  evaluateCloverGuess,
  getCloverClueWarning,
  getCloverRank,
  getCloverScore,
  getNextCloverPlayer,
  getOuterKeywordPairs,
  hasValidCloverClues,
  isCompleteCloverPlacement,
  moveCloverGuessCard,
  randomCloverPlacement,
  randomCloverRotations,
  rotateCloverWords,
} from "./engine";

const cards: CloverCard[] = [
  { id: "a", words: ["a-top", "a-right", "a-bottom", "a-left"] },
  { id: "b", words: ["b-top", "b-right", "b-bottom", "b-left"] },
  { id: "c", words: ["c-top", "c-right", "c-bottom", "c-left"] },
  { id: "d", words: ["d-top", "d-right", "d-bottom", "d-left"] },
  { id: "decoy", words: ["x-top", "x-right", "x-bottom", "x-left"] },
];

const answer: Record<string, CloverPlacement> = {
  a: { slot: "top-left", rotation: 0 },
  b: { slot: "top-right", rotation: 90 },
  c: { slot: "bottom-left", rotation: 180 },
  d: { slot: "bottom-right", rotation: 270 },
};

describe("Clover engine", () => {
  it("rotates keyword edges clockwise", () => {
    expect(rotateCloverWords(cards[0].words, 90)).toEqual([
      "a-left", "a-top", "a-right", "a-bottom",
    ]);
  });

  it("places each word where rotateCloverWords shows it", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const shown = rotateCloverWords(cards[0].words, rotation);
      cards[0].words.forEach((word, index) => expect(shown[cloverWordPosition(index, rotation)]).toBe(word));
    }
  });

  it("derives the four outside keyword pairs from slots and rotations", () => {
    expect(getOuterKeywordPairs(cards, answer)).toEqual({
      top: ["a-top", "b-left"],
      right: ["b-top", "d-bottom"],
      bottom: ["c-top", "d-left"],
      left: ["a-left", "c-right"],
    });
  });

  it("requires four distinct, valid card placements", () => {
    expect(isCompleteCloverPlacement(answer, cards)).toBe(true);
    expect(isCompleteCloverPlacement({ a: answer.a }, cards)).toBe(false);
    expect(isCompleteCloverPlacement({ ...answer, decoy: { slot: "top-left", rotation: 0 } }, cards)).toBe(false);
  });

  it("scores a first-attempt perfect Clover at six points", () => {
    const result = evaluateCloverGuess(answer, answer);
    expect(result.isPerfect).toBe(true);
    expect(getCloverScore(result, 1)).toBe(6);
  });

  it("identifies the cards retained after a missed first attempt", () => {
    const guess: Record<string, CloverPlacement> = {
      a: answer.a,
      b: { slot: "bottom-left", rotation: 0 },
      c: { slot: "top-right", rotation: 0 },
      decoy: { slot: "bottom-right", rotation: 0 },
    };
    const result = evaluateCloverGuess(answer, guess);

    expect(result.correctCardIds).toEqual(["a"]);
    expect(result.incorrectCardIds).toEqual(["b", "c", "decoy"]);
    expect(getCloverScore(result, 2)).toBe(1);
  });

  it("validates the clue and spectator-order constraints", () => {
    expect(hasValidCloverClues({ top: "orbit", right: "ship", bottom: "sail", left: "anchor" })).toBe(true);
    expect(hasValidCloverClues({ top: "two words", right: "ship", bottom: "sail", left: "anchor" })).toBe(false);
    expect(getNextCloverPlayer(["a", "b", "c"], "c")).toBe("a");
  });

  it("assigns a valid random rotation to every card", () => {
    const rolls = [0, 0.3, 0.6, 0.9, 0.99];
    let call = 0;
    expect(randomCloverRotations(cards, () => rolls[call++])).toEqual({
      a: 0, b: 90, c: 180, d: 270, decoy: 270,
    });
  });

  it("deals a random starting Clover: every card in a distinct slot with a valid rotation", () => {
    const cards = [0, 1, 2, 3].map((n) => ({ id: `c${n}`, words: ["a", "b", "c", "d"] as CloverCard["words"] }));
    const placement = randomCloverPlacement(cards);
    expect(isCompleteCloverPlacement(placement, cards)).toBe(true);
    expect(new Set(Object.values(placement).map((p) => p.slot)).size).toBe(4);
  });

  it("uses the dealt Clover, or slot order for boards dealt without one", () => {
    const cards = [0, 1, 2, 3].map((n) => ({ id: `c${n}`, words: ["a", "b", "c", "d"] as CloverCard["words"] }));
    const dealt = randomCloverPlacement(cards);
    expect(dealtCloverPlacement(cards, dealt)).toBe(dealt);
    expect(dealtCloverPlacement(cards, {}).c2).toEqual({ slot: "bottom-left", rotation: 0 });
  });

  it("keeps a card's rotation when it leaves the board", () => {
    const board: Record<string, CloverPlacement> = { a: { slot: "top-left", rotation: 90 }, b: { slot: "top-right", rotation: 270 } };
    // Moving within the board keeps the given rotation; a bumped card keeps its rotation in the tray.
    const bumped = moveCloverGuessCard(board, { a: 0, b: 0, c: 0 }, "c", { slot: "top-right", rotation: 180 });
    expect(bumped.sharedPlacement).toEqual({ a: board.a, c: { slot: "top-right", rotation: 180 } });
    expect(bumped.trayRotations.b).toBe(270);
    // Removing a card puts it back in the tray as rotated.
    expect(moveCloverGuessCard(board, { a: 0 }, "a", null).trayRotations.a).toBe(90);
    // Locked cards are never bumped.
    expect(moveCloverGuessCard(board, {}, "c", { slot: "top-left", rotation: 0 }, ["a"]).sharedPlacement.a).toEqual(board.a);
  });

  it("ranks the team score by player count", () => {
    expect(getCloverRank(0, 3).name).toBe("Small Sprout");
    expect(getCloverRank(10, 3).name).toBe("Growth");
    expect(getCloverRank(11, 3).name).toBe("First bud");
    expect(getCloverRank(17, 3).name).toBe("Blossom");
    expect(getCloverRank(18, 3).name).toBe("Four-leaf clover");
    expect(getCloverRank(9, 4).name).toBe("Growth");
    expect(getCloverRank(24, 5).name).toBe("First bud");
    expect(getCloverRank(29, 6).name).toBe("First bud");
    expect(getCloverRank(36, 6).name).toBe("Four-leaf clover");
  });

  it("warns about multi-word or keyword clues", () => {
    expect(getCloverClueWarning("")).toBeNull();
    expect(getCloverClueWarning("sunset")).toBeNull();
    expect(getCloverClueWarning("ice cream")).toBe("One word only");
    expect(getCloverClueWarning("Ocean", ["ocean", "tree"])).toBe("Can't use a keyword from this pair");
  });
});
