import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  CloverClueZone,
  CloverGame,
  CloverPlacement,
  CloverPrivateBoard,
  CloverSharedRound,
  Room,
} from "../../types";
import { shuffled } from "../../utils/shuffle";
import { createCloverDeck } from "./cards";
import {
  evaluateCloverGuess,
  getCloverScore,
  getNextCloverPlayer,
  hasValidCloverClues,
  isCompleteCloverPlacement,
  randomCloverRotations,
} from "./engine";

const EMPTY_CLUES: Record<CloverClueZone, string> = {
  top: "",
  right: "",
  bottom: "",
  left: "",
};

export function useCloverGame(roomCode: string | undefined) {
  const [game, setGame] = useState<CloverGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;

    return onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      setGame(snapshot.exists() ? (snapshot.data() as CloverGame) : null);
      setLoading(false);
    });
  }, [roomCode]);

  return { game, loading };
}

export function useCloverPrivateBoard(roomCode: string | undefined, uid: string | null) {
  const [board, setBoard] = useState<CloverPrivateBoard | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    return onSnapshot(doc(db, "games", roomCode, "hands", uid), (snapshot) => {
      setBoard(snapshot.exists() ? (snapshot.data() as CloverPrivateBoard) : null);
    });
  }, [roomCode, uid]);

  return board;
}

export async function startCloverGame(roomCode: string, room: Room): Promise<void> {
  const playerOrder = Object.entries(room.players)
    .sort(([, first], [, second]) => first.order - second.order)
    .map(([uid]) => uid);

  if (playerOrder.length < 3 || playerOrder.length > 6) {
    throw new Error("Clover requires 3–6 players.");
  }

  const deck = createCloverDeck(roomCode, playerOrder.length * 5);
  const batch = writeBatch(db);
  const game: CloverGame = {
    gameType: "clover",
    phase: "clue-writing",
    playerOrder,
    activeSpectatorUid: null,
    activeDecisionMakerUid: null,
    submittedClueUids: [],
    completedSpectatorUids: [],
    publishedRounds: {},
    activeRound: null,
    teamScore: 0,
    boardResults: {},
    lastAction: "Everyone is creating their secret Clover.",
  };

  batch.set(doc(db, "games", roomCode), game);

  playerOrder.forEach((uid, index) => {
    const candidateCards = shuffled(deck.slice(index * 5, index * 5 + 5));
    const board: CloverPrivateBoard = {
      ownerUid: uid,
      sourceCards: candidateCards.slice(0, 4),
      candidateCards,
      answerPlacement: {},
      clues: EMPTY_CLUES,
      submittedAt: null,
    };
    batch.set(doc(db, "games", roomCode, "hands", uid), board);
  });

  batch.update(doc(db, "rooms", roomCode), { status: "in-progress" });
  await batch.commit();
}

