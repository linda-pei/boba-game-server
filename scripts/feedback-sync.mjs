#!/usr/bin/env node
// Syncs production dev-mode feedback (Firestore `devFeedback`) with the local agent queue.
//
//   1. Ids in .codex/dev-feedback-resolved.json are marked `resolved` in Firestore
//      (the prod overlay watches that status to dismiss notes) and their images deleted.
//   2. Pending Firestore entries are appended to .codex/dev-feedback.json, with screenshots
//      written to .codex/dev-feedback-images/ — the same contract as the local dev server.
//
// Auth: uses Application Default Credentials. Run `gcloud auth application-default login`
// once, or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key kept outside the repo.
// Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 to sync against the emulator instead.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const root = process.cwd();
const queuePath = resolve(root, ".codex", "dev-feedback.json");
const ledgerPath = resolve(root, ".codex", "dev-feedback-resolved.json");
const imagesPath = resolve(root, ".codex", "dev-feedback-images");
const COLLECTION = "devFeedback";

async function readJsonArray(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function readProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const env = await readFile(resolve(root, ".env"), "utf8");
    return env.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const projectId = await readProjectId();
if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID in .env.");
  process.exit(1);
}

initializeApp({ projectId, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
const db = getFirestore();
const collection = db.collection(COLLECTION);

const resolvedIds = new Set((await readJsonArray(ledgerPath)).filter((id) => typeof id === "string"));
const pending = await collection.where("status", "==", "pending").get();

// 1. Push resolutions.
let markedResolved = 0;
for (const snapshot of pending.docs) {
  if (!resolvedIds.has(snapshot.id)) continue;
  const images = await snapshot.ref.collection("images").listDocuments();
  await Promise.all(images.map((image) => image.delete()));
  await snapshot.ref.update({ status: "resolved", resolvedAt: FieldValue.serverTimestamp() });
  markedResolved += 1;
}

// 2. Pull new pending entries.
const queue = await readJsonArray(queuePath);
const queuedIds = new Set(queue.map((entry) => entry?.id));
let pulled = 0;
for (const snapshot of pending.docs) {
  if (resolvedIds.has(snapshot.id) || queuedIds.has(snapshot.id)) continue;
  const data = snapshot.data();
  const entry = {
    id: snapshot.id,
    createdAt: data.createdAt,
    instruction: data.instruction,
    target: data.target,
    source: "production",
  };

  const imageDocs = (await snapshot.ref.collection("images").get()).docs
    .sort((left, right) => Number(left.id) - Number(right.id));
  if (imageDocs.length > 0) {
    await mkdir(imagesPath, { recursive: true });
    const safeId = snapshot.id.replace(/[^a-zA-Z0-9_-]/g, "");
    entry.images = await Promise.all(imageDocs.map(async (imageDoc, index) => {
      const { name, mimeType, dataUrl } = imageDoc.data();
      const extension = mimeType === "image/jpeg" ? "jpg" : String(mimeType).slice("image/".length);
      const path = resolve(imagesPath, `${safeId}-${index}.${extension}`);
      await writeFile(path, Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(",") + 1), "base64"));
      return { name, mimeType, path };
    }));
  }

  queue.push(entry);
  pulled += 1;
}

if (pulled > 0) {
  queue.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  await mkdir(resolve(queuePath, ".."), { recursive: true });
  await writeFile(queuePath, JSON.stringify(queue, null, 2));
}

console.log(`feedback:sync — pulled ${pulled} new, marked ${markedResolved} resolved (project ${projectId}).`);
