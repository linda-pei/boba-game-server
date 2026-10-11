import type { BBGame } from "../../../types";
import { nextTurn, unwrapPublic } from "../engine";
import { createNumberDeck } from "./numberDeck";
import type { MissionRule } from "./types";

/**
 * Mission 18: the only equipment is #8 General Radar, always usable (it never runs out). No setup
 * info tokens. Each turn the active player reveals the top number card N, which runs the General
 * Radar for N, then picks who must carry out a cut of N (a Dual Cut naming N or a Solo Cut of N) —
 * themselves included. A number card leaves the deck once its 4 wires are cut; when the deck runs
 * out it is reshuffled. A player holding only red wires Reveals instead of drawing.
 */
export interface BatRadarState {
  deck: number[];
  /** Whose turn it is (they draw and choose); `game.turn` moves to the chosen cutter. */
  active: string | null;
  current: number | null;
  designated: string | null;
}

const GENERAL_RADAR = 8;

const fullyCut = (game: BBGame, value: number) => (game.cutCounts.blue[value] ?? 0) >= (game.wireTotals.blue[value] ?? 4);

const stateOf = (game: BBGame) => game.ruleState.batRadar as BatRadarState;

/** The active player turns up the next number card (skipping finished values) and runs the radar for it. */
export function revealBatCard(game: BBGame, uid: string, random: () => number = Math.random): BBGame {
  const state = stateOf(game);
  if (state.active !== uid || game.turn !== uid) throw new Error("It's not your turn.");
  if (state.current !== null) throw new Error("The number card is already revealed.");
  let deck = state.deck.filter((value) => !fullyCut(game, value));
  if (deck.length === 0) deck = createNumberDeck(random).filter((value) => !fullyCut(game, value));
  if (deck.length === 0) throw new Error("No blue wires left to cut.");
  const [current, ...rest] = deck;
  const answers = Object.fromEntries(game.playerOrder.map((player) => [player, null]));
  return {
    ...game,
    radar: { by: uid, value: current, answers },
    ruleState: { ...game.ruleState, batRadar: { ...state, deck: rest, current } },
  };
}

/** The active player chooses who carries out the cut (someone the radar said holds that value). */
export function designateBatCutter(game: BBGame, uid: string, cutter: string): BBGame {
  const state = stateOf(game);
  if (state.active !== uid || game.turn !== uid) throw new Error("It's not your turn.");
  if (state.current === null) throw new Error("Reveal the number card first.");
  if (state.designated !== null) throw new Error("You already chose who cuts.");
  if (game.radar?.value !== state.current || Object.values(game.radar.answers).some((answer) => answer === null)) {
    throw new Error("Wait for everyone to answer the radar.");
  }
  if (!game.radar.answers[cutter]) throw new Error(`Choose someone who holds a ${state.current}.`);
  return { ...game, turn: cutter, ruleState: { ...game.ruleState, batRadar: { ...state, designated: cutter } } };
}

export const batRadar: MissionRule<Record<string, never>, BatRadarState> = {
  id: "batRadar",
  describe: (_params, state) =>
    state.current === null
      ? "Each turn: reveal a number card (it runs the General Radar), then choose who cuts that value."
      : `This turn's cut: ${state.current}.`,
  setup: (built, { random }) => ({
    built: {
      ...built,
      game: {
        ...built.game,
        equipment: [{ id: GENERAL_RADAR, unlocked: true, used: false }],
        // No setup info tokens: everyone is done before setup begins.
        setupDone: [...built.game.playerOrder],
      },
    },
    state: { deck: createNumberDeck(random), active: null, current: null, designated: null },
  }),
  onPlay: ({ game, state }) => ({ state: { ...state, active: game.turn } }),
  canCut: (declared, { state }) => {
    if (state.current === null) return "Reveal the number card first.";
    if (state.designated === null) return "Choose who carries out the cut first.";
    return declared === state.current ? null : `This turn's cut must be a ${state.current}.`;
  },
  canReveal: (_uid, { state }) => (state.current !== null ? `The number card is revealed: carry out the cut of ${state.current}.` : null),
  // The turn passes on from the active player, not from whoever they chose to cut.
  nextTurn: (actor, { game, state }) => {
    const turn = nextTurn(game.playerOrder, state.active ?? actor, unwrapPublic(game.stands));
    return { turn, state: { ...state, active: turn, current: null, designated: null } };
  },
  // A manual radar mid-choice would replace the number card's answers, so it waits until the cutter is chosen.
  canUseEquipment: (_uid, cardId, { state }) =>
    cardId === GENERAL_RADAR && state.current !== null && state.designated === null ? "Choose who cuts before running another radar." : null,
  turnStatus: (viewer, { state }) => {
    if (!state.active || state.designated !== null) return undefined;
    const mine = state.active === viewer;
    if (state.current === null) return mine ? { mine, text: "Your turn: reveal the number card (or Reveal if you only hold reds)." } : undefined;
    return mine ? { mine, text: `Choose who cuts a ${state.current}.` } : { mine, text: `Waiting for the active player to choose who cuts a ${state.current}…` };
  },
  isEquipmentUnlocked: (cardId) => (cardId === GENERAL_RADAR ? true : undefined),
  isEquipmentReusable: (cardId) => cardId === GENERAL_RADAR,
};
