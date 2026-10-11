import { describe, expect, it } from "vitest";
import type { BBDeclared, BBGame } from "../../../types";
import { canRevealRed, finishTurn, resolveDualCut, soloCutIndices } from "../engine";
import { MISSIONS, getMission } from "../missions";
import {
  buildMissionWithRules,
  cutWithRules,
  deadlyCheck,
  finishTurnWithRules,
  ruleCanClaimTurn,
  ruleCanCut,
  ruleCanReveal,
  ruleCanUseEquipment,
  ruleLossReason,
  startPlayWithRules,
  ruleEquipmentFaceDown,
  setupInfoPolicy,
  wrongGuessExplodes,
  wrongGuessToken,
} from "./index";
import { designateBatCutter, revealBatCard, type BatRadarState } from "./batRadar";
import type { RedAlertState } from "./redAlert";
import type { SecretRoleState } from "./secretRole";
import type { DeadlyValueState } from "./deadlyValue";
import type { RedTapeState } from "./redTape";
import type { RussianToolboxState } from "./russianToolbox";
import type { SequenceState } from "./sequence";

const seeded = (seed = 1) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const cuts = (blue: Record<string, number>, yellow = 0) => ({ blue, red: 0, yellow });

describe("sequence (missions 9 & 16)", () => {
  const game = (state: SequenceState, blue: Record<string, number> = {}) =>
    ({ ...buildMissionWithRules(["a", "b"], getMission(9), seeded(1)).game, ruleState: { sequence: state }, cutCounts: cuts(blue) }) as BBGame;

  it("blocks later values until enough of the current one are cut", () => {
    const g = game({ cards: [4, 9, 2], index: 0 });
    expect(ruleCanCut(g, 4)).toBeNull();
    expect(ruleCanCut(g, 9)).toMatch(/cut the 4s first/);
    expect(ruleCanCut(g, 2)).toMatch(/cut the 4s first/);
    expect(ruleCanCut(g, 7)).toBeNull();
    expect(ruleCanCut(g, "yellow")).toBeNull();
  });

  it("advances after `threshold` cuts (2 in mission 9, 4 in mission 16)", () => {
    const built = buildMissionWithRules(["a", "b"], getMission(9), seeded(2));
    const [first] = (built.game.ruleState.sequence as SequenceState).cards;
    let g: BBGame = built.game;
    const wires = Object.entries(built.hands).flatMap(([uid, stands]) => stands.flat().map((wire, index) => ({ uid, wire, index })));
    wires.filter(({ wire }) => wire.color === "blue" && wire.sortKey === first).slice(0, 2).forEach(({ uid, wire, index }) => {
      g = cutWithRules(g, uid, index, wire);
    });
    expect((g.ruleState.sequence as SequenceState).index).toBe(1);

    const built16 = buildMissionWithRules(["a", "b"], getMission(16), seeded(2));
    expect(getMission(16).rules[0].params?.threshold).toBe(4);
    expect((built16.game.ruleState.sequence as SequenceState).cards).toHaveLength(3);
  });
});

describe("deadlyValue (mission 11)", () => {
  it("draws a value, skips the captain's setup token, blocks naming it, and makes it deadly", () => {
    const built = buildMissionWithRules(["cap", "b", "c"], getMission(11), seeded(3));
    const { value } = built.game.ruleState.deadlyValue as DeadlyValueState;
    expect(value).toBeGreaterThanOrEqual(1);
    expect(built.game.setupDone).toEqual(["cap"]);
    expect(ruleCanCut(built.game, value)).toMatch(/detonates/);
    const deadly = deadlyCheck(built.game);
    expect(deadly({ id: "x", color: "blue", sortKey: value })).toBe(true);
    expect(resolveDualCut([{ id: "x", color: "blue", sortKey: value }], value === 12 ? 1 : value + 1, deadly)).toEqual({ result: "explode" });
    expect(canRevealRed([[{ id: "x", color: "blue", sortKey: value, cut: false }]], deadly)).toBe(true);
  });
});

