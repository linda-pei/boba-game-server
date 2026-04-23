import { useState, useEffect } from "react";
import { doc, setDoc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type {
  DeepSeaGame,
  DeepSeaHand,
  DeepSeaDiver,
  TreasureChip,
  PathSpace,
  Room,
} from "../../types";
import { shuffled } from "../../utils/shuffle";
import {
  generateTreasureChips,
  buildInitialPath,
  rollDeepSeaDice,
  calculateMovement,
  resolveMovement,
  stackDroppedTreasures,
  compactPath,
} from "./treasureDeck";

// ---- Realtime listeners ----

export function useDeepSeaGame(roomCode: string | undefined) {
  const [game, setGame] = useState<DeepSeaGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode),
      (snapshot) => {
        if (snapshot.exists()) {
          setGame(snapshot.data() as DeepSeaGame);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Deep Sea game listener error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useDeepSeaHand(
  roomCode: string | undefined,
  uid: string | null
) {
  const [hand, setHand] = useState<DeepSeaHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as DeepSeaHand);
        } else {
          setHand(null);
        }
      }
    );

    return unsubscribe;
  }, [roomCode, uid]);

  return hand;
}

// ---- Helpers ----

function getOccupiedPositions(
  divers: Record<string, DeepSeaDiver>,
  excludeUid?: string
): Set<number> {
  const occupied = new Set<number>();
  for (const [uid, diver] of Object.entries(divers)) {
    if (uid !== excludeUid && !diver.returned && diver.position >= 0) {
      occupied.add(diver.position);
    }
  }
  return occupied;
}

function getActivePlayerUid(game: DeepSeaGame): string {
  return game.turnOrder[game.currentTurn];
}

function findNextActiveTurn(
  game: DeepSeaGame,
  afterIndex: number
): number | null {
  const count = game.turnOrder.length;
  for (let i = 1; i <= count; i++) {
    const idx = (afterIndex + i) % count;
    const uid = game.turnOrder[idx];
    const diver = game.divers[uid];
    if (!diver.returned) return idx;
  }
  return null; // all returned
}

// ---- Game initialization ----

export async function startDeepSeaGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const playerIds = Object.keys(room.players);
  const turnOrder = shuffled(playerIds);

  const chips = generateTreasureChips();
  const path = buildInitialPath(chips);

  const divers: Record<string, DeepSeaDiver> = {};
  for (const uid of playerIds) {
    divers[uid] = {
      position: -1,
      direction: "down",
      carriedCount: 0,
      carriedLevels: [],
      returned: false,
    };
  }

  const gameData: DeepSeaGame = {
    gameType: "deep-sea",
    status: "round-start",
    round: 1,
    air: 25,
    path,
    divers,
    turnOrder,
    currentTurn: 0,
    diceResult: null,
    lastAction: null,
    scores: Object.fromEntries(playerIds.map((uid) => [uid, 0])),
    scoredThisRound: Object.fromEntries(playerIds.map((uid) => [uid, []])),
    winner: null,
    finalScores: null,
    finalTreasures: null,
    tiebreaker: null,
  };

  await setDoc(doc(db, "games", roomCode), gameData);

  // Create empty hands for each player — store full chip data privately
  const chipMap = new Map<string, TreasureChip>();
  for (const chip of chips) {
    chipMap.set(chip.id, chip);
  }

  for (const uid of playerIds) {
    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      carried: [],
      scored: [],
    } as DeepSeaHand);
  }

  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

// ---- Turn actions ----

/** Begin the active player's turn: reduce air by their carried count. */
export async function breatheAndAdvance(
  roomCode: string,
  game: DeepSeaGame
): Promise<void> {
  const uid = getActivePlayerUid(game);
  const diver = game.divers[uid];
  const newAir = Math.max(game.air - diver.carriedCount, 0);

  // Determine if player can/should declare direction
  // Auto-skip declaring if: already heading up, or heading down with no treasure
  const canDeclare =
    diver.direction === "down" && diver.carriedCount > 0;

  await updateDoc(doc(db, "games", roomCode), {
    air: newAir,
    status: canDeclare ? "declaring" : "rolling",
    lastAction:
      diver.carriedCount > 0
        ? `Air reduced by ${diver.carriedCount} (now ${newAir})`
        : null,
  });
}

/** Player declares whether to turn back toward the submarine. */
export async function declareDirection(
  roomCode: string,
  game: DeepSeaGame,
  turnBack: boolean,
  playerName: string
): Promise<void> {
  const uid = getActivePlayerUid(game);

  if (turnBack) {
    await updateDoc(doc(db, "games", roomCode), {
      [`divers.${uid}.direction`]: "up",
      status: "rolling",
      lastAction: `${playerName} turns back toward the submarine!`,
    });
  } else {
    await updateDoc(doc(db, "games", roomCode), {
      status: "rolling",
    });
  }
}

