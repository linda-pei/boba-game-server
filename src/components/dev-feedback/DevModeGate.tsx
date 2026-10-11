import { lazy, Suspense, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithRedirect,
  onIdTokenChanged,
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

const REDIRECT_ATTEMPT_KEY = "game-server:dev-signin-attempted";

function credentialFromError(error: unknown) {
  return GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
}

/** Completes a redirect sign-in started on a previous page load (no-op otherwise). */
async function finishRedirectSignIn(): Promise<void> {
  try {
    await getRedirectResult(auth);
  } catch (error) {
    // This Google account is already linked to another uid (e.g. another browser): switch to it.
    const credential = credentialFromError(error);
    if ((error as { code?: string }).code === "auth/credential-already-in-use" && credential) {
      await signInWithCredential(auth, credential);
      return;
    }
    throw error;
  }
}

/** Redirects to Google; linking (not signing in) keeps the anonymous player's uid, rooms and games. */
function startRedirectSignIn(user: User): Promise<never> {
  try {
    window.sessionStorage.setItem(REDIRECT_ATTEMPT_KEY, "1");
  } catch {
    // Without sessionStorage we can't guard against loops, but the redirect still works.
  }
  return linkWithRedirect(user, new GoogleAuthProvider());
}

function hasAttemptedRedirect(): boolean {
  try {
    return window.sessionStorage.getItem(REDIRECT_ATTEMPT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Production-only: shows the feedback overlay to allowlisted accounts. Invisible to everyone else. */
export default function DevModeGate() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  // Bumped on every token change: linking Google keeps the same User object (and doesn't fire
  // onAuthStateChanged), but it does issue a new ID token that now carries the email claim.
  const [tokenVersion, setTokenVersion] = useState(0);
  const [checked, setChecked] = useState<{ uid: string; access: Access } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [redirectSettled, setRedirectSettled] = useState(false);
  const wantsDevSignIn = new URLSearchParams(window.location.search).has("dev");

  // Finish any redirect sign-in we started before the page navigated away to Google.
  useEffect(() => {
    if (!wantsDevSignIn) return;
    finishRedirectSignIn()
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Sign-in failed."))
      .finally(() => setRedirectSettled(true));
  }, [wantsDevSignIn]);

  // ?dev with no Google account yet: go straight to Google (once per session, so failures can't loop).
  useEffect(() => {
    if (!wantsDevSignIn || !redirectSettled || !user || hasGoogleAccount(user) || hasAttemptedRedirect()) return;
    startRedirectSignIn(user).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    });
  }, [wantsDevSignIn, redirectSettled, user]);

  useEffect(() => onIdTokenChanged(auth, (nextUser) => {
    setUser(nextUser);
    setTokenVersion((version) => version + 1);
  }), []);

  useEffect(() => {
    if (!user || !hasGoogleAccount(user)) return;
    let isCurrent = true;
    void checkAccess().then((access) => {
      if (isCurrent) setChecked({ uid: user.uid, access });
    });
    return () => {
      isCurrent = false;
    };
  }, [user, tokenVersion]);

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
      ) : hasGoogleAccount(user) ? (
        <span>Checking dev access…</span>
      ) : message || hasAttemptedRedirect() ? (
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          onClick={() => {
            if (!user) return;
            setMessage(null);
            startRedirectSignIn(user).catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : "Sign-in failed.");
            });
          }}
        >
          Try dev sign-in again
        </button>
      ) : (
        <span>Signing in for dev mode…</span>
      )}
      {message && <span>{message}</span>}
    </div>
  );
}
