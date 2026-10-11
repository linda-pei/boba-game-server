import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import type { FeedbackEntry, FeedbackImageUpload } from "./feedbackUtils";

export interface SubmittedFeedback extends FeedbackEntry {
  imageUploads?: FeedbackImageUpload[];
}

/** Where the overlay sends notes and how it learns which ones the agent finished. */
export interface FeedbackTransport {
  /** Short label shown in the overlay header. */
  label: string;
  submit(entry: SubmittedFeedback): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  /** Calls back with every resolved id; returns an unsubscribe function. */
  watchResolved(onResolved: (ids: Set<string>) => void): () => void;
}

// ---- Local dev server (vite middleware → .codex/dev-feedback.json) ----

export const localFeedbackTransport: FeedbackTransport = {
  label: "Local development tool",
  async submit(entry) {
    const response = await fetch("/__dev-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return response.ok;
  },
  async remove(id) {
    const response = await fetch(`/__dev-feedback?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return response.ok;
  },
  watchResolved(onResolved) {
    let isCurrent = true;
    const poll = async () => {
      try {
        const response = await fetch("/__dev-feedback");
        if (!response.ok) return;
        const queue: unknown = await response.json();
        const resolvedIds = (queue as { resolvedIds?: unknown })?.resolvedIds;
        if (isCurrent && Array.isArray(resolvedIds)) onResolved(new Set(resolvedIds as string[]));
      } catch {
        // The picker still works offline; a later poll will reconcile resolved notes.
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 3_000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  },
};

// ---- Production (Firestore devFeedback collection, gated by firestore.rules) ----

export const DEV_FEEDBACK_COLLECTION = "devFeedback";
// Firestore documents cap at 1 MiB; keep each stored image comfortably below that.
const MAX_STORED_IMAGE_CHARS = 900_000;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be decoded."));
    image.src = dataUrl;
  });
}

/** Re-encode as JPEG, shrinking until the data URL fits in one Firestore document. */
async function shrinkImage(upload: FeedbackImageUpload): Promise<FeedbackImageUpload> {
  if (upload.dataUrl.length <= MAX_STORED_IMAGE_CHARS) return upload;

  const image = await loadImage(upload.dataUrl);
  let scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    // JPEG has no alpha; paint white first so transparent areas don't turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length <= MAX_STORED_IMAGE_CHARS) {
      return { name: upload.name.replace(/\.\w+$/, "") + ".jpg", mimeType: "image/jpeg", dataUrl };
    }
    scale *= 0.75;
  }
  throw new Error("The image is too large to store.");
}

export const firestoreFeedbackTransport: FeedbackTransport = {
  label: "Production dev mode",
  async submit({ imageUploads = [], ...entry }) {
    try {
      const images = await Promise.all(imageUploads.map(shrinkImage));
      const feedbackRef = doc(db, DEV_FEEDBACK_COLLECTION, entry.id);
      const batch = writeBatch(db);
      batch.set(feedbackRef, {
        ...entry,
        status: "pending",
        imageCount: images.length,
        createdBy: auth.currentUser?.email ?? null,
        submittedAt: serverTimestamp(),
      });
      images.forEach((image, index) => {
        batch.set(doc(feedbackRef, "images", String(index)), image);
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Could not save dev feedback:", error);
      return false;
    }
  },
  async remove(id) {
    try {
      const feedbackRef = doc(db, DEV_FEEDBACK_COLLECTION, id);
      const images = await getDocs(collection(feedbackRef, "images"));
      await Promise.all(images.docs.map((image) => deleteDoc(image.ref)));
      await deleteDoc(feedbackRef);
      return true;
    } catch (error) {
      console.error("Could not remove dev feedback:", error);
      return false;
    }
  },
  watchResolved(onResolved) {
    const resolvedQuery = query(collection(db, DEV_FEEDBACK_COLLECTION), where("status", "==", "resolved"));
    return onSnapshot(
      resolvedQuery,
      (snapshot) => onResolved(new Set(snapshot.docs.map((item) => item.id))),
      (error) => console.error("Could not watch dev feedback:", error),
    );
  },
};

