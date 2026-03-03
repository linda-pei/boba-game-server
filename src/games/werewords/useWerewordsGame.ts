import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  WerewordsGame,
  WerewordsHand,
  WerewordsRole,
  Room,
} from "../../types";

// ---- Realtime listeners ----

export function useWerewordsGame(roomCode: string | undefined) {
  const [game, setGame] = useState<WerewordsGame | null>(null);
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
          setGame(snapshot.data() as WerewordsGame);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Werewords game listener error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { game, loading };
}

export function useWerewordsHand(
  roomCode: string | undefined,
  uid: string | null
) {
  const [hand, setHand] = useState<WerewordsHand | null>(null);

  useEffect(() => {
    if (!roomCode || !uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "games", roomCode, "hands", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setHand(snapshot.data() as WerewordsHand);
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

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRoleDeck(playerCount: number): WerewordsRole[] {
  // Exactly playerCount cards: 1 seer, N werewolves, rest villagers
  const werewolfCount = playerCount <= 6 ? 1 : 2;
  const villagerCount = playerCount - 1 - werewolfCount; // 1 seer
  const roles: WerewordsRole[] = [
    "seer",
    ...Array<WerewordsRole>(werewolfCount).fill("werewolf"),
    ...Array<WerewordsRole>(villagerCount).fill("villager"),
  ];
  return shuffled(roles);
}

// ---- Game actions ----

export async function startWerewordsGame(
  roomCode: string,
  room: Room
): Promise<void> {
  const playerUids = Object.keys(room.players);
  const turnOrder = shuffled(playerUids);
  const playerCount = playerUids.length;

  const roles = buildRoleDeck(playerCount);

  // Pick a random mayor — mayor is a designation, not a role card
  const mayorIndex = Math.floor(Math.random() * playerCount);
  const mayor = turnOrder[mayorIndex];

  // Deal one role card to each player
  const playerRoles: Record<string, WerewordsRole> = {};
  for (let i = 0; i < playerCount; i++) {
    playerRoles[turnOrder[i]] = roles[i];
  }

  // Identify werewolves so they know each other
  const werewolfUids = turnOrder.filter((uid) => playerRoles[uid] === "werewolf");

  // Write hands
  for (const uid of turnOrder) {
    const hand: WerewordsHand = {
      role: playerRoles[uid],
      fellowWerewolves:
        playerRoles[uid] === "werewolf"
          ? werewolfUids.filter((w) => w !== uid)
          : [],
    };
    await setDoc(doc(db, "games", roomCode, "hands", uid), hand);
  }

  const roleRevealed: Record<string, boolean> = {};
  for (const uid of turnOrder) {
    roleRevealed[uid] = false;
  }

  const gameDoc: WerewordsGame = {
    gameType: "werewords",
    status: "role-reveal",
    mayor,
    turnOrder,
    magicWord: "",
    guesses: {},
    soCloseUsed: false,
    wayOff: false,
    correctGuesser: null,
    werewolfGuess: null,
    votes: {},
    winner: null,
    winReason: null,
    roleRevealed,
    revealedRoles: null,
  };

  await setDoc(doc(db, "games", roomCode), gameDoc);
  await updateDoc(doc(db, "rooms", roomCode), { status: "in-progress" });
}

export async function confirmRoleReveal(
  roomCode: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    [`roleRevealed.${uid}`]: true,
  });

  const gameSnap = await getDoc(doc(db, "games", roomCode));
  if (!gameSnap.exists()) return;
  const game = gameSnap.data() as WerewordsGame;

  const allRevealed = game.turnOrder.every(
    (pid) => (pid === uid ? true : game.roleRevealed[pid])
  );
  if (allRevealed) {
    await updateDoc(doc(db, "games", roomCode), { status: "word-setup" });
  }
}

export async function submitMagicWord(
  roomCode: string,
  word: string
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    magicWord: word.trim().toLowerCase(),
    status: "in-progress",
  });
}

export async function addGuessResponse(
  roomCode: string,
  game: WerewordsGame,
  playerUid: string,
  response: "yes" | "no" | "maybe" | "so-close"
): Promise<void> {
  const current = game.guesses[playerUid] ?? [];
  const updates: Record<string, unknown> = {
    [`guesses.${playerUid}`]: [...current, response],
  };
  if (response === "so-close") {
    updates.soCloseUsed = true;
  }
  await updateDoc(doc(db, "games", roomCode), updates);
}

