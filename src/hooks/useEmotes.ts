import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "./AuthContext";

export interface Emote {
  id: string;
  emoji: string;
  uid: string;
  playerName: string;
}

const DISPLAY_MS = 5000;
const RATE_LIMIT_MS = 1000;

export function useEmotes(roomCode: string | undefined) {
  const { uid, username } = useAuthContext();
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [canSend, setCanSend] = useState(true);
  const seenIds = useRef(new Set<string>());
  const lastSentAt = useRef(0);
  const mountedAt = useRef(Date.now());

  // Subscribe to emotes collection (no query filter — collection is ephemeral)
  useEffect(() => {
    if (!roomCode) return;
    mountedAt.current = Date.now();

    const emotesRef = collection(db, "games", roomCode, "emotes");

    const unsubscribe = onSnapshot(emotesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const docId = change.doc.id;
        if (seenIds.current.has(docId)) return;
        seenIds.current.add(docId);

        const data = change.doc.data();

        // Skip stale emotes loaded on initial snapshot
        const ts = data.timestamp as Timestamp | null;
        if (ts && ts.toMillis() < mountedAt.current - 5000) {
          // Old doc — just clean it up if we're the sender
          if (data.uid === uid) {
            deleteDoc(doc(db, "games", roomCode, "emotes", docId)).catch(() => {});
          }
          return;
        }

        const emote: Emote = {
          id: docId,
          emoji: data.emoji,
          uid: data.uid,
          playerName: data.playerName,
        };

        setEmotes((prev) => [...prev, emote]);

        // Remove from display after animation
        setTimeout(() => {
          setEmotes((prev) => prev.filter((e) => e.id !== docId));
        }, DISPLAY_MS);

        // Sender cleans up their own doc
        if (data.uid === uid) {
          setTimeout(() => {
            deleteDoc(doc(db, "games", roomCode, "emotes", docId)).catch(() => {});
          }, DISPLAY_MS + 500);
        }
      });
    });

    return () => {
      unsubscribe();
      seenIds.current.clear();
    };
  }, [roomCode, uid]);

  const sendEmote = useCallback(
    (emoji: string) => {
      if (!uid || !username || !roomCode) return;
      const now = Date.now();
      if (now - lastSentAt.current < RATE_LIMIT_MS) return;

      lastSentAt.current = now;
      setCanSend(false);
      setTimeout(() => setCanSend(true), RATE_LIMIT_MS);

      const emotesRef = collection(db, "games", roomCode, "emotes");
      addDoc(emotesRef, {
        emoji,
        uid,
        playerName: username,
        timestamp: Timestamp.now(),
      }).catch((err) => console.error("Failed to send emote:", err));
    },
    [roomCode, uid, username]
  );

  return { emotes, sendEmote, canSend };
}
