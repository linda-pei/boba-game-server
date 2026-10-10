# Local visual-feedback loop

A way to leave UI feedback by clicking on the running dev server, and have an
agent pick it up and implement it. Entirely local — nothing here is shared
state between developers.

## Pieces

| Piece | Where | Role |
| --- | --- | --- |
| Picker overlay | `src/components/dev-feedback/DevFeedbackOverlay.tsx`, mounted in `src/App.tsx` | Click a UI element, type a note, optionally attach screenshots |
| Queue middleware | `devFeedbackQueue()` in `vite.config.ts`, serving `/__dev-feedback` | Dev-only (`apply: 'serve'`); reads/writes the files below |
| Queue | `.codex/dev-feedback.json` | Pending entries, newest appended. Max 50 |
| Resolved ledger | `.codex/dev-feedback-resolved.json` | JSON array of completed entry ids |
| Screenshots | `.codex/dev-feedback-images/` | Up to 3 per entry, 2 MB each |

All three data paths are gitignored. `.codex/` is created on first write, so
there is nothing to set up beyond running `npm run dev`.

## The contract

The overlay and the agent only ever communicate through those two JSON files:

- The **overlay** appends to `dev-feedback.json` and polls `/__dev-feedback`.
  It deletes its own local note once that note's id shows up in
  `dev-feedback-resolved.json` — that ledger is how the UI learns a request was
  actually finished, so appending the id is what dismisses the note.
- The **agent** drains `dev-feedback.json` and appends to the ledger. It must
  remove only the entry it handled (another entry may have been submitted while
  it was working) and must append ids uniquely.

## Running the agent side

Point a polling agent at the queue on a short interval. In Claude Code:

```
/loop 1m <the prompt below>
```

Prompt:

> Check `.codex/dev-feedback.json` for feedback entries submitted by the local
> development feedback picker. If a new entry is present, implement the
> requested change in the selected UI context and verify it. Then remove only
> that feedback entry from `dev-feedback.json` and append its id, uniquely, to
> `.codex/dev-feedback-resolved.json` as a JSON string array. The browser picker
> uses that resolved-id ledger to delete only completed local notes. If no
> feedback is present, wait quietly for the next heartbeat.

The loop is optional — the picker works without it, entries just accumulate.
Nothing in the build or test path depends on either file.

## Production dev mode

The same overlay can run on the deployed site for allowlisted accounts, storing
notes in Firestore instead of the local files.

| Piece | Where | Role |
| --- | --- | --- |
| Gate | `src/components/dev-feedback/DevModeGate.tsx`, mounted in `src/App.tsx` for production builds | Visit any page with `?dev` to get a **Dev sign-in** button; it links a Google account to your anonymous player (keeping your uid). Allowlisted accounts get the overlay, lazy-loaded so other players never download it |
| Allowlist | Firestore doc `config/devAccess` → `{ emails: ["you@example.com"] }` | Edited by hand in the Firebase console; `firestore.rules` only lets verified emails on this list read it or touch `devFeedback` |
| Queue | Firestore `devFeedback/{id}` (`status: "pending" \| "resolved"`), screenshots in `devFeedback/{id}/images/{n}` | Screenshots are re-encoded to fit Firestore's 1 MiB document limit (no Cloud Storage needed) |
| Sync | `npm run feedback:sync` (`scripts/feedback-sync.mjs`) | Marks ledger ids `resolved` in Firestore (dismissing them in the prod overlay), then pulls new pending entries into `dev-feedback.json` + `dev-feedback-images/` with `"source": "production"` |

### One-time setup

1. Firebase console → Authentication → Sign-in method → enable **Google**.
2. Firestore → create `config/devAccess` with field `emails` (array) containing your Google email.
3. Deploy the rules: `firebase deploy --only firestore:rules`.
4. Give the sync script credentials: `gcloud auth application-default login`
   (or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key stored outside the repo).

### Running the agent side against production

Prefix the loop prompt with the sync so it pulls new notes and pushes resolutions:

```
/loop 1m Run `npm run feedback:sync`, then <the prompt above>. After resolving entries, run `npm run feedback:sync` again.
```

Fixes still ship through your normal deploy; review them locally first.
