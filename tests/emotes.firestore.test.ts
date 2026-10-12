import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

const projectId = "demo-clover";
const roomCode = "EMOTE-TEST";
const emote = (uid: string, emoji = "🦇") => ({ emoji, uid, playerName: uid, timestamp: new Date() });

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "rooms", roomCode), {
      host: "alice",
      gameType: "robotrick",
      players: { alice: { name: "Alice", order: 0 }, bob: { name: "Bob", order: 1 } },
    });
    await setDoc(doc(db, "games", roomCode), { gameType: "robotrick" });
    await setDoc(doc(db, "games", roomCode, "emotes", "bob-1"), emote("bob"));
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("emote rules", () => {
  const emotes = (uid: string) => collection(testEnv.authenticatedContext(uid).firestore(), "games", roomCode, "emotes");

  it("lets room members send and see emotes", async () => {
    await assertSucceeds(addDoc(emotes("alice"), emote("alice")));
    await assertSucceeds(getDocs(emotes("alice")));
  });

  it("blocks outsiders, impersonation and oversized payloads", async () => {
    await assertFails(getDocs(emotes("mallory")));
    await assertFails(addDoc(emotes("mallory"), emote("mallory")));
    await assertFails(addDoc(emotes("alice"), emote("bob")));
    await assertFails(addDoc(emotes("alice"), emote("alice", "x".repeat(40))));
  });

  it("lets players delete only their own emotes", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(deleteDoc(doc(aliceDb, "games", roomCode, "emotes", "bob-1")));
    await assertSucceeds(deleteDoc(doc(bobDb, "games", roomCode, "emotes", "bob-1")));
  });
});
