import { lazy, Suspense, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInWithCredential,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

const ProdFeedbackOverlay = lazy(() => import("./ProdFeedbackOverlay"));

// Allowlist lives in Firestore (config/devAccess.emails) and is enforced by firestore.rules;
// only allowlisted accounts can read that doc, so a successful read means access.
const DEV_ACCESS_DOC = doc(db, "config", "devAccess");

const signInStyle: React.CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: 12,
  zIndex: 10000,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
  fontSize: "0.8rem",
  color: "var(--ink-soft)",
};

type Access = "unknown" | "granted" | "denied";

function hasGoogleAccount(user: User | null): boolean {
  return Boolean(user?.providerData.some((provider) => provider.providerId === "google.com"));
}

async function checkAccess(): Promise<Access> {
  try {
    await getDoc(DEV_ACCESS_DOC);
    return "granted";
  } catch {
    return "denied";
  }
}

async function signInForDevMode(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  if (!current) return;
  try {
    // Link so the anonymous player identity (rooms, games) is kept.
    await linkWithPopup(current, provider);
  } catch (error) {
    // This Google account is already linked to another uid (e.g. another browser): switch to it.
    const credential = GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
    if ((error as { code?: string }).code === "auth/credential-already-in-use" && credential) {
      await signInWithCredential(auth, credential);
      return;
    }
    throw error;
  }
}

/** Production-only: shows the feedback overlay to allowlisted accounts. Invisible to everyone else. */
export default function DevModeGate() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checked, setChecked] = useState<{ uid: string; access: Access } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const wantsDevSignIn = new URLSearchParams(window.location.search).has("dev");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user || !hasGoogleAccount(user)) return;
    let isCurrent = true;
    void checkAccess().then((access) => {
      if (isCurrent) setChecked({ uid: user.uid, access });
    });
    return () => {
      isCurrent = false;
    };
  }, [user]);

  // Only trust a result checked for the account that's signed in now.
  const access: Access = user && hasGoogleAccount(user) && checked?.uid === user.uid ? checked.access : "unknown";

  if (access === "granted") {
    return (
      <Suspense fallback={null}>
        <ProdFeedbackOverlay />
      </Suspense>
    );
  }

  if (!wantsDevSignIn) return null;

  return (
    <div style={signInStyle} data-dev-feedback-overlay>
      {access === "denied" ? (
        <span>{user?.email} isn&apos;t on the dev allowlist.</span>
      ) : (
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          onClick={() => {
            setMessage(null);
            signInForDevMode().catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : "Sign-in failed.");
            });
          }}
        >
          Dev sign-in
        </button>
      )}
      {message && <span>{message}</span>}
    </div>
  );
}
