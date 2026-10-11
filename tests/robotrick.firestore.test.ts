import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-clover";
const roomCode = "ROBO-TEST";
const card = { id: "A7", type: "A", strength: 7, vp: 7 };

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
      gameType: "robotrick",
      players: { host: { name: "Host", order: 0 }, alice: { name: "Alice", order: 1 }, bob: { name: "Bob", order: 2 } },
    });
    await setDoc(doc(db, "games", roomCode), { gameType: "robotrick" });
    await setDoc(doc(db, "games", roomCode, "hands", "alice"), { ownerUid: "alice", cards: [card], passOut: null, incoming: [] });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const aliceHand = (uid: string) => doc(as(uid), "games", roomCode, "hands", "alice");

describe("Robotrick hand privacy", () => {
  it("lets the owner read and play from their hand", async () => {
    await assertSucceeds(getDoc(aliceHand("alice")));
    await assertSucceeds(updateDoc(aliceHand("alice"), { cards: [], incoming: [] }));
  });

  it("hides a hand from other players", async () => {
    await assertFails(getDoc(aliceHand("bob")));
  });

  it("lets another player deliver a pass, touching only `incoming`", async () => {
    await assertSucceeds(updateDoc(aliceHand("bob"), { incoming: arrayUnion({ id: "B3", type: "B", strength: 3, vp: 3 }) }));
    await assertFails(updateDoc(aliceHand("bob"), { cards: [] }));
  });

  it("lets the host deal a new round", async () => {
    await assertSucceeds(setDoc(aliceHand("host"), { ownerUid: "alice", cards: [], passOut: null, incoming: [] }));
  });

  it("blocks non-members entirely", async () => {
    await assertFails(getDoc(aliceHand("stranger")));
    await assertFails(updateDoc(aliceHand("stranger"), { incoming: [] }));
  });
});
