import { useState, useEffect } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { CloverGame, CloverBoard, Room } from "../../types";
import { generateCloverTiles } from "./tileDeck";
import { CLOVER_WORD_BANK } from "./words";

type CloverPlacement = { slot: number; rotation: number };
type CloverPlacementMap = Record<string, CloverPlacement>;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeDecoyTile(excludedWords: string[]) {
  const available = CLOVER_WORD_BANK.filter((word) => !excludedWords.includes(word));
  const word = available[Math.floor(Math.random() * available.length)] ?? "mystery";
  return {
    id: `decoy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    edges: [
      word,
      available[Math.floor(Math.random() * available.length)] ?? "focus",
      available[Math.floor(Math.random() * available.length)] ?? "skill",
      available[Math.floor(Math.random() * available.length)] ?? "route",
    ] as [string, string, string, string],
  };
}

export function useCloverGame(roomCode: string | undefined) {
  const [game, setGame] = useState<CloverGame | null>(null);
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
          setGame(snapshot.data() as CloverGame);
        } else {
          setGame(null);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export async function startCloverGame(roomCode: string, room: Room): Promise<void> {
  const playerUids = Object.keys(room.players);
  const turnOrder = [...playerUids].sort(() => Math.random() - 0.5);

  const boards: Record<string, CloverBoard & { decoyTile?: any; sharedGuess?: CloverPlacementMap; guessAttempts?: number }> = {};

  for (const uid of playerUids) {
    const tiles = generateCloverTiles(4);
    const excludedWords = tiles.flatMap((tile) => tile.edges);

    boards[uid] = {
      ownerUid: uid,
      tiles,
      placements: {},
      edgeWords: ["", "", "", ""],
      locked: false,
      scored: false,
      firstGuess: null,
      secondGuess: null,
      decoyTile: makeDecoyTile(excludedWords),
      sharedGuess: {},
      guessAttempts: 0,
    };
  }

  const gameDoc: CloverGame & { boards: Record<string, any> } = {
    gameType: "clover",
    status: "board-lock",
    round: 1,
    turnOrder,
    currentBoardOwner: turnOrder[0] ?? null,
    boards,
    boardOrder: [...playerUids],
    teamScore: 0,
    winner: null,
    lastBoardOwner: null,
    lastBoardScore: null,
    lastAction: "initial board setup created",
  };

  await setDoc(doc(db, "games", roomCode), gameDoc);

  for (const uid of playerUids) {
    await setDoc(doc(db, "games", roomCode, "hands", uid), {
      tiles: boards[uid].tiles,
    });
  }

  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

export async function submitCloverBoard(
  roomCode: string,
  uid: string,
  placements: Record<string, CloverPlacement>,
  edgeWords: [string, string, string, string]
) {
  const gameRef = doc(db, "games", roomCode);

  await updateDoc(gameRef, {
    [`boards.${uid}.placements`]: placements,
    [`boards.${uid}.edgeWords`]: edgeWords,
    [`boards.${uid}.locked`]: true,
    [`boards.${uid}.firstGuess`]: null,
    [`boards.${uid}.secondGuess`]: null,
    [`boards.${uid}.sharedGuess`]: {},
    [`boards.${uid}.guessAttempts`]: 0,
    lastAction: `${uid} locked their Clover board`,
  });

  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };
  const allLocked = Object.values(game.boards).every((board) => board.locked);

  if (allLocked) {
    const firstBoardOwner = game.boardOrder[0] ?? null;

    await updateDoc(gameRef, {
      status: "guessing",
      currentBoardOwner: firstBoardOwner,
      lastAction: "All boards locked. Guessing begins.",
    });
  }
}

export function compareCloverGuess(
  original: CloverPlacementMap,
  guess: CloverPlacementMap
): number {
  let correct = 0;

  for (const tileId of Object.keys(original)) {
    const originalPlacement = original[tileId];
    const guessPlacement = guess[tileId];

    if (!guessPlacement) continue;

    if (
      originalPlacement.slot === guessPlacement.slot &&
      originalPlacement.rotation === guessPlacement.rotation
    ) {
      correct += 1;
    }
  }

  return correct;
}

export async function submitSharedCloverGuess(
  roomCode: string,
  ownerUid: string,
  guess: CloverPlacementMap
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };
  const board = game.boards[ownerUid];
  const currentAttempts = Number(board?.guessAttempts ?? 0);

  await updateDoc(gameRef, {
    [`boards.${ownerUid}.sharedGuess`]: guess,
    [`boards.${ownerUid}.guessAttempts`]: currentAttempts + 1,
    lastAction: `Shared guess updated for ${ownerUid}`,
  });
}

export async function lockSharedCloverGuess(
  roomCode: string,
  ownerUid: string,
  guess: CloverPlacementMap
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };
  const board = game.boards[ownerUid];
  const original = board?.placements ?? {};
  const correctTiles = compareCloverGuess(original, guess);
  const attemptNumber = Number(board?.guessAttempts ?? 0);

  const isPerfect = correctTiles === 4;
  const isFinalAttempt = attemptNumber >= 2;

  if (isPerfect) {
    await updateDoc(gameRef, {
      teamScore: (game.teamScore ?? 0) + 6,
      [`boards.${ownerUid}.sharedGuess`]: guess,
      [`boards.${ownerUid}.scored`]: true,
      [`boards.${ownerUid}.firstGuess`]: guess,
      [`boards.${ownerUid}.secondGuess`]: guess,
      lastBoardOwner: ownerUid,
      lastBoardScore: 6,
      status: "round-end",
      lastAction: `ALL CORRECT! PERFECT SCORE OF 6!`,
    });
    return;
  }

  if (isFinalAttempt) {
    await updateDoc(gameRef, {
      teamScore: (game.teamScore ?? 0) + correctTiles,
      [`boards.${ownerUid}.sharedGuess`]: guess,
      [`boards.${ownerUid}.secondGuess`]: guess,
      [`boards.${ownerUid}.scored`]: true,
      lastBoardOwner: ownerUid,
      lastBoardScore: correctTiles,
      status: "round-end",
      lastAction: `WRONG! SCORED ${correctTiles}`,
    });
    return;
  }

  await updateDoc(gameRef, {
    [`boards.${ownerUid}.sharedGuess`]: guess,
    [`boards.${ownerUid}.firstGuess`]: guess,
    lastAction: `LAST ATTEMPT AT GUESSING ${ownerUid} BOARD`,
  });
}

export async function submitCloverFirstGuess(
  roomCode: string,
  ownerUid: string,
  guess: CloverPlacementMap
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };
  const original = game.boards[ownerUid]?.placements ?? {};
  const correctTiles = compareCloverGuess(original, guess);

  if (correctTiles === 4) {
    const earned = 6;

    await updateDoc(gameRef, {
      teamScore: (game.teamScore ?? 0) + earned,
      [`boards.${ownerUid}.firstGuess`]: guess,
      [`boards.${ownerUid}.scored`]: true,
      lastBoardOwner: ownerUid,
      lastBoardScore: earned,
      status: "round-end",
      lastAction: `Perfect match: +${earned} for ${ownerUid}`,
    });
    return;
  }

  await updateDoc(gameRef, {
    [`boards.${ownerUid}.firstGuess`]: guess,
    lastAction: `${ownerUid} missed on first try; second attempt available`,
  });
}

export async function submitCloverSecondGuess(
  roomCode: string,
  ownerUid: string,
  guess: CloverPlacementMap
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };
  const original = game.boards[ownerUid]?.placements ?? {};
  const correctTiles = compareCloverGuess(original, guess);

  await updateDoc(gameRef, {
    teamScore: (game.teamScore ?? 0) + correctTiles,
    [`boards.${ownerUid}.secondGuess`]: guess,
    [`boards.${ownerUid}.scored`]: true,
    lastBoardOwner: ownerUid,
    lastBoardScore: correctTiles,
    status: "round-end",
    lastAction: `${ownerUid} scored ${correctTiles} on second try`,
  });
}

export async function advanceCloverBoard(roomCode: string) {
  const ref = doc(db, "games", roomCode);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame & { boards: Record<string, any> };

  const nextOwner =
    game.boardOrder.find((uid) => !game.boards[uid]?.scored) ?? null;

  if (!nextOwner) {
    await updateDoc(ref, {
      status: "finished",
      winner: "team",
      lastBoardOwner: null,
      lastBoardScore: null,
      lastAction: "Clover game complete",
    });
    return;
  }

  await updateDoc(ref, {
    currentBoardOwner: nextOwner,
    status: "guessing",
    lastBoardOwner: null,
    lastBoardScore: null,
    lastAction: `Now guessing ${nextOwner}'s board`,
  });
}

