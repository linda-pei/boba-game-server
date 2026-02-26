import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
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
    maxPlayers: 6,
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
  uid: string,
  isHost: boolean
): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);

  if (isHost) {
    // Host leaves — delete the room
    await deleteDoc(roomRef);
  } else {
    await updateDoc(roomRef, {
      [`players.${uid}`]: deleteField(),
    });
  }
}

export async function updateRoomSettings(
  roomCode: string,
  settings: { numRings?: number; knower?: string }
): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);
  const updates: Record<string, unknown> = {};

  if (settings.numRings !== undefined) {
    updates["settings.numRings"] = settings.numRings;
  }
  if (settings.knower !== undefined) {
    updates["settings.knower"] = settings.knower;
  }

  await updateDoc(roomRef, updates);
}