export async function markCorrect(
  roomCode: string,
  game: WerewordsGame,
  guesserUid: string
): Promise<void> {
  const current = game.guesses[guesserUid] ?? [];
  await updateDoc(doc(db, "games", roomCode), {
    [`guesses.${guesserUid}`]: [...current, "correct"],
    correctGuesser: guesserUid,
    status: "werewolf-guess",
  });
}

export async function markNoGuess(roomCode: string): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    status: "voting",
  });
}

export async function toggleWayOff(
  roomCode: string,
  current: boolean
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    wayOff: !current,
  });
}

async function buildRevealedRoles(
  roomCode: string,
  turnOrder: string[]
): Promise<Record<string, WerewordsRole>> {
  const revealed: Record<string, WerewordsRole> = {};
  for (const uid of turnOrder) {
    const handSnap = await getDoc(doc(db, "games", roomCode, "hands", uid));
    if (handSnap.exists()) {
      const hand = handSnap.data() as WerewordsHand;
      revealed[uid] = hand.role;
    }
  }
  return revealed;
}

function findSeer(
  revealedRoles: Record<string, WerewordsRole>
): string | null {
  for (const [uid, role] of Object.entries(revealedRoles)) {
    if (role === "seer") return uid;
  }
  return null;
}

export async function submitWerewolfGuess(
  roomCode: string,
  game: WerewordsGame,
  guessUid: string
): Promise<void> {
  const revealedRoles = await buildRevealedRoles(roomCode, game.turnOrder);
  const seerUid = findSeer(revealedRoles);

  const werewolfFoundSeer = guessUid === seerUid;
  const winner = werewolfFoundSeer ? "werewolves" : "villagers";
  const winReason = werewolfFoundSeer
    ? "The werewolf identified the Seer!"
    : "The werewolf failed to identify the Seer. Villagers win!";

  await updateDoc(doc(db, "games", roomCode), {
    werewolfGuess: guessUid,
    winner,
    winReason,
    revealedRoles,
    status: "finished",
  });
}

export async function submitVote(
  roomCode: string,
  game: WerewordsGame,
  uid: string,
  voteFor: string
): Promise<void> {
  await updateDoc(doc(db, "games", roomCode), {
    [`votes.${uid}`]: voteFor,
  });

  // Check if all votes are in
  const gameSnap = await getDoc(doc(db, "games", roomCode));
  if (!gameSnap.exists()) return;
  const updated = gameSnap.data() as WerewordsGame;

  const voteCount = Object.keys(updated.votes).length;
  const voterCount = updated.turnOrder.length;

  if (voteCount >= voterCount) {
    // Tally votes
    const tally: Record<string, number> = {};
    for (const votedFor of Object.values(updated.votes)) {
      tally[votedFor] = (tally[votedFor] ?? 0) + 1;
    }

    // Find player(s) with most votes
    let maxVotes = 0;
    for (const count of Object.values(tally)) {
      if (count > maxVotes) maxVotes = count;
    }
    const topVoted = Object.entries(tally)
      .filter(([, count]) => count === maxVotes)
      .map(([pid]) => pid);

    const revealedRoles = await buildRevealedRoles(roomCode, updated.turnOrder);

    // Check if any top-voted player is a werewolf
    const caughtWerewolf = topVoted.some((pid) => {
      return revealedRoles[pid] === "werewolf";
    });

    let winner: "villagers" | "werewolves";
    let winReason: string;

    if (topVoted.length > 1) {
      // Tie — werewolves win
      winner = "werewolves";
      winReason = "The vote was tied! Werewolves win!";
    } else if (caughtWerewolf) {
      winner = "villagers";
      winReason = "The village identified a werewolf! Villagers win!";
    } else {
      winner = "werewolves";
      winReason = "The village voted for an innocent player. Werewolves win!";
    }

    await updateDoc(doc(db, "games", roomCode), {
      winner,
      winReason,
      revealedRoles,
      status: "finished",
    });
  }
}
