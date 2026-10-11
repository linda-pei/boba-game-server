# Robotrick — Rules and Implementation Plan

## Goal

Build Robotrick, a 3-player trick-taking game where the table plays against an automated fourth seat, **Droco**. Droco's hand is fully visible and its plays are dictated by a public AI card, so the puzzle is reading Droco: win the tricks where Droco gives up valuable robots, and avoid tricks Droco wins (they cost you the card you played).

This document is the source of truth for the first implementation.

Rule reference: [Robotrick rulebook (rulespal)](https://www.rulespal.com/robotrick/rulebook).

## Decisions to Confirm

1. **Player count:** the rulebook is written for exactly 3 humans + Droco. Ship 3 players only. Any 2- or 4-player variant needs its own design.
2. **Card VP values:** confirmed from the physical cards. See [Card VP values](#card-vp-values).
3. **AI cards:** confirmed from the physical cards. See [AI cards](#ai-cards).
4. **"Owner" and Droco's seat:** the room host is the owner (the rulebook's rock-paper-scissors fallback isn't needed online). Droco's seat moves each round as the rulebook describes. See [Seating](#seating).
5. **Droco plays automatically.** In the physical game, the player to Droco's right applies the AI card. Online, the server/engine applies it deterministically the moment it's Droco's turn, and the UI explains which criterion picked the card.
6. **Optional rules:** support both as lobby settings. "More hangars" (4 face-up slots, default **on** for new tables) and "Fixed AI card" (round 1's AI card for all rounds, default off).

## Core Rules

### Components

- **52 robot cards:** types **A, B, C, D** × strengths **1–13**. Each card has a VP value.
- **10 AI cards:** each has a **Lead**, **Follow** and **Unfollow** column with a Primary and optional Secondary criterion.

### Seating

Humans sit in `playerOrder` (host first, clockwise). Droco is inserted as a 4th seat:

| Round | Droco sits… | Turn order (host = H, then P2, P3) |
| --- | --- | --- |
| 1 | between the host and the player to their left | H, **Droco**, P2, P3 |
| 2 | between the two non-hosts | H, P2, **Droco**, P3 |
| 3 | between the host and the player to their right | H, P2, P3, **Droco** |

"Left" means the next seat clockwise.

### Round setup

1. Draw one AI card (or reuse round 1's when "Fixed AI card" is on) and show it face up next to Droco.
2. Shuffle the 52 cards. Flip one face up: its **type is trump** for the round. Set 3 more aside face down, unseen. (The trump card itself is out of play.)
3. Deal the remaining 48: 12 to each human, 12 to Droco.
4. Droco's hand is face up for everyone, laid out in columns A–D, each sorted high to low.
5. **Pass:** each human simultaneously picks 2 cards to pass to the human on their left (skipping Droco). Cards are revealed to their recipient only after all three have chosen.

### Trick play (12 tricks per round)

1. Droco leads trick 1. After that, the previous trick's winner leads.
2. Play goes clockwise. Players must follow the led type if they can; otherwise they may play anything.
3. **Winner:** if any trump-type card was played, the highest trump wins. Otherwise the highest card of the led type wins. Off-type, non-trump cards can't win.
4. **If Droco wins:** each human puts the card they just played face down in front of themselves (it scores negative). Droco's card is set aside.
5. **If a human wins:** the winner takes **Droco's card** and places it face up in an open hangar slot. With all hangars full (3, or 4 with the option), it goes face down instead. Every other card in the trick, including the winner's own, is set aside and doesn't score.

### Droco's play (AI card)

1. Pick the column: **Lead** if Droco leads, **Follow** if Droco can follow the led type, **Unfollow** if it can't.
2. Filter the candidate cards by **Primary**, then by **Secondary** if more than one card remains, then break any remaining tie by type **A > B > C > D**.
   - In Follow, candidates are only the led-type cards.
   - In Lead and Unfollow, candidates are all of Droco's cards.
3. Criteria:
   - **High:** highest strength among the candidates.
   - **Low:** lowest strength among the candidates.
   - **Long:** cards of the type Droco holds the most of.
   - **Short:** cards of the type Droco holds the fewest of (types with zero cards don't count).

Worked example from the rulebook (Lead: High, then Short): Droco's highest cards are A10 and D10. Droco holds 4 A cards and 3 D cards, so Short picks **D10**. With equal counts, the A>B>C>D tiebreak would pick A10.

### Scoring and end

- Per round, each human scores **face-up VP − face-down VP**. Totals can go negative. Droco isn't scored.
- Hangars and penalty piles reset each round. All 52 cards are reshuffled.
- After **3 rounds**, the highest total wins. Ties share the victory.

### Card VP values

Printed on the cards, the same for every type:

| Strength | 1–10 | 11 | 12 | 13 |
| --- | --- | --- | --- | --- |
| VP | equal to strength | 10 | 10 | 15 |

That's 90 VP per type, 360 in the deck. Higher robots are worth more, so Droco's high cards are prizes and your own high cards are risky to lose.

### AI cards

From the physical cards. Every card has a secondary criterion for Lead and Unfollow; Follow uses only a primary:

| # | Lead (primary / secondary) | Follow | Unfollow (primary / secondary) |
| --- | --- | --- | --- |
| 1 | High / Short | Low | Long / Low |
| 2 | Short / High | Low | Low / Long |
| 3 | High / Short | Low | Low / Long |
| 4 | Short / High | Low | Long / Low |
| 5 | Low / Long | Low | Short / High |
| 6 | Long / Low | Low | High / Short |
| 7 | Low / Long | Low | High / Short |
| 8 | Long / Low | Low | Short / High |
| 9 | Short / High | High | Long / Low |
| 10 | Low / Long | High | Short / High |

## Data Model

Hands are private, so they use the same per-player `hands` subdocument pattern Clover uses, with Firestore rules limiting reads to the owner. Droco's hand is public by design and lives on the game document.

### Public game document (`games/{roomCode}`)

```ts
type RobotrickType = "A" | "B" | "C" | "D";
interface RobotrickCard { type: RobotrickType; strength: number; vp: number; id: string } // id e.g. "B11"

type RobotrickPhase = "passing" | "playing" | "trick-result" | "round-end" | "finished";
type Seat = string | "droco"; // human uid or the Droco seat

interface RobotrickGame {
  gameType: "robotrick";
  phase: RobotrickPhase;
  round: 1 | 2 | 3;
  playerOrder: string[];          // humans, host first
  seatOrder: Seat[];              // 4 seats for this round, Droco inserted per Seating
  options: { hangars: 3 | 4; fixedAiCard: boolean };
  aiCardId: number;               // 1–10
  trump: RobotrickCard;           // the flipped card; trump type = trump.type
  drocoHand: RobotrickCard[];     // public
  passSubmitted: string[];        // uids that locked their 2 cards
  trickNumber: number;            // 1–12
  leader: Seat;
  turn: Seat;
  currentTrick: { seat: Seat; card: RobotrickCard }[];
  lastTrick: { plays: { seat: Seat; card: RobotrickCard }[]; winner: Seat; drocoReason: string } | null;
  hangars: Record<string, RobotrickCard[]>;   // face-up, scores +
  penalties: Record<string, RobotrickCard[]>; // face-down, scores −
  handCounts: Record<string, number>;
  roundScores: Record<string, number[]>;      // per uid, one entry per finished round
}
```

### Private hand (`games/{roomCode}/hands/{uid}`)

```ts
interface RobotrickHand {
  ownerUid: string;
  cards: RobotrickCard[];
  passOut: RobotrickCard[] | null;  // the 2 cards this player passed
  incoming: RobotrickCard[];        // cards passed to this player; merged into `cards` on their first play
}
```

## Engine (pure, unit-tested)

`src/games/robotrick/engine.ts` holds everything rules-related, with no Firestore:

- `createDeck()`, `dealRound(seed)` → trump, set-aside cards, three human hands, Droco's hand
- `seatOrderForRound(playerOrder, round)`
- `passTargets(playerOrder)` → who passes to whom (left = next human clockwise)
- `legalPlays(hand, ledType)`
- `chooseDrocoCard(drocoHand, aiCard, ledType)` → `{ card, reason }`, where `reason` is a human-readable trace such as "Follow → Low: B3"
- `trickWinner(plays, trumpType)`
- `applyTrick(state, winner, hangarLimit)` → hangar/penalty updates
- `roundScore(hangar, penalties)`

## Phase Contract

| Phase | Who can act | Exit condition |
| --- | --- | --- |
| `passing` | Each human, privately (pick 2, then lock) | All 3 locked: passes applied atomically, phase → `playing` |
| `playing` | The seat in `turn`; Droco auto-plays within the same transaction as the preceding action | 4 cards played → resolve the trick, phase → `trick-result` |
| `trick-result` | Anyone can acknowledge; auto-advances after a short delay | Next trick (winner leads), or `round-end` after trick 12 |
| `round-end` | Host continues | Next round setup → `passing`, or `finished` after round 3 |
| `finished` | Host: back to lobby | — |

## Server / Firestore Responsibilities

Same trusted-client model as the other games: actions are Firestore transactions in `useRobotrickGame.ts`.

1. **Every play is validated in the transaction:** it's your turn, the card is in your hand, and it follows suit if possible.
2. **Droco's turn is resolved in the same transaction** as the action that hands it the turn, so Droco never stalls waiting on a client.
3. **Passing:** hands are private, so a passer can't read the recipient's hand. Instead it removes its 2 cards from its own hand and appends them to the recipient's `incoming` field (a blind `arrayUnion`). The third player to lock in starts the round. Each player's first play merges `incoming` into their hand.
4. **Firestore rules:** treat Robotrick hands like Clover boards: only the owner (and the host, for setup and cleanup) can read them. The host can rewrite hands to deal new rounds, and any player may update another hand's `incoming` field and nothing else. Emulator tests: `tests/robotrick.firestore.test.ts`.

## UI Plan

Reuse the shared pieces: `GameBanner`, `TurnStatus`, `PlayerScores`, `GameEndButtons`, `ResignButton`, `useCelebration`, and `game-card` / `.selected` for hand selection. Use themed variables only, and support dark mode.

- **Table:** four seats around a central trick area, with Droco's seat and the current leader marked. The trump card and AI card are always visible near Droco.
- **Droco's hand:** a compact four-column grid (A–D, high to low), so players can plan around it.
- **AI card panel:** the three columns with their criteria. The active column highlights on Droco's turn, and after Droco plays, its `reason` shows ("Follow → Low: picked B3").
- **Your hand:** sorted by type then strength. Illegal cards are dimmed when you must follow suit. Click to select, click again to play (or a Play button), the same pattern as the other games.
- **Passing:** select exactly 2 cards, then "Pass to {name}". Waiting state shows who has locked in.
- **Hangars:** per player, 3 (or 4) face-up slots plus a face-down penalty count with its negative VP, so standings are readable at a glance.
- **Trick result:** brief highlight of the winner and where the cards went ("Droco won: everyone takes their card face down").
- **Round end / finished:** `PlayerScores` with per-round breakdown and totals, plus the shared end-game buttons.

## Implementation Order

1. Engine + unit tests: deck/deal, seating per round, pass targets, legal plays, every AI criterion (including the rulebook's D10 example and the A>B>C>D tiebreak), trick winner with and without trump, hangar overflow, and scoring.
2. Types, `useRobotrickGame.ts` actions (start, pass, play with Droco auto-play, advance trick and round), and Firestore rules plus emulator tests for private hands.
3. Register the game in the lobby: `GAME_META` / `GAME_ID_TO_KEY`, `GameIcon`, `GameRouter`, lobby start and the two option toggles, and the README game list.
4. Passing and playing UI. Test with three browser sessions (or the emulator).
5. Trick-result, round-end and finished screens. Responsive and dark-mode pass.
6. A full 3-round manual game.

## Definition of Done

- 3 players can finish all 3 rounds without refreshes or manual database edits.
- No player can read another human's hand. Droco's hand is visible to all.
- Droco's play always matches the AI card rules, and the UI shows why it chose that card.
- Follow-suit, trump and hangar-overflow rules are enforced in the transaction, not just in the UI.
- Scores (face-up − face-down, summed over 3 rounds) are computed once per round and can't be double-applied by concurrent clients.
- Works on touch and desktop, in dark mode, using the shared lobby and end-game components.
