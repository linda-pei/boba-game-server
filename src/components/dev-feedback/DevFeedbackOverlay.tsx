import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { type FeedbackEntry, type FeedbackImageUpload, type FeedbackTarget, getFeedbackTarget } from "./feedbackUtils";
import { captureFeedbackContext, type FeedbackContext } from "./feedbackContext";
import { type FeedbackTransport, localFeedbackTransport } from "./feedbackTransport";
import "./dev-feedback.css";

const FEEDBACK_STORAGE_KEY = "game-server:dev-feedback";
const MAX_SAVED_FEEDBACK = 12;
const MAX_IMAGE_UPLOADS = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

interface LocalFeedbackEntry extends FeedbackEntry {
  queuedAt?: string;
  imageUploads?: FeedbackImageUpload[];
  context?: FeedbackContext;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isOverlayElement(element: Element): boolean {
  return Boolean(element.closest("[data-dev-feedback-overlay]"));
}

function isInspectableElement(element: Element): boolean {
  return !isOverlayElement(element)
    && element !== document.documentElement
    && element !== document.body
    && element.id !== "root";
}

function getRect(element: Element): HighlightRect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function loadSavedFeedback(): LocalFeedbackEntry[] {
  try {
    const saved = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!saved) return [];
    const value: unknown = JSON.parse(saved);
    return Array.isArray(value) ? value.slice(0, MAX_SAVED_FEEDBACK) as LocalFeedbackEntry[] : [];
  } catch {
    return [];
  }
}

/**
 * localStorage is ~5 MB per origin, and screenshots can exceed that. Try the full notes first;
 * if the quota is hit, keep the notes but drop their image data (already-queued images live
 * in the queue; unsent ones would need re-attaching after a reload).
 */
function saveFeedbackLocally(items: LocalFeedbackEntry[]): void {
  try {
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
    return;
  } catch {
    // Fall through to the image-free copy.
  }
  try {
    const withoutImages = items.map((item) => ({ ...item, imageUploads: undefined, context: undefined }));
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(withoutImages));
  } catch {
    // Storage unavailable (private mode, blocked site data); notes stay in memory only.
  }
}