describe("redTape (mission 12)", () => {
  const built = buildMissionWithRules(["a", "b", "c"], getMission(12), seeded(5));
  const state = built.game.ruleState.redTape as RedTapeState;

  it("covers every equipment card with a number card", () => {
    expect(Object.keys(state.covers)).toHaveLength(built.game.equipment.length);
  });

  it("needs both pairs; one pair when the numbers match", () => {
    const game = { ...built.game, ruleState: { redTape: { covers: { 3: 7, 5: 5 } } }, equipment: [{ id: 3, unlocked: false, used: false }, { id: 5, unlocked: false, used: false }] } as BBGame;
    const wire = (value: number) => ({ id: `B${value}`, color: "blue" as const, sortKey: value });
    const stands = { ...game.stands };
    const at = (g: BBGame, value: number) => ({ ...g, cutCounts: { ...g.cutCounts, blue: { ...g.cutCounts.blue, [value]: (g.cutCounts.blue[value] ?? 0) + 1 } } });
    // Own pair of 3s alone isn't enough.
    let g = at(at({ ...game, stands }, 3), 3);
    g = cutWithRules(at(g, 3), "a", 0, wire(3));
    expect(g.equipment.find((c) => c.id === 3)?.unlocked).toBe(false);
    // The covering 7s complete it.
    g = cutWithRules(at(g, 7), "a", 1, wire(7));
    expect(g.equipment.find((c) => c.id === 3)?.unlocked).toBe(true);
    // #5 covered by a 5: one pair of 5s satisfies both.
    g = cutWithRules(at(g, 5), "a", 2, wire(5));
    expect(g.equipment.find((c) => c.id === 5)?.unlocked).toBe(true);
  });
});

describe("russianToolbox (mission 15)", () => {
  it("keeps equipment face down and flips left to right as number cards are finished", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(15), seeded(7));
    const state = built.game.ruleState.russianToolbox as RussianToolboxState;
    expect(state.flipped).toBe(0);
    built.game.equipment.forEach((card) => expect(ruleEquipmentFaceDown(built.game, card.id)).toBe(true));

    let g: BBGame = built.game;
    const current = state.current!;
    const all = Object.entries(built.hands).flatMap(([uid, stands]) => stands.flat().map((wire, index) => ({ uid, wire, index })));
    all.filter(({ wire }) => wire.color === "blue" && wire.sortKey === current).forEach(({ uid, wire, index }) => {
      g = cutWithRules(g, uid, index, wire);
    });
    const after = g.ruleState.russianToolbox as RussianToolboxState;
    expect(after.flipped).toBe(1);
    expect(after.current).not.toBe(current);
    expect(g.equipment[0].unlocked).toBe(true);
    expect(ruleEquipmentFaceDown(g, g.equipment[0].id)).toBe(false);
    expect(ruleEquipmentFaceDown(g, g.equipment[1].id)).toBe(true);
  });
});

describe("secret roles (missions 14 & 17)", () => {
  it("the random Captain-card holder takes the role and goes first", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 12; seed += 1) {
      const built = buildMissionWithRules(["a", "b", "c"], getMission(14), seeded(seed));
      const { uid } = built.game.ruleState.rookie as SecretRoleState;
      expect(built.game.captain).toBe(uid);
      expect(built.game.playerOrder[0]).toBe(uid);
      // Seats stay clockwise: the order is a rotation of a, b, c.
      expect(["abc", "bca", "cab"]).toContain(built.game.playerOrder.join(""));
      seen.add(uid);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("Rookie: a failed Dual Cut explodes, others don't; no Stabilizer for the Rookie", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(14), seeded(2));
    const rookieUid = (built.game.ruleState.rookie as SecretRoleState).uid;
    const other = built.game.playerOrder.find((p) => p !== rookieUid)!;
    expect(wrongGuessExplodes(built.game, rookieUid, other)).toBe(true);
    expect(wrongGuessExplodes(built.game, other, rookieUid)).toBe(false);
    expect(ruleCanUseEquipment(built.game, rookieUid, 9)).toMatch(/Stabilizer/);
    expect(ruleCanUseEquipment(built.game, rookieUid, 6)).toBeNull();
    expect(ruleCanUseEquipment(built.game, other, 9)).toBeNull();
  });

  it("Red Herring: 2 fake setup tokens, false tokens on misses, no equipment", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(17), seeded(3));
    const herring = (built.game.ruleState.redHerring as SecretRoleState).uid;
    const other = built.game.playerOrder.find((p) => p !== herring)!;
    expect(setupInfoPolicy(built.game, herring)).toEqual({ count: 2, fake: true });
    expect(setupInfoPolicy(built.game, other)).toEqual({ count: 1, fake: false });
    const wire = { id: "B5-1", color: "blue" as const, sortKey: 5 };
    const truth = { color: "blue" as const, value: 5 };
    expect(wrongGuessToken(built.game, wire, 8, herring, truth)).toEqual({ color: "blue", value: 8 });
    expect(wrongGuessToken(built.game, wire, "yellow", herring, truth)).toEqual({ color: "yellow" });
    expect(wrongGuessToken(built.game, wire, 8, other, truth)).toEqual(truth);
    expect(ruleCanUseEquipment(built.game, herring, 2)).toMatch(/can't use equipment/);
    expect(ruleCanUseEquipment(built.game, other, 2)).toBeNull();
  });
});