/** Roll dice, resolve movement, and advance to treasure-action or next turn. */
export async function rollAndMove(
  roomCode: string,
  game: DeepSeaGame,
  preRolledDice?: [number, number]
): Promise<void> {
  const uid = getActivePlayerUid(game);
  const diver = game.divers[uid];
  const dice = preRolledDice ?? rollDeepSeaDice();
  const steps = calculateMovement(dice, diver.carriedCount);
  const occupied = getOccupiedPositions(game.divers, uid);
  const newPos = resolveMovement(
    diver.position,
    steps,
    diver.direction,
    occupied,
    game.path.length
  );

  // Check if player returned to submarine
  if (newPos === -1) {
    // Player returned — move carried to scored
    const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
    const hand = handSnap.data() as DeepSeaHand;

    const newScored = [...hand.scored, ...hand.carried];
    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      carried: [],
      scored: newScored,
    } as DeepSeaHand);

    const newTotal = newScored.reduce((sum, c) => sum + c.points, 0);

    const updates: Record<string, unknown> = {
      [`divers.${uid}.position`]: -1,
      [`divers.${uid}.returned`]: true,
      [`divers.${uid}.carriedCount`]: 0,
      [`divers.${uid}.carriedLevels`]: [],
      [`scores.${uid}`]: newTotal,
      [`scoredThisRound.${uid}`]: hand.carried.map((c) => ({ level: c.level, points: c.points })),
      diceResult: dice,
      lastAction: `Rolled ${dice[0]}+${dice[1]}=${dice[0] + dice[1]}${diver.carriedCount > 0 ? ` - ${diver.carriedCount} carried` : ""} = ${steps} steps. Returned to the submarine!`,
    };

    // Check if round should end
    const shouldEndRound = checkRoundEnd(game, uid) || game.air <= 0;
    if (shouldEndRound) {
      updates.status = "round-end";
    } else {
      const nextTurn = findNextActiveTurn(game, game.currentTurn);
      updates.currentTurn = nextTurn!;
      updates.status = "round-start";
    }

    await updateDoc(doc(db, "games", roomCode), updates);
    return;
  }

  await updateDoc(doc(db, "games", roomCode), {
    [`divers.${uid}.position`]: newPos,
    diceResult: dice,
    status: "treasure-action",
    lastAction: `Rolled ${dice[0]}+${dice[1]}=${dice[0] + dice[1]}${diver.carriedCount > 0 ? ` - ${diver.carriedCount} carried` : ""} = ${steps} steps.`,
  });
}

/** Treasure action: pick up, drop, or do nothing. */
export async function treasureAction(
  roomCode: string,
  game: DeepSeaGame,
  action: "pickup" | "drop" | "nothing",
  dropChipIndex?: number
): Promise<void> {
  const uid = getActivePlayerUid(game);
  const diver = game.divers[uid];
  const pos = diver.position;

  const updates: Record<string, unknown> = {};

  if (action === "pickup") {
    const space = game.path[pos];
    if (space.type !== "treasure" && space.type !== "stack") return;

    // Get the chip(s) being picked up
    const chipIds =
      space.type === "stack" ? space.stackChipIds! : [space.chipId!];

    // Replace with blank on the path
    const newPath = [...game.path];
    newPath[pos] = { type: "blank" };
    updates.path = newPath;
    updates[`divers.${uid}.carriedCount`] = diver.carriedCount + 1; // stacks count as 1

    // Track the picked-up level publicly
    const pickedLevel = space.type === "treasure" ? space.level! : 0; // 0 for stacks
    updates[`divers.${uid}.carriedLevels`] = [
      ...diver.carriedLevels,
      ...(space.type === "stack" ? [0] : [pickedLevel]), // stacks show as generic
    ];

    // Move chip data to player's hand
    const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
    const hand = handSnap.data() as DeepSeaHand;

    // Look up the full chip data from all chips
    const allChips = generateTreasureChips();
    const chipMap = new Map(allChips.map((c) => [c.id, c]));
    const pickedChips = chipIds
      .map((id) => chipMap.get(id))
      .filter((c): c is TreasureChip => c != null);

    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      carried: [...hand.carried, ...pickedChips],
      scored: hand.scored,
    } as DeepSeaHand);

    updates.lastAction = `Picked up ${space.type === "stack" ? "a stack of treasures" : "a treasure"}!`;
  } else if (action === "drop") {
    const space = game.path[pos];
    if (space.type !== "blank") return;
    if (dropChipIndex === undefined) return;

    const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
    const hand = handSnap.data() as DeepSeaHand;
    if (dropChipIndex < 0 || dropChipIndex >= hand.carried.length) return;

    const droppedChip = hand.carried[dropChipIndex];
    const newCarried = hand.carried.filter((_, i) => i !== dropChipIndex);

    // Place chip back on path
    const newPath = [...game.path];
    newPath[pos] = {
      type: "treasure",
      level: droppedChip.level,
      chipId: droppedChip.id,
    };
    updates.path = newPath;
    updates[`divers.${uid}.carriedCount`] = diver.carriedCount - 1;

    // Remove the corresponding level from carriedLevels
    const newLevels = [...diver.carriedLevels];
    newLevels.splice(dropChipIndex, 1);
    updates[`divers.${uid}.carriedLevels`] = newLevels;

    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      carried: newCarried,
      scored: hand.scored,
    } as DeepSeaHand);

    updates.lastAction = "Dropped a treasure.";
  } else {
    updates.lastAction = null;
  }

  // Advance to next turn — don't pass uid; only rollAndMove passes justReturnedUid
  const shouldEndRound = checkRoundEnd(game) || game.air <= 0;
  if (shouldEndRound) {
    updates.status = "round-end";
  } else {
    const nextTurn = findNextActiveTurn(game, game.currentTurn);
    if (nextTurn === null) {
      updates.status = "round-end";
    } else {
      updates.currentTurn = nextTurn;
      updates.status = "round-start";
    }
  }

  await updateDoc(doc(db, "games", roomCode), updates);
}

