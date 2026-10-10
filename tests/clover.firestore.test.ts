import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-clover";
const roomCode = "CLOVER-TEST";

let testEnv: RulesTestEnvironment;

async function seedCloverRoom() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "rooms", roomCode), {
      host: "host",
      gameType: "clover",
      players: {
        host: { name: "Host", order: 0 },
        alice: { name: "Alice", order: 1 },
        bob: { name: "Bob", order: 2 },
      },
    });
    await setDoc(doc(db, "games", roomCode), { gameType: "clover" });
    await setDoc(doc(db, "games", roomCode, "hands", "alice"), {
      ownerUid: "alice",
      answerPlacement: { topLeft: { cardId: "secret-card", rotation: 0 } },
    });
  });
}

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

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Clover private-board rules", () => {
  it("allows a player to read their own private board", async () => {
    await seedCloverRoom();

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const ownBoard = getDoc(doc(aliceDb, "games", roomCode, "hands", "alice"));

    const snapshot = await assertSucceeds(ownBoard);
    expect(snapshot.exists()).toBe(true);
  });

  it("does not let a solver read or change another player's answer", async () => {
    await seedCloverRoom();

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceBoard = getDoc(doc(bobDb, "games", roomCode, "hands", "alice"));

    await assertFails(aliceBoard);
    await assertFails(
      setDoc(
        doc(bobDb, "games", roomCode, "hands", "alice"),
        { ownerUid: "alice", answerPlacement: {} },
        { merge: true },
      ),
    );
  });

  it("lets the host create and read boards for game setup and cleanup", async () => {
    await seedCloverRoom();

    const hostDb = testEnv.authenticatedContext("host").firestore();
    await assertSucceeds(getDoc(doc(hostDb, "games", roomCode, "hands", "alice")));
    await assertSucceeds(
      setDoc(doc(hostDb, "games", roomCode, "hands", "bob"), {
        ownerUid: "bob",
        answerPlacement: {},
      }),
    );
  });
});
