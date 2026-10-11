import type { BBMission } from "../../types";

/** Training missions 1–8, from the physical mission cards (see Rules.md → Card Data). */
export const MISSIONS: BBMission[] = [
  {
    id: 1,
    name: "TRAINING, Day 1",
    subtitle: "Lesson 1: How to cut a wire",
    blue: { from: 1, to: 6 },
    red: { count: 0 },
    yellow: { count: 0 },
    equipment: { count: 0 },
    rules: [],
  },
  {
    id: 2,
    name: "TRAINING, Day 2",
    subtitle: "Lesson 2: How to cut a yellow wire",
    blue: { from: 1, to: 8 },
    red: { count: 0 },
    yellow: { count: 2, from: 1.1, to: 7.1 },
    equipment: { count: 0 },
    rules: [],
  },
  {
    id: 3,
    name: "TRAINING, Day 3",
    subtitle: "Lesson 3: How (NOT!) to cut a red wire",
    blue: { from: 1, to: 10 },
    red: { count: 1, from: 1.5, to: 9.5 },
    yellow: { count: 0 },
    equipment: { count: "players", exclude: [2, 12] },
    rules: [],
  },
  {
    id: 4,
    name: "TRAINING: First day in the field",
    subtitle: "Time to put theory into practice",
    blue: { from: 1, to: 12 },
    red: { count: 1 },
    yellow: { count: 4 },
    equipment: { count: "players" },
    rules: [],
  },
  {
    id: 5,
    name: "TRAINING: Second day in the field",
    subtitle: "This is a minefield, not the yellow brick road",
    blue: { from: 1, to: 12 },
    red: { count: 1 },
    yellow: { count: 2, outOf: 3 },
    equipment: { count: "players" },
    twoPlayer: { red: { count: 2 } },
    rules: [],
  },
  {
    id: 6,
    name: "TRAINING: Third day in the field",
    subtitle: "What is bold yellow and ready for a new action? 4 yellow wires that must be cut",
    blue: { from: 1, to: 12 },
    red: { count: 1 },
    yellow: { count: 4 },
    equipment: { count: "players" },
    twoPlayer: { red: { count: 2 } },
    rules: [],
  },
  {
    id: 7,
    name: "TRAINING: Last day of class",
    subtitle: "Looks like you're seeing double. Are you ready with red being red?",
    blue: { from: 1, to: 12 },
    red: { count: 1, outOf: 2 },
    yellow: { count: 0 },
    equipment: { count: "players" },
    twoPlayer: { red: { count: 1, outOf: 3 } },
    rules: [],
  },
  {
    id: 8,
    name: "FINAL EXAM",
    subtitle:
      "Today is the big day. Your extensive bomb disposal training missions have led you here. Are you ready to face the fuse and pass the final exam?",
    blue: { from: 1, to: 12 },
    red: { count: 1, outOf: 2 },
    yellow: { count: 2, outOf: 3 },
    equipment: { count: "players" },
    twoPlayer: { red: { count: 1, outOf: 3 }, yellow: { count: 4 } },
    rules: [],
  },
];

export function getMission(id: number): BBMission {
  const mission = MISSIONS.find((item) => item.id === id);
  if (!mission) throw new Error(`Unknown mission ${id}`);
  return mission;
}
