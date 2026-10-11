import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * End the current game and send the room back to the lobby.
 *
 * Hands are deleted by player id rather than by listing the subcollection: games with private
 * hands (Clover, Robotrick, Bomb Busters) don't let everyone list or read them. Listing is still
 * tried so stray docs (e.g. from players who left) get cleaned up when the rules allow it, and any
 * delete the rules refuse is skipped — the next deal overwrites those hands anyway.
 */
export async function clearGameData(roomCode: string): Promise<void> {
  const ids = new Set<string>();
  const room = await getDoc(doc(db, "rooms", roomCode));
  Object.keys((room.data()?.players as Record<string, unknown> | undefined) ?? {}).forEach((id) => ids.add(id));
  try {
    (await getDocs(collection(db, "games", roomCode, "hands"))).docs.forEach((hand) => ids.add(hand.id));
  } catch {
    // Not allowed to list private hands; the player ids above are enough.
  }
  await Promise.all([...ids].map((id) => deleteDoc(doc(db, "games", roomCode, "hands", id)).catch(() => undefined)));
  await deleteDoc(doc(db, "games", roomCode));
  await updateDoc(doc(db, "rooms", roomCode), { status: "lobby" });
}
