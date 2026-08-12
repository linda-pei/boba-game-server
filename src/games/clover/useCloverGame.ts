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

  const boards: Record<string, CloverBoard> = {};

  for (const uid of playerUids) {
    const tiles = generateCloverTiles(4);

    boards[uid] = {
      ownerUid: uid,
      tiles,
      placements: {},
      edgeWords: ["", "", "", ""],
      locked: false,
      scored: false,
      firstGuess: null,
      secondGuess: null,
    };
  }

  const gameDoc: CloverGame = {
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
  placements: Record<string, { slot: number; rotation: number }>,
  edgeWords: [string, string, string, string]
) {
  const gameRef = doc(db, "games", roomCode);

  await updateDoc(gameRef, {
    [`boards.${uid}.placements`]: placements,
    [`boards.${uid}.edgeWords`]: edgeWords,
    [`boards.${uid}.locked`]: true,
    [`boards.${uid}.firstGuess`]: null,
    [`boards.${uid}.secondGuess`]: null,
    lastAction: `${uid} locked their Clover board`,
  });

  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;

  const game = snap.data() as CloverGame;
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
  original: Record<string, { slot: number; rotation: number }>,
  guess: Record<string, { slot: number; rotation: number }>
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

export async function submitCloverFirstGuess(
  roomCode: string,
  ownerUid: string,
  guess: Record<string, { slot: number; rotation: number }>
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame;
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
  guess: Record<string, { slot: number; rotation: number }>
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return;

  const game = snap.data() as CloverGame;
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

  const game = snap.data() as CloverGame;

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
      { min: 10,  max: 11, label: "LEGENDARY" },
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
  await Promise.all(handsSnap.docs.map((handDoc: { ref: any; }) => deleteDoc(handDoc.ref)));

  await deleteDoc(doc(db, "games", roomCode));
  await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
}