/** Check if the round should end: all divers returned or no active players remain. */
function checkRoundEnd(
  game: DeepSeaGame,
  justReturnedUid?: string
): boolean {
  // Check if all divers have returned
  for (const [uid, diver] of Object.entries(game.divers)) {
    if (uid === justReturnedUid) continue; // this one just returned
    if (!diver.returned) return false;
  }
  return true;
}

// ---- Round end processing ----

/** Process round end: handle drowned players, stack their chips, compact path. */
export async function processRoundEnd(
  roomCode: string,
  game: DeepSeaGame
): Promise<void> {
  let newPath = [...game.path];

  // Find who drowned
  const drownedPlayers: { uid: string; position: number }[] = [];
  for (const [uid, diver] of Object.entries(game.divers)) {
    if (!diver.returned && diver.position >= 0) {
      drownedPlayers.push({ uid, position: diver.position });
    }
  }

  // Sort drowned players by position (closest to sub first)
  drownedPlayers.sort((a, b) => a.position - b.position);

  // Process each drowned player: stack their chips at end of path
  for (const { uid } of drownedPlayers) {
    const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
    const hand = handSnap.data() as DeepSeaHand;

    if (hand.carried.length > 0) {
      newPath = stackDroppedTreasures(newPath, hand.carried);
    }

    // Clear carried chips (drowned player loses them)
    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      carried: [],
      scored: hand.scored,
    } as DeepSeaHand);
  }

  // Compact path: remove blanks
  newPath = compactPath(newPath);

  // Prepare next round or finish
  const nextRound = game.round + 1;
  const isGameOver = nextRound > 3;

  if (isGameOver) {
    // Calculate final scores
    const finalScores: Record<string, number> = {};
    const finalTreasures: Record<string, { level: number; points: number }[]> = {};
    const tiebreaker: Record<string, number[]> = {};

    for (const uid of game.turnOrder) {
      const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
      const hand = handSnap.data() as DeepSeaHand;
      finalScores[uid] = hand.scored.reduce((sum, c) => sum + c.points, 0);
      finalTreasures[uid] = hand.scored.map((c) => ({ level: c.level, points: c.points }));
      const levelCounts = [0, 0, 0, 0];
      for (const chip of hand.scored) {
        levelCounts[chip.level - 1]++;
      }
      tiebreaker[uid] = levelCounts;
    }

    // Determine winner
    const sortedPlayers = [...game.turnOrder].sort((a, b) => {
      const scoreDiff = finalScores[b] - finalScores[a];
      if (scoreDiff !== 0) return scoreDiff;
      // Tiebreak: most high-level chips (check L4 first, then L3, etc.)
      for (let l = 3; l >= 0; l--) {
        const diff = tiebreaker[b][l] - tiebreaker[a][l];
        if (diff !== 0) return diff;
      }
      return 0;
    });

    await updateDoc(doc(db, "games", roomCode), {
      status: "finished",
      path: newPath,
      winner: sortedPlayers[0],
      finalScores,
      finalTreasures,
      tiebreaker,
    });
  } else {
    // Reset for next round
    const newDivers: Record<string, DeepSeaDiver> = {};
    for (const uid of game.turnOrder) {
      newDivers[uid] = {
        position: -1,
        direction: "down",
        carriedCount: 0,
        carriedLevels: [],
        returned: false,
      };
    }

    // Rotate turn order clockwise: next player in original order starts
    const newTurnOrder = [
      ...game.turnOrder.slice(1),
      game.turnOrder[0],
    ];

    await updateDoc(doc(db, "games", roomCode), {
      status: "round-start",
      round: nextRound,
      air: 25,
      path: newPath,
      divers: newDivers,
      turnOrder: newTurnOrder,
      currentTurn: 0,
      diceResult: null,
      lastAction: null,
      scoredThisRound: Object.fromEntries(game.turnOrder.map((uid) => [uid, []])),
    });
  }
}
