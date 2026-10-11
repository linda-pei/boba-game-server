import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

/** Debugging snapshot attached to a feedback note: where it was taken and the live game state. */
export interface FeedbackContext {
  capturedAt: string;
  url: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  theme: "light" | "dark";
  userAgent: string;
  uid: string | null;
  roomCode: string | null;
  room?: unknown;
  game?: unknown;
  /** Only the submitter's own hand; other players' private docs aren't readable anyway. */
  hand?: unknown;
  errors?: string[];
}

// Keep the serialized snapshot well under Firestore's 1 MiB document limit.
const MAX_CONTEXT_CHARS = 300_000;

function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

async function readDoc(path: [string, ...string[]], errors: string[]): Promise<unknown> {
  try {
    const snapshot = await getDoc(doc(db, ...path));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    errors.push(`${path.join("/")}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function captureFeedbackContext(): Promise<FeedbackContext> {
  const uid = auth.currentUser?.uid ?? null;
  const roomCode = window.location.pathname.match(/^\/(?:game|lobby|join)\/([^/]+)/)?.[1] ?? null;
  const errors: string[] = [];

  const context: FeedbackContext = {
    capturedAt: new Date().toISOString(),
    url: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    theme: currentTheme(),
    userAgent: navigator.userAgent,
    uid,
    roomCode,
  };

  if (roomCode) {
    const [room, game, hand] = await Promise.all([
      readDoc(["rooms", roomCode], errors),
      readDoc(["games", roomCode], errors),
      uid ? readDoc(["games", roomCode, "hands", uid], errors) : Promise.resolve(undefined),
    ]);
    Object.assign(context, { room, game, hand });
  }
  if (errors.length > 0) context.errors = errors;

  // Drop the bulkiest parts rather than fail the note if a game doc is unexpectedly large.
  if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) {
    delete context.hand;
    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) delete context.game;
    context.errors = [...(context.errors ?? []), "Context truncated: game/hand omitted for size."];
  }
  return context;
}
