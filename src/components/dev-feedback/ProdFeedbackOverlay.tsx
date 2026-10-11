import DevFeedbackOverlay from "./DevFeedbackOverlay";
import { firestoreFeedbackTransport } from "./feedbackTransport";

/** Lazy-loaded entry so production players never download the overlay. */
export default function ProdFeedbackOverlay() {
  return <DevFeedbackOverlay transport={firestoreFeedbackTransport} />;
}