describe("timer, free turns and audio (missions 10 & 19)", () => {
  it("timer: starts when play begins and loses the mission when it runs out", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(10), seeded(1));
    expect(built.game.ruleState.timer).toEqual({ endsAt: null });
    const playing = startPlayWithRules(built.game, 1_000);
    expect(playing.ruleState.timer).toEqual({ endsAt: 1_000 + 15 * 60_000 });
    expect(ruleLossReason(playing, 1_000 + 15 * 60_000 - 1)).toBeNull();
    expect(ruleLossReason(playing, 1_000 + 15 * 60_000)).toBe("Time ran out.");
    const late = finishTurnWithRules({ ...playing, turn: "a" }, "a", 1_000 + 16 * 60_000);
    expect(late.phase).toBe("mission-lost");

    const twoPlayer = startPlayWithRules(buildMissionWithRules(["a", "b"], getMission(10), seeded(1)).game, 0);
    expect(twoPlayer.ruleState.timer).toEqual({ endsAt: 12 * 60_000 });
  });

  it("free turns: the turn opens after each action; the last player can't snip again (except with 2)", () => {
    const playing = startPlayWithRules(buildMissionWithRules(["a", "b", "c"], getMission(10), seeded(2)).game, 0);
    expect(playing.turn).toBe("");
    expect(ruleCanClaimTurn(playing, "b")).toBeNull();
    const after = finishTurnWithRules({ ...playing, turn: "b" }, "b", 1);
    expect(after.turn).toBe("");
    expect(ruleCanClaimTurn(after, "b")).toMatch(/just went/);
    expect(ruleCanClaimTurn(after, "c")).toBeNull();

    const two = startPlayWithRules(buildMissionWithRules(["a", "b"], getMission(10), seeded(2)).game, 0);
    const twoAfter = finishTurnWithRules({ ...two, turn: "a" }, "a", 1);
    expect(ruleCanClaimTurn(twoAfter, "a")).toBeNull();
  });

  it("free turns: players with no wires left can't snip", () => {
    const playing = startPlayWithRules(buildMissionWithRules(["a", "b", "c"], getMission(10), seeded(3)).game, 0);
    const emptied = { ...playing, stands: { ...playing.stands, c: playing.stands.c.map((stand) => ({ slots: stand.slots.map(() => ({ cut: true })) })) } };
    expect(ruleCanClaimTurn(emptied, "c")).toMatch(/no wires/);
  });

  it("audio timer: records when the track starts", () => {
    const playing = startPlayWithRules(buildMissionWithRules(["a", "b"], getMission(19), seeded(4)).game, 42);
    expect(playing.ruleState.audioTimer).toEqual({ startedAt: 42 });
    expect(String(getMission(19).rules[0].params?.url)).toMatch(/^https:\/\/cdn\.pegasus\.de\//);
  });
});

