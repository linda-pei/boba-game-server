import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-clover";
const devEmail = "dev@example.com";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "config", "devAccess"), { emails: [devEmail] });
    await setDoc(doc(db, "devFeedback", "existing"), { instruction: "x", status: "pending" });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const dev = () => testEnv.authenticatedContext("dev-uid", { email: devEmail, email_verified: true }).firestore();
const unverified = () => testEnv.authenticatedContext("dev-uid", { email: devEmail, email_verified: false }).firestore();
const otherUser = () => testEnv.authenticatedContext("other", { email: "other@example.com", email_verified: true }).firestore();
const anonymous = () => testEnv.authenticatedContext("anon").firestore();

describe("dev feedback rules", () => {
  it("lets an allowlisted, verified email read access and manage feedback", async () => {
    await assertSucceeds(getDoc(doc(dev(), "config", "devAccess")));
    await assertSucceeds(setDoc(doc(dev(), "devFeedback", "new"), { instruction: "y", status: "pending" }));
    await assertSucceeds(setDoc(doc(dev(), "devFeedback", "new", "images", "0"), { dataUrl: "data:" }));
    await assertSucceeds(getDoc(doc(dev(), "devFeedback", "existing")));
    await assertSucceeds(deleteDoc(doc(dev(), "devFeedback", "existing")));
  });

  it("never lets clients edit the allowlist", async () => {
    await assertFails(setDoc(doc(dev(), "config", "devAccess"), { emails: [devEmail, "x@example.com"] }));
  });

  it("blocks unverified, non-allowlisted, and anonymous users", async () => {
    for (const db of [unverified(), otherUser(), anonymous()]) {
      await assertFails(getDoc(doc(db, "config", "devAccess")));
      await assertFails(getDoc(doc(db, "devFeedback", "existing")));
      await assertFails(setDoc(doc(db, "devFeedback", "new"), { instruction: "y" }));
    }
  });
});
