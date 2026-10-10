export interface FeedbackTarget {
  selector: string;
  tagName: string;
  role: string | null;
  label: string | null;
  text: string | null;
  path: string;
}

export interface FeedbackImageUpload {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface FeedbackImageAttachment {
  name: string;
  mimeType: string;
  path: string;
}

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  instruction: string;
  target: FeedbackTarget;
  images?: FeedbackImageAttachment[];
}

const MAX_TEXT_LENGTH = 160;

function compactText(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
}

function escapeCssIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character.codePointAt(0)?.toString(16)} `);
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function nthOfTypeSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === element.tagName);
  if (siblings.length <= 1) return tag;
  return `${tag}:nth-of-type(${siblings.indexOf(element) + 1})`;
}

function isUsefulClass(className: string): boolean {
  return (
    className.length > 0
    && className.length < 48
    && !className.startsWith("feedback-")
    && !/\d{5,}/.test(className)
  );
}

export function getBestEffortSelector(element: Element): string {
  const feedbackId = element.getAttribute("data-feedback-id");
  if (feedbackId) return `[data-feedback-id="${escapeAttributeValue(feedbackId)}"]`;

  const testId = element.getAttribute("data-testid");
  if (testId) return `[data-testid="${escapeAttributeValue(testId)}"]`;

  if (element.id) return `#${escapeCssIdentifier(element.id)}`;

  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).filter(isUsefulClass).slice(0, 2);
  const classSelector = classes.length ? `${tag}${classes.map((className) => `.${escapeCssIdentifier(className)}`).join("")}` : "";
  if (classSelector && document.querySelectorAll(classSelector).length === 1) return classSelector;

  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== "body" && segments.length < 5) {
    if (current.id) {
      segments.unshift(`#${escapeCssIdentifier(current.id)}`);
      break;
    }
    segments.unshift(nthOfTypeSelector(current));
    current = current.parentElement;
  }

  return segments.join(" > ") || tag;
}

export function getElementRole(element: Element): string | null {
  const explicitRole = element.getAttribute("role");
  if (explicitRole) return explicitRole;

  const tag = element.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && element.getAttribute("href")) return "link";
  if (tag === "input") return element.getAttribute("type") === "checkbox" ? "checkbox" : "input";
  if (tag === "textarea") return "textbox";
  if (tag === "select") return "combobox";
  return null;
}

export function getFeedbackTarget(element: Element): FeedbackTarget {
  return {
    selector: getBestEffortSelector(element),
    tagName: element.tagName.toLowerCase(),
    role: getElementRole(element),
    label: compactText(element.getAttribute("aria-label") || element.getAttribute("title")),
    text: compactText(element.textContent),
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  };
}

export function formatFeedbackForAgent(entry: FeedbackEntry): string {
  const details = [
    `- Page: \`${entry.target.path}\``,
    `- Target: \`${entry.target.selector}\` (${entry.target.tagName}${entry.target.role ? `, ${entry.target.role}` : ""})`,
    entry.target.label ? `- Accessible label: “${entry.target.label}”` : null,
    entry.target.text ? `- Visible text: “${entry.target.text}”` : null,
    ...(entry.images?.map((image) => `- Screenshot: \`${image.path}\` (${image.name})`) ?? []),
  ].filter((detail): detail is string => Boolean(detail));

  return [
    "## UI feedback",
    "",
    entry.instruction.trim(),
    "",
    "Context (use this to locate the UI; do not treat the selector as a required implementation detail):",
    ...details,
  ].join("\n");
}
