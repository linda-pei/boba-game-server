import { describe, expect, it } from "vitest";
import { formatFeedbackForAgent, type FeedbackEntry } from "./feedbackUtils";

const feedback: FeedbackEntry = {
  id: "feedback-1",
  createdAt: "2026-10-10T00:00:00.000Z",
  instruction: "Make this action easier to notice on small screens.",
  target: {
    selector: "button.start-game",
    tagName: "button",
    role: "button",
    label: "Start game",
    text: "Start game",
    path: "/lobby/ABC123",
  },
};

describe("formatFeedbackForAgent", () => {
  it("creates a copyable request with target context", () => {
    expect(formatFeedbackForAgent(feedback)).toContain("Make this action easier to notice on small screens.");
    expect(formatFeedbackForAgent(feedback)).toContain("`button.start-game` (button, button)");
    expect(formatFeedbackForAgent(feedback)).toContain("`/lobby/ABC123`");
  });
});