export function getCloverScoreSummary(playerCount: number, score: number) {
  const thresholds: Record<number, Array<{ min: number; max: number | null; label: string }>> = {
    2: [
      { min: 12, max: 12, label: "PERFECT SCORE" },
      { min: 10, max: 11, label: "LEGENDARY" },
      { min: 8, max: 9, label: "GREAT GAME" },
      { min: 6, max: 7, label: "AVERAGE" },
      { min: 0, max: 5, label: "ROOM FOR GROWTH" },
    ],
    3: [
      { min: 18, max: 18, label: "PERFECT SCORE" },
      { min: 15, max: 17, label: "LEGENDARY" },
      { min: 13, max: 14, label: "GREAT GAME" },
      { min: 10, max: 12, label: "AVERAGE" },
      { min: 0, max: 9, label: "ROOM FOR GROWTH" },
    ],
    4: [
      { min: 24, max: 24, label: "PERFECT SCORE" },
      { min: 20, max: 23, label: "LEGENDARY" },
      { min: 17, max: 19, label: "GREAT GAME" },
      { min: 13, max: 16, label: "AVERAGE" },
      { min: 0, max: 12, label: "ROOM FOR GROWTH" },
    ],
    5: [
      { min: 30, max: 30, label: "PERFECT SCORE" },
      { min: 25, max: 29, label: "LEGENDARY" },
      { min: 21, max: 24, label: "GREAT GAME" },
      { min: 16, max: 20, label: "AVERAGE" },
      { min: 0, max: 15, label: "ROOM FOR GROWTH" },
    ],
    6: [
      { min: 36, max: 36, label: "PERFECT SCORE" },
      { min: 30, max: 35, label: "LEGENDARY" },
      { min: 25, max: 29, label: "GREAT GAME" },
      { min: 20, max: 24, label: "AVERAGE" },
      { min: 0, max: 19, label: "ROOM FOR GROWTH" },
    ],
  };

  const ranges = thresholds[playerCount] ?? thresholds[4];
  return ranges.find((range) => score >= range.min && (range.max === null || score <= range.max)) ?? ranges[ranges.length - 1];
}

export async function resetCloverGame(roomCode: string) {
  const handsSnap = await getDocs(collection(db, "games", roomCode, "hands"));
  await Promise.all(handsSnap.docs.map((handDoc: { ref: any }) => deleteDoc(handDoc.ref)));

  await deleteDoc(doc(db, "games", roomCode));
  await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
}