export async function submitCloverClues(
  roomCode: string,
  uid: string,
  placement: Record<string, CloverPlacement>,
  clues: Record<CloverClueZone, string>,
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const boardRef = doc(db, "games", roomCode, "hands", uid);

  await runTransaction(db, async (transaction) => {
    const [gameSnapshot, boardSnapshot] = await Promise.all([
      transaction.get(gameRef),
      transaction.get(boardRef),
    ]);
    if (!gameSnapshot.exists() || !boardSnapshot.exists()) throw new Error("Clover game not found.");

    const game = gameSnapshot.data() as CloverGame;
    const board = boardSnapshot.data() as CloverPrivateBoard;
    if (game.phase !== "clue-writing") throw new Error("Clue writing is closed.");
    if (!game.playerOrder.includes(uid)) throw new Error("You are not in this game.");
    if (game.submittedClueUids.includes(uid)) throw new Error("Your clues are already locked.");
    if (!isCompleteCloverPlacement(placement, board.sourceCards)) {
      throw new Error("Place all four cards before locking your clues.");
    }
    if (!hasValidCloverClues(clues)) {
      throw new Error("Each clue must be one non-empty word (up to 40 characters).");
    }

    const submittedClueUids = [...game.submittedClueUids, uid];
    const publishedRounds = {
      ...game.publishedRounds,
      [uid]: {
        spectatorUid: uid,
        clues,
        // Shuffle and pre-rotate once so every player sees the same tray, and the
        // dealt order/orientation doesn't hint at the decoy or the answer.
        candidateCards: shuffled(board.candidateCards),
        trayRotations: randomCloverRotations(board.candidateCards),
      },
    };
    const allSubmitted = submittedClueUids.length === game.playerOrder.length;
    const firstSpectatorUid = game.playerOrder[0] ?? null;
    const firstRound = firstSpectatorUid ? publishedRounds[firstSpectatorUid] : null;
    const activeRound: CloverSharedRound | null = allSubmitted && firstRound
      ? {
        ...firstRound,
        sharedPlacement: {},
        lockedCorrectCardIds: [],
        attempt: 1,
        isLockedForVerification: false,
      }
      : null;

    transaction.update(boardRef, {
      answerPlacement: placement,
      clues,
      submittedAt: Date.now(),
    });
    transaction.update(gameRef, {
      submittedClueUids,
      publishedRounds,
      phase: allSubmitted ? "solving-first" : "clue-writing",
      activeSpectatorUid: allSubmitted ? firstSpectatorUid : null,
      activeDecisionMakerUid: allSubmitted && firstSpectatorUid
        ? getNextCloverPlayer(game.playerOrder, firstSpectatorUid)
        : null,
      activeRound,
      lastAction: allSubmitted
        ? "All Clovers are ready. The first resolution begins."
        : "A player locked their clues.",
    });
  });
}

export async function placeCloverGuessCard(
  roomCode: string,
  uid: string,
  cardId: string,
  placement: CloverPlacement | null,
): Promise<void> {
  const gameRef = doc(db, "games", roomCode);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists()) throw new Error("Clover game not found.");
    const game = snapshot.data() as CloverGame;
    const round = game.activeRound;
    if (!round || (game.phase !== "solving-first" && game.phase !== "solving-final")) {
      throw new Error("There is no Clover board to solve.");
    }
    if (game.activeDecisionMakerUid !== uid) throw new Error("Only the decision-maker can move cards.");
    if (round.isLockedForVerification) throw new Error("The spectator is verifying this guess.");
    if (round.lockedCorrectCardIds.includes(cardId)) throw new Error("Correct cards stay locked in place.");
    if (!round.candidateCards.some((card) => card.id === cardId)) throw new Error("This card is not a candidate.");
    if (placement && round.lockedCorrectCardIds.some((lockedId) => round.sharedPlacement[lockedId]?.slot === placement.slot)) {
      throw new Error("That slot is already locked.");
    }

    const sharedPlacement = { ...round.sharedPlacement };
    delete sharedPlacement[cardId];
    if (placement) {
      Object.entries(sharedPlacement).forEach(([placedCardId, placedCard]) => {
        if (placedCard.slot === placement.slot && !round.lockedCorrectCardIds.includes(placedCardId)) {
          delete sharedPlacement[placedCardId];
        }
      });
      sharedPlacement[cardId] = placement;
    }

    transaction.update(gameRef, {
      "activeRound.sharedPlacement": sharedPlacement,
      lastAction: "The shared Clover board changed.",
    });
  });
}

export async function lockCloverGuess(roomCode: string, uid: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists()) throw new Error("Clover game not found.");
    const game = snapshot.data() as CloverGame;
    const round = game.activeRound;
    if (!round || (game.phase !== "solving-first" && game.phase !== "solving-final")) {
      throw new Error("There is no Clover board to lock.");
    }
    if (game.activeDecisionMakerUid !== uid) throw new Error("Only the decision-maker can lock the guess.");
    if (!isCompleteCloverPlacement(round.sharedPlacement, round.candidateCards)) {
      throw new Error("Place four cards before locking the guess.");
    }

    transaction.update(gameRef, {
      "activeRound.isLockedForVerification": true,
      lastAction: "The team locked its guess for verification.",
    });
  });
}