function readImageUpload(file: File): Promise<FeedbackImageUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The image could not be read."));
        return;
      }
      resolve({ name: file.name, mimeType: file.type, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * `crypto.randomUUID` only exists in secure contexts (https or localhost), so a teammate opening the
 * dev server by LAN IP would fail to submit. `getRandomValues` works everywhere.
 */
function newFeedbackId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function DevFeedbackOverlay({ transport = localFeedbackTransport }: { transport?: FeedbackTransport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<FeedbackTarget | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [instruction, setInstruction] = useState("");
  const [imageUploads, setImageUploads] = useState<FeedbackImageUpload[]>([]);
  const [savedFeedback, setSavedFeedback] = useState<LocalFeedbackEntry[]>(loadSavedFeedback);
  const [viewingFeedback, setViewingFeedback] = useState<LocalFeedbackEntry | null>(null);
  const [removingFeedbackId, setRemovingFeedbackId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveFeedbackLocally(savedFeedback);
  }, [savedFeedback]);

  // Mirror of savedFeedback so the resolved watcher can tell which notes it just cleared.
  const savedFeedbackRef = useRef(savedFeedback);
  useEffect(() => {
    savedFeedbackRef.current = savedFeedback;
  }, [savedFeedback]);

  useEffect(() => transport.watchResolved((resolvedIds) => {
    const isResolved = (item: LocalFeedbackEntry) => Boolean(item.queuedAt && resolvedIds.has(item.id));
    const resolved = savedFeedbackRef.current.filter(isResolved);
    if (resolved.length === 0) return;
    setSavedFeedback((items) => items.filter((item) => !isResolved(item)));
    // Replace the stale "Queued…" message so it's clear the note was handled.
    setStatus(resolved.length === 1 ? `Resolved: ${resolved[0].instruction}` : `${resolved.length} notes resolved.`);
  }), [transport]);

  useEffect(() => {
    const unqueuedFeedback = savedFeedback.filter((entry) => !entry.queuedAt);
    if (unqueuedFeedback.length === 0) return;

    let isCurrent = true;
    const flushLocalOutbox = async () => {
      const results = await Promise.all(unqueuedFeedback.map(async (entry) => ({
        id: entry.id,
        queued: await transport.submit(entry).catch(() => false),
      })));
      if (!isCurrent) return;

      const queuedIds = new Set(results.filter((result) => result.queued).map((result) => result.id));
      if (queuedIds.size > 0) {
        setSavedFeedback((items) => items.map((item) => (
          queuedIds.has(item.id) ? { ...item, queuedAt: new Date().toISOString() } : item
        )));
      }
    };

    void flushLocalOutbox();
    return () => {
      isCurrent = false;
    };
  }, [savedFeedback, transport]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        if (isPicking) {
          setIsPicking(false);
          setHoveredElement(null);
          setHighlightRect(null);
        } else {
          setIsOpen(false);
        }
        return;
      }

      if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey || isEditableElement(event.target)) return;
      event.preventDefault();
      if (isOpen) {
        setIsOpen(false);
        setIsPicking(false);
        setHighlightRect(null);
      } else {
        setIsOpen(true);
        setIsPicking(true);
        setSelectedTarget(null);
        setInstruction("");
        setImageUploads([]);
        setStatus(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPicking]);

  useEffect(() => {
    if (!isPicking) return;

    const updateHighlight = (element: Element | null) => {
      setHoveredElement(element);
      setHighlightRect(element ? getRect(element) : null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (eventTarget && !isInspectableElement(eventTarget)) {
        updateHighlight(null);
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element || !isInspectableElement(element)) {
        updateHighlight(null);
        return;
      }
      if (element !== hoveredElement) updateHighlight(element);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !isInspectableElement(target)) {
        updateHighlight(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      updateHighlight(target);
      setSelectedTarget(getFeedbackTarget(target));
      setIsPicking(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const handleViewportChange = () => {
      if (hoveredElement?.isConnected) setHighlightRect(getRect(hoveredElement));
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [hoveredElement, isPicking]);

  const startPicking = () => {
    setIsPicking(true);
    setSelectedTarget(null);
    setInstruction("");
    setImageUploads([]);
    setStatus(null);
  };

  const sendFeedback = async (entry: LocalFeedbackEntry): Promise<boolean> => {
    try {
      if (!await transport.submit(entry)) throw new Error("The feedback queue rejected this note.");
      setSavedFeedback((items) => items.map((item) => (
        item.id === entry.id ? { ...item, queuedAt: new Date().toISOString() } : item
      )));
      setStatus("Queued for the agent. This note disappears once the work is resolved.");
      return true;
    } catch {
      setStatus("Saved in this browser, but the agent queue is unavailable. Try again shortly.");
      return false;
    }
  };

  const removeFeedback = async (entry: LocalFeedbackEntry) => {
    try {
      if (entry.queuedAt && !await transport.remove(entry.id)) {
        throw new Error("The feedback queue rejected the deletion.");
      }
      setSavedFeedback((items) => items.filter((item) => item.id !== entry.id));
      setViewingFeedback((current) => current?.id === entry.id ? null : current);
      setRemovingFeedbackId(null);
      setStatus("Feedback removed from the queue.");
    } catch {
      setStatus("Could not remove that feedback from the agent queue. Try again shortly.");
    }
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTarget || !instruction.trim()) return;

    const context = await captureFeedbackContext().catch(() => undefined);
    const entry: LocalFeedbackEntry = {
      id: newFeedbackId(),
      createdAt: new Date().toISOString(),
      instruction: instruction.trim(),
      target: selectedTarget,
      imageUploads: imageUploads.length > 0 ? imageUploads : undefined,
      context,
    };

    setSavedFeedback((items) => [...items, entry].slice(-MAX_SAVED_FEEDBACK));
    await sendFeedback(entry);
    setInstruction("");
    setImageUploads([]);
  };

  const selectImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => SUPPORTED_IMAGE_TYPES.has(file.type));
    if (imageFiles.length !== files.length) {
      setStatus("Use PNG, JPEG, WebP, or GIF images.");
      return;
    }

    const totalSize = imageUploads.reduce((sum, image) => sum + Math.ceil((image.dataUrl.length * 3) / 4), 0)
      + imageFiles.reduce((sum, file) => sum + file.size, 0);
    if (imageUploads.length + imageFiles.length > MAX_IMAGE_UPLOADS || imageFiles.some((file) => file.size > MAX_IMAGE_BYTES) || totalSize > MAX_TOTAL_IMAGE_BYTES) {
      setStatus("Attach up to 3 images, 2 MB each (5 MB total).");
      return;
    }

    try {
      const uploads = await Promise.all(imageFiles.map(readImageUpload));
      setImageUploads((current) => [...current, ...uploads]);
      setStatus(`${uploads.length} screenshot${uploads.length === 1 ? "" : "s"} attached.`);
    } catch {
      setStatus("One of the images could not be read.");
    }
  };

  if (!isOpen) {
    return (
      <button
        className="dev-feedback-launcher"
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsPicking(true);
          setHighlightRect(null);
          setStatus(null);
        }}
        onPointerEnter={() => setHighlightRect(null)}
        aria-label="Open development feedback picker"
        data-dev-feedback-overlay
      >
        Feedback <kbd>F</kbd>
      </button>
    );
  }

  return (
    <div className="dev-feedback-root" data-dev-feedback-overlay>
      {highlightRect && (
        <div
          className="dev-feedback-highlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
          aria-hidden="true"
        />
      )}

      <aside
        className="dev-feedback-panel"
        aria-label="Development feedback"
        onPointerEnter={() => {
          setHoveredElement(null);
          setHighlightRect(null);
        }}
      >
        <div className="dev-feedback-heading">
          <div>
            <p className="dev-feedback-kicker">{transport.label}</p>
            <h2>Give the agent a UI note</h2>
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>

        {isPicking ? (
          <div className="dev-feedback-picker-copy" aria-live="polite">
            <strong>Pick an element</strong>
            <p>Hover to inspect it, then click. Page interactions are paused while you choose.</p>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsPicking(false)}>
              Cancel selection
            </button>
          </div>
        ) : selectedTarget ? (
          <form className="dev-feedback-form" onSubmit={submitFeedback}>
            <div className="dev-feedback-target">
              <span>Selected</span>
              <code>{selectedTarget.selector}</code>
              {(selectedTarget.label || selectedTarget.text) && <p>{selectedTarget.label || selectedTarget.text}</p>}
            </div>
            <label htmlFor="dev-feedback-instruction">What should the agent change?</label>
            <textarea
              id="dev-feedback-instruction"
              ref={textareaRef}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="For example: make this easier to tap on a phone and keep the game’s visual style."
              rows={4}
              required
            />
            <div className="dev-feedback-attachments">
              <div className="dev-feedback-attachments__heading">
                <label htmlFor="dev-feedback-images">Screenshots <span>(optional)</span></label>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => imageInputRef.current?.click()}>
                  Add images
                </button>
              </div>
              <input
                ref={imageInputRef}
                id="dev-feedback-images"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={(event) => void selectImages(event)}
                hidden
              />
              {imageUploads.length > 0 && (
                <div className="dev-feedback-image-list">
                  {imageUploads.map((image, index) => (
                    <div className="dev-feedback-image" key={`${image.name}-${index}`}>
                      <img src={image.dataUrl} alt={`Attachment preview: ${image.name}`} />
                      <button type="button" onClick={() => setImageUploads((current) => current.filter((_, imageIndex) => imageIndex !== index))}>
                        Remove {image.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="dev-feedback-actions">
              <button className="btn btn--secondary btn--sm" type="button" onClick={startPicking}>
                Pick another
              </button>
              <button className="btn btn--primary btn--sm" type="submit">
                Send feedback
              </button>
            </div>
          </form>
        ) : (
          <div className="dev-feedback-picker-copy">
            <p>Select an element whenever you are ready.</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={startPicking}>
              Pick an element
            </button>
          </div>
        )}

        {status && <p className="dev-feedback-status" role="status">{status}</p>}

        {viewingFeedback && (
          <section className="dev-feedback-detail" aria-label="Feedback details">
            <div className="dev-feedback-detail__heading">
              <p>Queued feedback</p>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setViewingFeedback(null)}>Back</button>
            </div>
            <p className="dev-feedback-detail__instruction">{viewingFeedback.instruction}</p>
            <code>{viewingFeedback.target.selector}</code>
            {(viewingFeedback.target.label || viewingFeedback.target.text) && <p>{viewingFeedback.target.label || viewingFeedback.target.text}</p>}
            {viewingFeedback.imageUploads && viewingFeedback.imageUploads.length > 0 && (
              <div className="dev-feedback-image-list">
                {viewingFeedback.imageUploads.map((image, index) => <img key={`${image.name}-${index}`} src={image.dataUrl} alt={`Attachment: ${image.name}`} />)}
              </div>
            )}
            {!viewingFeedback.queuedAt && (
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => void sendFeedback(viewingFeedback)}>Send to agent</button>
            )}
          </section>
        )}

        {savedFeedback.length > 0 && (
          <section className="dev-feedback-history" aria-label="Saved feedback">
            <p>Local feedback ({savedFeedback.length})</p>
            {savedFeedback.slice(0, 3).map((entry) => (
              <div className="dev-feedback-history__item" key={entry.id}>
                <button className="dev-feedback-history__note" type="button" onClick={() => setViewingFeedback(entry)} title={entry.instruction}>
                  {entry.queuedAt ? "Queued · " : "Not sent · "}{entry.instruction}
                </button>
                {removingFeedbackId === entry.id ? (
                  <span className="dev-feedback-history__remove-confirm">
                    <button type="button" onClick={() => void removeFeedback(entry)}>Remove?</button>
                    <button type="button" onClick={() => setRemovingFeedbackId(null)} aria-label="Keep feedback">Keep</button>
                  </span>
                ) : (
                  <button className="dev-feedback-history__remove" type="button" onClick={() => setRemovingFeedbackId(entry.id)} aria-label={`Remove feedback: ${entry.instruction}`}>×</button>
                )}
              </div>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}
