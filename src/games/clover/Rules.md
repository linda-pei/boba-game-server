# Clover — Rules and Implementation Plan

## Goal

Build a cooperative word-association game inspired by the physical Clover / So Clover! format. The online version should preserve the important social loop: players privately create clues, then the rest of the table collaboratively rebuilds each hidden board.

This document is the source of truth for the first implementation. Do not resurrect the previous Clover state model or UI.

Rule reference: [official So Clover! rulebook](https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/so-clover/sc-en01-rules-16197761427wP8d.pdf).

## Decisions to Confirm

1. **Player count:** the base game should support 3–6 players. A 2-player mode is a separate variant and must not be enabled until its spectator and collaboration rules are designed.
2. **Authority:** use an authoritative verifier for hidden layouts and scoring. A Firebase callable function is preferred; a temporary owner-verifies fallback is acceptable only for casual play and must be clearly documented as trusted-client mode.
3. **Content:** use an original, maintained word-card deck. Do not copy proprietary card text or artwork.
4. **Orientation:** confirm the physical-game card-orientation rule with a tabletop playtest before locking the interaction model. The implementation must model orientation explicitly if it changes the outward keyword pairs.

## Current Implementation Boundary

The first playable implementation uses a separate private-board document plus transactional client actions. The active spectator verifies a locked guess, so this is suitable for a trusted friend group but is **not yet cheat-resistant**: verification and score updates still run on a client.

Before a public or competitive release, move verification and scoring into a Firebase callable function. Firestore rules now prevent other players from reading a Clover private board; the public UI and state model are intentionally structured to support replacing the trusted verifier without redesigning the game flow.

## Core Rules

### Setup

1. Each player receives four keyword cards.
2. Each player privately places the cards in the four Clover slots. If orientation is part of the confirmed ruleset, each card placement includes one of four rotations.
3. Each player sees the eight keywords on the outside edges of their completed Clover.
4. For each of the four adjacent outer-keyword pairs, the player writes one single-word clue. Compound words, proper nouns, acronyms, numbers, and onomatopoeia are allowed; the clue cannot be an exact keyword, a translation, or from the same word family.
5. The player removes their four cards, draws one extra keyword card, and shuffles it with the original four. The resulting five cards are the candidate set for that Clover.

### Resolution

1. Every player becomes the spectator for one Clover, in a fixed seating order.
2. The spectator cannot communicate while their board is solved.
3. The other players see the spectator’s four clues and five candidate cards, then collaboratively place four cards on the Clover. The player seated to the spectator’s left is the designated decision-maker when the table cannot agree.
4. A perfect first placement scores 6 points: one per correct card plus a 2-point first-try bonus.
5. Otherwise, the verifier silently removes every incorrect card. Correct cards stay locked in place and the team gets one final attempt to place the remaining cards.
6. The final score for that Clover is one point per correct card, from 0 to 4.
7. After every player’s Clover is resolved, show the total team score and the per-board results.

## Data Model

Keep public game state separate from hidden board state. The public game document must never contain a layout that lets solvers derive the answer before verification.

### Public game document

```ts
type CloverPhase =
  | "clue-writing"
  | "waiting-for-clues"
  | "solving-first"
  | "solving-final"
  | "board-result"
  | "finished";

interface CloverGame {
  gameType: "clover";
  phase: CloverPhase;
  playerOrder: string[];
  activeSpectatorUid: string | null;
  activeDecisionMakerUid: string | null;
  completedSpectatorUids: string[];
  teamScore: number;
  boardResults: Record<string, { score: number; firstAttemptPerfect: boolean }>;
  lastAction: string | null;
}

interface PublicCloverRound {
  spectatorUid: string;
  clues: [string, string, string, string];
  candidateCards: CloverCard[]; // exactly five
  sharedPlacement: Record<string, CloverPlacement>;
  lockedCorrectCardIds: string[];
  attempt: 1 | 2;
}
```

### Private board document

Store the original four cards and the answer layout in a private per-player document. It is readable only by the owner and the verifier. It is transformed into a public round only after the owner submits their clues.