describe("redAlert (mission 13)", () => {
  const redsOf = (stands: { color: string }[][]) => stands.map((stand) => stand.filter((w) => w.color === "red").length);

  it("deals one red to each of the first three players", () => {
    const built = buildMissionWithRules(["a", "b", "c", "d"], getMission(13), seeded(1));
    expect(built.game.wireTotals.red).toBe(3);
    expect(["a", "b", "c", "d"].map((uid) => redsOf(built.hands[uid]).reduce((x, y) => x + y, 0))).toEqual([1, 1, 1, 0]);
    // Stands stay sorted with the red tucked in.
    Object.values(built.hands).flat().forEach((stand) => expect(stand.map((w) => w.sortKey)).toEqual([...stand.map((w) => w.sortKey)].sort((x, y) => x - y)));
    expect(built.game.markers.filter((m) => m.color === "red")).toHaveLength(3);
  });

  it("with 2 players the captain gets two reds, one per stand, and places no info token", () => {
    const built = buildMissionWithRules(["cap", "b"], getMission(13), seeded(2));
    expect(redsOf(built.hands.cap)).toEqual([1, 1]);
    expect(redsOf(built.hands.b).reduce((x, y) => x + y, 0)).toBe(1);
    expect(built.game.setupDone).toEqual(["cap"]);
  });

  it("draws a random setup token value per player and blocks Reveal Red", () => {
    const built = buildMissionWithRules(["a", "b", "c"], getMission(13), seeded(3));
    const { tokens } = built.game.ruleState.redAlert as RedAlertState;
    expect(Object.keys(tokens)).toEqual(["a", "b", "c"]);
    expect(setupInfoPolicy(built.game, "b")).toEqual({ count: 1, fake: false, value: tokens.b });
    expect(ruleCanReveal(built.game, "a")).toMatch(/Red Alert/);
  });
});

describe("batRadar (mission 18)", () => {
  const start = (players = ["a", "b", "c"], seed = 4) => buildMissionWithRules(players, getMission(18), seeded(seed));
  const answerAll = (game: BBGame, holders: string[]) => ({
    ...game,
    radar: { ...game.radar!, answers: Object.fromEntries(game.playerOrder.map((p) => [p, holders.includes(p)])) },
  });

  it("skips setup tokens, starts play and has no equipment", () => {
    const { game } = start();
    expect(game.phase).toBe("playing");
    expect((game.ruleState.batRadar as BatRadarState).active).toBe("a");
    expect(game.equipment).toEqual([]);
  });

  it("reveals a card (running the radar), then the active player chooses a holder to cut that value", () => {
    let { game } = start();
    expect(ruleCanCut(game, 3)).toMatch(/Reveal the number card/);
    game = revealBatCard(game, "a", seeded(1));
    const value = (game.ruleState.batRadar as BatRadarState).current!;
    expect(game.radar).toEqual({ by: "a", value, answers: { a: null, b: null, c: null } });
    expect(() => designateBatCutter(game, "a", "b")).toThrow(/Wait for everyone/);
    expect(ruleCanReveal(game, "a")).toMatch(/carry out the cut/);
    game = answerAll(game, ["b"]);
    expect(() => designateBatCutter(game, "a", "c")).toThrow(/holds a/);
    expect(() => designateBatCutter(game, "b", "b")).toThrow(/not your turn/);
    game = designateBatCutter(game, "a", "b");
    expect(game.turn).toBe("b");
    expect(ruleCanCut(game, value)).toBeNull();
    expect(ruleCanCut(game, value === 12 ? 11 : value + 1)).toMatch(/must be a/);
    // After b's cut the turn passes on from a (to b), and the card is cleared.
    const next = finishTurnWithRules(game, "b");
    expect(next.turn).toBe("b");
    expect(next.ruleState.batRadar).toMatchObject({ active: "b", current: null, designated: null });
  });

  it("skips fully cut values and reshuffles an empty deck", () => {
    const { game } = start();
    const state = game.ruleState.batRadar as BatRadarState;
    const done = { ...game, cutCounts: { ...game.cutCounts, blue: { [state.deck[0]]: 4 } } };
    expect((revealBatCard(done, "a").ruleState.batRadar as BatRadarState).current).toBe(state.deck[1]);
    const empty = { ...game, ruleState: { batRadar: { ...state, deck: [] } } };
    const drawn = revealBatCard(empty, "a", seeded(2)).ruleState.batRadar as BatRadarState;
    expect(drawn.deck).toHaveLength(11);
  });
});

