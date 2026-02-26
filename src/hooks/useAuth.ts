import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const USERNAME_KEY = "things-in-rings-username";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsernameState] = useState<string | null>(
    () => localStorage.getItem(USERNAME_KEY)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous sign-in failed:", err);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setUsername = async (name: string) => {
    localStorage.setItem(USERNAME_KEY, name);
    setUsernameState(name);

    if (user) {
      await setDoc(doc(db, "users", user.uid), { name }, { merge: true });
    }
  };

  return {
    uid: user?.uid ?? null,
    username,
    setUsername,
    loading,
  };
}