```ts
interface PrivateCloverBoard {
  ownerUid: string;
  sourceCards: CloverCard[];
  answerPlacement: Record<string, CloverPlacement>;
  clues: [string, string, string, string];
  submittedAt: Timestamp | null;
}
```

`CloverCard.id` must be globally unique within a game. Do not reuse positional IDs such as `tile-1` across players or boards.

## Phase Contract

| Phase | Who can act | Required outcome |
| --- | --- | --- |
| `clue-writing` | Every player, privately | Four placed cards and four valid non-empty clues |
| `waiting-for-clues` | Nobody | Transition only when every player submitted |
| `solving-first` | Decision-maker edits; team observes/discusses | Four of five candidate cards placed and locked |
| `solving-final` | Decision-maker edits only empty slots | Final placement locked and scored |
| `board-result` | Host or next decision-maker advances | Result acknowledged; next spectator chosen |
| `finished` | Nobody | Team score and per-board summary displayed |

The spectator is always read-only during `solving-first` and `solving-final`. Other players may see the shared board but cannot overwrite the decision-maker’s moves.

## Server / Firestore Responsibilities

1. Create private boards, allocate unique cards, and create the fifth candidate card.
2. Validate that a submitted clue is one non-empty word and that a submitted layout has four distinct slots.
3. Atomically move from clue writing to resolution once all players submit.
4. On a locked guess, compare only on the server, retain correct cards after attempt one, and calculate score after attempt two.
5. Atomically advance the spectator or finish the game. Never use client-side read-then-write score updates.
6. Enforce Firestore rules so players cannot read another player’s private board or write phases/results for which they are not authorized.

## UI Plan

### Clue-writing board

- A 2×2 Clover with visible outer keywords and four labelled clue zones.
- Clear placement and rotation controls; support keyboard/touch as well as drag-and-drop.
- A local draft that survives re-rendering and a two-step `Lock clues` confirmation.
- Once submitted, replace editing controls with a waiting status and the submitted clue summary.

### Shared solving board

- Four clue labels remain visible around the board at all times.
- Five candidate cards appear in the tray; the fifth card is visibly part of the puzzle, not an accidental extra.
- The decision-maker has move/rotate controls; everyone else has a read-only shared view and the spectator sees a silent-state reminder.
- After the first failed lock, correct cards remain fixed, incorrect cards return to the tray, and the UI explicitly labels the final attempt.

### Results and end game

- Show the result for the resolved board without exposing hidden information before verification.
- Show total team score, a board-by-board score list, and the shared end-of-game navigation component.

## Implementation Order

1. Write pure unit tests for placement validity, rotation, outer-pair derivation, candidate-set generation, first-attempt reduction, final scoring, and next-spectator selection.
2. Add the Clover types, original word deck, and server-authoritative action layer.
3. Add Firestore rules and emulator tests for private-board access and action authorization.
4. Build the clue-writing UI and test it with two browser sessions.
5. Build the read-only/shared solving UI, first-attempt reduction, and final scoring.
6. Add result/end screens, responsive styling, dark-mode checks, and shared navigation.
7. Run a full 3-player manual game, including reconnects, simultaneous submissions, and a first-attempt miss.

## Definition of Done

- A 3–6 player room can complete one full game without a page refresh or manual database edit.
- Solvers never receive another player’s answer layout before verification.
- Exactly five candidates are shown for every board; exactly four may be placed.
- First-attempt failure retains only correct cards and exposes no correctness information beyond the remaining cards.
- Score is calculated once, atomically, and cannot be changed by repeated clicks or concurrent clients.
- The game works on touch and desktop layouts, supports dark mode, and uses the shared lobby/end-game components.

## Local verification

Run the Firebase emulators in one terminal:

```sh
npm run emulators
```

Then run the privacy integration test in another:

```sh
npm run test:rules
```

The test seeds a Clover room and proves that a player can read their own board, cannot read another player's board, and that the host can create/read private boards for setup and cleanup. To exercise the app against the same emulator, put `VITE_USE_FIREBASE_EMULATOR=true` and `VITE_FIREBASE_PROJECT_ID=demo-clover` in `.env.local`, then run `npm run dev`. The Emulator UI is at `http://127.0.0.1:4000`.
