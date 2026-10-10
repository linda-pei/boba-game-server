import { describe, expect, it } from "vitest";
import type { CloverCard, CloverPlacement } from "../../types";
import {
  evaluateCloverGuess,
  getCloverScore,
  getNextCloverPlayer,
  getOuterKeywordPairs,
  hasValidCloverClues,
  isCompleteCloverPlacement,
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
});
