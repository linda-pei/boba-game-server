import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { generateRoomCode } from "../utils/roomCode";
import type { Room } from "../types";

export function useRoom(roomCode: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomCode),
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom(snapshot.data() as Room);
          setError(null);
        } else {
          setRoom(null);
          setError("Room not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Room listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomCode]);

  return { room, loading, error };
}

export async function createRoom(
  uid: string,
  username: string
): Promise<string> {
  const code = generateRoomCode();
  const roomRef = doc(db, "rooms", code);

  await setDoc(roomRef, {
    host: uid,
    status: "lobby",
    gameType: "things-in-rings",
    settings: { numRings: 3 },
    players: {
      [uid]: { name: username, order: 0 },
    },
    maxPlayers: 11,
    createdAt: serverTimestamp(),
  });

  return code;
}

export async function joinRoom(
  roomCode: string,
  uid: string,
  username: string
): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);

  // Use setDoc with merge so it works even if we're already in the room.
  // Validation (room exists, not full, in lobby) will be enforced by security rules.
  await updateDoc(roomRef, {
    [`players.${uid}`]: { name: username, order: Date.now() },
  });
}

export async function leaveRoom(
  roomCode: string,
  uid: string
): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);
  const snapshot = await getDoc(roomRef);
  if (!snapshot.exists()) return;

  const room = snapshot.data() as Room;
  const remainingUids = Object.keys(room.players).filter((id) => id !== uid);

  if (remainingUids.length === 0) {
    // Last player — delete the room
    await deleteDoc(roomRef);
  } else {
    const updates: Record<string, unknown> = {
      [`players.${uid}`]: deleteField(),
    };
    // If the leaving player is the host, transfer host to another player
    if (room.host === uid) {
      updates.host = remainingUids[0];
    }
    await updateDoc(roomRef, updates);
  }
}

export async function updateRoomSettings(
  roomCode: string,
  settings: { numRings?: number; knower?: string; mode?: "competitive" | "coop"; gameType?: string; deckId?: string; limitedTokens?: boolean; difficulty?: string; timerMinutes?: number; mayor?: string }
): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);
  const updates: Record<string, unknown> = {};

  if (settings.numRings !== undefined) {
    updates["settings.numRings"] = settings.numRings;
  }
  if (settings.knower !== undefined) {
    updates["settings.knower"] = settings.knower;
  }
  if (settings.mode !== undefined) {
    updates["settings.mode"] = settings.mode;
  }
  if (settings.gameType !== undefined) {
    updates["gameType"] = settings.gameType;
  }
  if (settings.deckId !== undefined) {
    updates["settings.deckId"] = settings.deckId;
  }
  if (settings.limitedTokens !== undefined) {
    updates["settings.limitedTokens"] = settings.limitedTokens;
  }
  if (settings.difficulty !== undefined) {
    updates["settings.difficulty"] = settings.difficulty;
  }
  if (settings.timerMinutes !== undefined) {
    updates["settings.timerMinutes"] = settings.timerMinutes;
  }
  if (settings.mayor !== undefined) {
    updates["settings.mayor"] = settings.mayor;
  }

  await updateDoc(roomRef, updates);
}