describe("rule-aware mission simulation", () => {
  // An all-knowing team that only takes moves the rules allow: Reveal (red/deadly), else a legal
  // Solo Cut, else a correct legal Dual Cut; a player with no legal move passes.
  function play(missionId: number, players: string[], seed: number) {
    const built = buildMissionWithRules(players, getMission(missionId), seeded(seed));
    const hands = built.hands;
    let game: BBGame = { ...built.game, phase: "playing" };
    const bat = getMission(missionId).rules.some((rule) => rule.id === "batRadar");
    // Mission 18's turn passes from the active player (not the chosen cutter), via the rule's nextTurn.
    const endTurn = (g: BBGame, actor: string) => (bat ? finishTurnWithRules(g, actor) : finishTurn(g, actor));
    for (let guard = 0; guard < 600 && game.phase === "playing"; guard += 1) {
      const batState = game.ruleState.batRadar as BatRadarState | undefined;
      if (batState && batState.current === null && !canRevealRed(hands[game.turn], deadlyCheck(game))) {
        // Reveal the number card, answer the radar truthfully, then pick a holder who can make the cut.
        const active = game.turn;
        game = revealBatCard(game, active, seeded(seed + guard));
        const value = game.radar!.value;
        const holds = (p: string) => hands[p].flat().some((w) => !w.cut && w.color === "blue" && w.sortKey === value);
        game = { ...game, radar: { ...game.radar!, answers: Object.fromEntries(players.map((p) => [p, holds(p)])) } };
        const holders = players.filter(holds);
        const cutter = holders.find((p) => soloCutIndices(hands[p], value, game.wireTotals, game.cutCounts)) ?? holders[0];
        game = designateBatCutter(game, active, cutter);
      }
      const uid = game.turn;
      const mine = hands[uid];
      const flat = mine.flat();
      const deadly = deadlyCheck(game);
      const cut = (owner: string, index: number) => {
        const wire = hands[owner].flat()[index];
        expect(deadly(wire)).toBe(false);
        wire.cut = true;
        game = cutWithRules(game, owner, index, wire);
      };
      if (canRevealRed(mine, deadly) && ruleCanReveal(game, uid)) {
        // Mission 13: Red Alert instead of Reveal — the all-knowing team cuts every red at once.
        players.forEach((owner) =>
          hands[owner].flat().forEach((wire, index) => {
            if (!wire.cut && wire.color === "red") {
              wire.cut = true;
              game = cutWithRules(game, owner, index, wire);
            }
          }),
        );
        game = endTurn(game, uid);
        continue;
      }
      if (canRevealRed(mine, deadly)) {
        flat.forEach((wire, index) => {
          if (!wire.cut) {
            wire.cut = true;
            game = cutWithRules(game, uid, index, wire);
          }
        });
        game = endTurn(game, uid);
        continue;
      }
      const values = [...new Set(flat.filter((w) => !w.cut && !deadly(w)).map((w): BBDeclared => (w.color === "yellow" ? "yellow" : w.sortKey)))].filter(
        (value) => !ruleCanCut(game, value),
      );
      const solo = values.map((value) => soloCutIndices(mine, value, game.wireTotals, game.cutCounts)).find(Boolean);
      if (solo) {
        solo.forEach((index) => cut(uid, index));
        game = endTurn(game, uid);
        continue;
      }
      done: for (const value of values) {
        for (const target of players.filter((p) => p !== uid)) {
          const t = hands[target].flat().findIndex((w) => !w.cut && resolveDualCut([w], value, deadly).result === "success");
          if (t === -1) continue;
          cut(target, t);
          cut(uid, flat.findIndex((w) => !w.cut && resolveDualCut([w], value, deadly).result === "success"));
          break done;
        }
      }
      game = endTurn(game, uid);
    }
    return game;
  }

  it("missions 9+ can be won at every player count without ever cutting a deadly wire", () => {
    for (const mission of MISSIONS.filter((m) => m.rules.length > 0)) {
      for (const players of [["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"], ["a", "b", "c", "d", "e"]]) {
        const game = play(mission.id, players, mission.id * 11 + players.length);
        expect(game.phase, `mission ${mission.id}, ${players.length} players`).toBe("mission-won");
      }
    }
  });
});