export async function verifyCloverGuess(roomCode: string, spectatorUid: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);
  const boardRef = doc(db, "games", roomCode, "hands", spectatorUid);

  await runTransaction(db, async (transaction) => {
    const [gameSnapshot, boardSnapshot] = await Promise.all([
      transaction.get(gameRef),
      transaction.get(boardRef),
    ]);
    if (!gameSnapshot.exists() || !boardSnapshot.exists()) throw new Error("Clover game not found.");
    const game = gameSnapshot.data() as CloverGame;
    const board = boardSnapshot.data() as CloverPrivateBoard;
    const round = game.activeRound;
    if (!round || game.activeSpectatorUid !== spectatorUid) throw new Error("This is not your Clover to verify.");
    if (game.phase !== "solving-first" && game.phase !== "solving-final") throw new Error("This board is not ready to verify.");
    if (!round.isLockedForVerification) throw new Error("The team has not locked its guess yet.");
    if (!isCompleteCloverPlacement(round.sharedPlacement, round.candidateCards)) {
      throw new Error("Four cards must be placed before verification.");
    }

    const evaluation = evaluateCloverGuess(board.answerPlacement, round.sharedPlacement);
    if (game.phase === "solving-first" && !evaluation.isPerfect) {
      const sharedPlacement = Object.fromEntries(
        evaluation.correctCardIds.map((cardId) => [cardId, round.sharedPlacement[cardId]]),
      );
      transaction.update(gameRef, {
        phase: "solving-final",
        "activeRound.sharedPlacement": sharedPlacement,
        "activeRound.lockedCorrectCardIds": evaluation.correctCardIds,
        "activeRound.attempt": 2,
        "activeRound.isLockedForVerification": false,
        lastAction: "Incorrect cards were removed. The team has one final attempt.",
      });
      return;
    }

    const score = getCloverScore(evaluation, round.attempt);
    transaction.update(gameRef, {
      phase: "board-result",
      teamScore: game.teamScore + score,
      completedSpectatorUids: [...game.completedSpectatorUids, spectatorUid],
      boardResults: {
        ...game.boardResults,
        [spectatorUid]: {
          score,
          firstAttemptPerfect: round.attempt === 1 && evaluation.isPerfect,
          correctCardIds: evaluation.correctCardIds,
        },
      },
      lastAction: round.attempt === 1 && evaluation.isPerfect
        ? "Perfect first attempt! +6 points."
        : `Board resolved for ${score} point${score === 1 ? "" : "s"}.`,
    });
  });
}

export async function advanceCloverRound(roomCode: string, uid: string): Promise<void> {
  const gameRef = doc(db, "games", roomCode);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists()) throw new Error("Clover game not found.");
    const game = snapshot.data() as CloverGame;
    if (game.phase !== "board-result") throw new Error("The current Clover has not been resolved.");
    if (uid !== game.activeDecisionMakerUid) throw new Error("Only the decision-maker can continue.");

    const nextSpectatorUid = game.playerOrder.find((playerUid) => !game.completedSpectatorUids.includes(playerUid)) ?? null;
    if (!nextSpectatorUid) {
      transaction.update(gameRef, {
        phase: "finished",
        activeSpectatorUid: null,
        activeDecisionMakerUid: null,
        activeRound: null,
        lastAction: "Every Clover has been resolved.",
      });
      return;
    }

    const publishedRound = game.publishedRounds[nextSpectatorUid];
    if (!publishedRound) throw new Error("The next Clover is unavailable.");
    transaction.update(gameRef, {
      phase: "solving-first",
      activeSpectatorUid: nextSpectatorUid,
      activeDecisionMakerUid: getNextCloverPlayer(game.playerOrder, nextSpectatorUid),
      activeRound: {
        ...publishedRound,
        sharedPlacement: {},
        lockedCorrectCardIds: [],
        attempt: 1,
        isLockedForVerification: false,
      },
      lastAction: "The next Clover is ready to solve.",
    });
  });
}
