import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-clover";
const roomCode = "BOMB-TEST";
const stand = { stands: [{ wires: [{ id: "B7-1", color: "blue", sortKey: 7, cut: false }] }] };

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
      host: "host",
      gameType: "bomb-busters",
      players: { host: { name: "Host", order: 0 }, alice: { name: "Alice", order: 1 }, bob: { name: "Bob", order: 2 } },
    });
    await setDoc(doc(db, "games", roomCode), { gameType: "bomb-busters" });
    await setDoc(doc(db, "games", roomCode, "hands", "alice"), { ownerUid: "alice", ...stand });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const aliceStand = (uid: string) => doc(as(uid), "games", roomCode, "hands", "alice");

describe("Bomb Busters stand privacy", () => {
  it("lets the owner read and cut their own wires", async () => {
    await assertSucceeds(getDoc(aliceStand("alice")));
    await assertSucceeds(updateDoc(aliceStand("alice"), { stands: [{ wires: [] }] }));
  });

  it("hides a stand from teammates and from the host", async () => {
    await assertFails(getDoc(aliceStand("bob")));
    await assertFails(getDoc(aliceStand("host")));
  });

  it("doesn't let teammates change someone else's stand", async () => {
    await assertFails(updateDoc(aliceStand("bob"), { stands: [] }));
  });

  it("lets the host deal a new mission and clean up without reading", async () => {
    await assertSucceeds(setDoc(aliceStand("host"), { ownerUid: "alice", ...stand }));
    await assertSucceeds(deleteDoc(aliceStand("host")));
  });

  it("lets any room member write the public game doc (cut resolution), but not outsiders", async () => {
    await assertSucceeds(updateDoc(doc(as("bob"), "games", roomCode), { phase: "playing" }));
    await assertFails(updateDoc(doc(as("stranger"), "games", roomCode), { phase: "playing" }));
  });
});
