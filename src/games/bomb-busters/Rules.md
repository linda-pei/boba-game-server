# Bomb Busters — Rules and Implementation Plan

## Goal

Build Bomb Busters, a cooperative deduction game for 2–5 players. Every player holds a secret, sorted stand of numbered wires. On your turn you cut a wire by pointing at one of a teammate's wires and naming its value. Cut every wire to defuse the bomb. Cut a red wire, or let too many wrong guesses run the detonator dial to the skull, and the bomb explodes.

This document is the source of truth for the first implementation. The game ships as a series of **missions**. The first release covers **missions 1–8**: Novice (1–3) teaches the basics, Intermediate (4–7) teaches advanced concepts, and Expert (8) is the final exam. Missions are data plus small rule hooks, so later ones can be added incrementally.

Rule reference: [Bomb Busters rulebook (rulespal)](https://www.rulespal.com/bomb-busters/rulebook).

## Decisions to Confirm

1. **Card data:** confirmed from the physical cards. See [Card Data](#card-data).
2. **Scope of the first release:** missions 1–8, including whatever equipment and characters those missions use.
3. **Player count:** 2–5, using the rulebook's stand split. With 2 players, each player gets 2 stands; with 3, the captain gets 2 stands; with 4–5, everyone gets 1.

## Core Rules

### Components

- **70 wires:** 48 blue (values 1–12, four of each), 11 red (1.5–11.5), 11 yellow (1.1–11.1).
  - The decimals only decide where a red or yellow wire sorts on a stand.
  - In play, red and yellow are just "RED" and "YELLOW".
- **Info tokens** (26, of which 2 are yellow), **validation tokens** (12), a **detonator dial**, **equipment cards** (12) and **character cards** (5).

### Setup

1. **Captain and characters:** the captain is random for mission 1, then passes to the left each mission. The captain takes the Captain character; everyone else picks a character.
2. **Build the wire pool:**
   - **Blue:** the mission's blue wires.
   - **Red and yellow:** draw the number of each the mission card shows.
   - **"1 out of 2" / "2 out of 3" style missions:** reveal that many candidates, shuffle them, add the stated number face down, and set the rest aside unseen. Everyone knows how many red and yellow wires are in play, but not which values.
3. **Deal and sort:**
   - Shuffle and deal all wires as evenly as possible (some players may get one more).
   - Each player sorts their stand in ascending order, using the decimals for red and yellow.
   - A player with 2 stands sorts each separately, but they count as one hand.
4. **Equipment and dial:**
   - Lay out as many equipment cards as there are players, locked (not yet usable).
   - Set the dial to the section for the player count.
5. **Setup info tokens:** starting with the captain and going clockwise, each player places one info token on a **blue** wire in their own hand, showing its value. A player with 2 stands places only one.

### Turns

Starting with the captain and going clockwise, each player takes exactly one action. Players with an empty stand are skipped.

**Dual Cut:** point at one specific wire on a teammate's stand and name a value. You must hold a wire of that value yourself.
- **Correct:** the teammate turns that wire face up where it sits, and you turn up one matching wire from your own stand.
- **Wrong, and the wire is red:** the bomb explodes and the mission fails.
- **Wrong, and the wire is blue or yellow:**
  - The dial advances 1.
  - The teammate places an info token on that wire showing its real value: a blue token for blue, a yellow token for yellow.
  - You reveal nothing about your own hand.
- **Naming yellow:** you say "this wire is yellow" while holding a yellow wire. It works like any other Dual Cut.

**Solo Cut:** when every remaining wire of one value is in your own hand, cut them all at once without a teammate.
- **Blue:** cut all 4 if nobody has cut that value yet, or the last 2 if a pair is already cut.
- **Yellow:** cut all remaining yellow wires.

**Reveal Red Wires:** if every uncut wire on your stand is red, turn them all face up.

**Validation:** when all four wires of a blue value are cut, place a validation token on that number.

### Character: Double Detector (once per mission)

During a Dual Cut, name a value and point at **two** wires on the same teammate's stand.
- **At least one matches:** the cut succeeds. If both match, the teammate picks which one is cut, without saying why.
- **Neither matches:** the cut fails. The dial advances, and the teammate places an info token on one of the two wires (their choice).
- **Exactly one of the two is red:** the bomb does **not** explode. Instead, the teammate places an info token on the wire that isn't red.

### Equipment

- An equipment card **unlocks** once 2 wires of the value in its corner have been cut.
- Each card can be used once, by anyone, at any time unless its text says otherwise.
- Several cards can be used in a row.
- X/Y ray can combine with the Double, Triple or Super Detector.
- Effects and timing: see [Equipment cards](#equipment-cards).

### Communication

- **Not allowed:**
  - talking about the wires in your hand or hinting at their values
  - reminding others what happened on earlier turns
  - sharing guesses out loud
- **Allowed:** general tactics, equipment use, special rules, and reminding a teammate they have equipment.

Online, the game can't enforce this. The UI shows everything that's legitimately public (cut wires, info tokens, validation tokens, the turn log), so players have no need to talk about it.

### Win and loss

- **Win:** every stand is empty.
- **Loss:** a red wire is cut, or the dial reaches the skull.
- **After either:** the mission ends, the captain passes to the left, and the team can retry the mission or move to the next one.

## Card Data

From the physical cards and board.

### Missions 1–8

| # | Name | Blue values in play | Red in play | Yellow in play | Equipment used | Characters used | Special rules (back of card) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | TRAINING, Day 1 — Lesson 1: How to cut a wire | 1–6 (24 wires) | 0 | 0 | None (no equipment on the board) | Standard character cards; info tokens used as normal | None |
| 2 | TRAINING, Day 2 — Lesson 2: How to cut a yellow wire | 1–8 (32 wires) | 0 | 2, drawn at random from 1.1–7.1 | None (no equipment on the board) | Standard character cards; yellow info tokens can't be used during setup | None |
| 3 | TRAINING, Day 3 — Lesson 3: How (NOT!) to cut a red wire | 1–10 (40 wires) | 1, drawn at random from 1.5–9.5 | 0 | One card per player, excluding equipment #2 and #12 | Standard character cards | None |
| 4 | TRAINING: First day in the field — Time to put theory into practice | 1–12 (all 48 wires) | 1, any value (1.5–11.5) | 4, any values (1.1–11.1) | One card per player | Standard character cards | None |
| 5 | TRAINING: Second day in the field — This is a minefield, not the yellow brick road | 1–12 (all 48 wires) | 1 (2 players: 2) | 2 out of 3; the 3 candidates' markers go "?" side up | One card per player | Standard character cards | None |
| 6 | TRAINING: Third day in the field — What is bold yellow and ready for a new action? 4 yellow wires that must be cut | 1–12 (all 48 wires) | 1 (2 players: 2) | 4 | One card per player | Standard character cards | None |
| 7 | TRAINING: Last day of class — Looks like you're seeing double. Are you ready with red being red? | 1–12 (all 48 wires) | 1 out of 2 (2 players: 1 out of 3); candidates' markers go "?" side up | 0 | One card per player | Standard character cards | None |
| 8 | FINAL EXAM — Today is the big day. Your extensive bomb disposal training missions have led you here. Are you ready to face the fuse and pass the final exam? | 1–12 (all 48 wires) | 1 out of 2 (2 players: 1 out of 3) | 2 out of 3 (2 players: 4) | One card per player | Standard character cards | None |

For "N out of M" red or yellow setups, write it that way (e.g. "1 out of 2"): M candidates are revealed and N go into play face down.

From mission 3 onwards, the board gets one equipment card per player unless the mission says otherwise. Some missions exclude specific cards (mission 3 excludes #2 and #12).

Red and yellow draws can be limited to a value range (missions 2 and 3), so their sort keys stay inside the blue values in play. From mission 4 on they use the full range.

Missions 5–8 have a different red/yellow setup for 2 players, shown in parentheses.

### Detonator dial

The dial starts as many spaces from the skull as there are players, capped at 5. The wrong guess that reaches the skull explodes the bomb.

| Players | Wrong guess that explodes the bomb |
| --- | --- |
| 2 | 2nd |
| 3 | 3rd |
| 4 | 4th |
| 5 | 5th |

In code: `dialLimit = Math.min(playerCount, 5)`; the bomb explodes when `wrongGuesses >= dialLimit`.

### Equipment cards

Each card unlocks once 2 wires of its number are cut (the number in its corner), and can be used once. "Any time" cards can be used by anyone, even outside their turn.

| # | Name | Timing | Effect |
| --- | --- | --- | --- |
| 1 | Label ≠ | Any time | Put the ≠ token in front of 2 of your adjacent wires that have different values. |
| 2 | Walkie-Talkies | Any time | Swap 2 wires: give a teammate one of your uncut wires face down; they do the same to you; each of you places the new wire in your stand. A player with 2 stands puts the new wire in the stand the given wire came from. Any uncut wire can be swapped, even red or yellow. Everyone sees which positions the swapped wires come from and go to. |
| 3 | Triple Detector | On your turn | During a Dual Cut, state a value (not yellow) and point at 3 wires on a teammate's stand. |
| 4 | Post-it | Any time | Put 1 info token in front of one of your blue wires. |
| 5 | Super Detector | On your turn | During a Dual Cut, state a value (not yellow) and point at a teammate's whole stand. |
| 6 | Rewinder | Any time | Move the detonator dial back 1 space. |
| 7 | Emergency Batteries | Any time | Choose 1 or 2 character cards that have already been used and flip them face up: their personal equipment is usable again this mission. |
| 8 | General Radar | Any time | State a number from 1 to 12. Every player, including you, says "yes" if they have one or more uncut blue wires of that value. |
| 9 | Stabilizer | Start of your turn | Flip it face down before a Dual Cut. If that cut fails, the detonator doesn't move; if it cuts a red wire, the bomb doesn't explode. |
| 10 | X or Y Ray | On your turn | During a Dual Cut, state 2 values (yellow allowed) while pointing at 1 wire. You must hold both values. |
| 11 | Coffee Mug | On your turn | Skip your turn and choose who the next active player is (without consulting teammates). |
| 12 | Label = | Any time | Put the = token in front of 2 of your adjacent wires that have the same value. |

X or Y Ray (#10) can be combined with the Double, Triple or Super Detector, to state 2 values while pointing at several wires.

### Character cards

All 5 base characters, including the Captain, have the same personal equipment: the **Double Detector**, usable once per mission (rules [above](#character-double-detector-once-per-mission)). Emergency Batteries (#7) can make it usable again.

## Online Design

### Hidden information and who resolves a cut

A cut has to check a **teammate's hidden wire**, but stands are private, so the active player's client can't read it. Proposed model, keeping the trusted-client approach used by Clover and Robotrick:

1. **The active player declares the cut.** It's written to the public game document as `pendingAction = { by, target, slot, value, detector? }`.
2. **The target's client resolves it automatically.** It can read its own stand, so it checks the declared slot inside a transaction and applies the outcome: reveal or place an info token, advance the dial, end the mission. No click is needed from the target.
3. **Choices fall back to the target.** When the rules give the target a choice, such as which of two matching wires a Double Detector cuts, the target's screen asks them.
4. **The active player's matching wire comes from their own client.** If the cut succeeds, the pending action becomes `{ kind: "own-cut" }` and the active player's client reveals one of their own matching wires. A Solo Cut or Reveal Red is checked entirely against the player's own stand, so it resolves in one step.

Firestore can't store arrays directly inside arrays, so each stand is wrapped for storage: `{ slots }` publicly and `{ wires }` in hands. The engine works with plain nested arrays and converts at the boundary.

This keeps every stand readable only by its owner and avoids giving the host a peek. The cost is that a cut needs the target's client to be connected. If the target is disconnected for more than a few seconds, show "Waiting for {name}…". A Cloud Function could remove that limitation later.

### Data model

```ts
type BBColor = "blue" | "red" | "yellow";
interface BBWire { id: string; color: BBColor; value: number; sortKey: number } // value: 1–12 for blue; sortKey 1.5 etc. for red/yellow

// Public view of one slot on someone's stand (positions matter: you point at a slot)
interface BBPublicSlot {
  cut: boolean;
  revealed?: { color: BBColor; value?: number };          // once cut
  info?: { color: "blue" | "yellow"; value?: number };    // info token on an uncut wire
}

type BBPhase = "setup-info" | "playing" | "resolving" | "mission-won" | "mission-lost";

interface BBGame {
  gameType: "bomb-busters";
  missionId: number;
  phase: BBPhase;
  playerOrder: string[];        // clockwise from the captain
  captain: string;
  stands: Record<string, BBPublicSlot[][]>;     // per player, 1 or 2 stands
  turn: string;
  dial: { wrongGuesses: number; limit: number }; // limit = min(players, 5); explodes at limit
  wireTotals: { blue: Record<number, number>; red: number; yellow: number }; // what's in play (public)
  cutCounts: { blue: Record<number, number>; red: number; yellow: number };
  validated: number[];          // blue values fully cut
  equipment: { id: string; unlocked: boolean; used: boolean }[];
  characters: Record<string, { id: string; used: boolean }>;
  pendingAction: BBPendingAction | null;
  log: { at: number; text: string }[];          // public turn log
  result: { outcome: "won" | "lost"; reason: string } | null;
}

interface BBHand {                  // games/{room}/hands/{uid}, owner-readable only
  ownerUid: string;
  stands: BBWire[][];               // sorted ascending by sortKey; positions mirror the public slots
}
```

### Engine (pure, unit-tested)

`src/games/bomb-busters/engine.ts`:
- **Setup:**
  - `buildWirePool(mission, random)`
  - `standLayout(playerCount)` (stands per player)
  - `deal(pool, layout)` → sorted stands
- **Checks:**
  - `canDualCut(hand, value)`
  - `canSoloCut(hand, value, wireTotals, cutCounts)`
  - `canRevealRed(hand)`
- **Resolving:**
  - `resolveDualCut(targetWire, declared)` → `"success" | "wrong" | "explode"`
  - `resolveDoubleDetector(wireA, wireB, declared)`
  - `applyOutcome(game, …)` → updated public state: dial, info tokens, cut counts, validation, win/loss
- **Missions:** `missions.ts` as data, plus small named rule hooks for missions that change the rules:

  ```ts
  interface BBMission {
    id: number;
    name: string;
    blue: { from: number; to: number };                          // e.g. 1–6
    red: { count: number; outOf?: number; from?: number; to?: number };    // range of decimals, e.g. 1.5–9.5
    yellow: { count: number; outOf?: number; from?: number; to?: number };
    equipment: { count: "players" | 0; exclude?: number[] };    // e.g. mission 3 excludes [2, 12]
    twoPlayer?: { red?: BBMission["red"]; yellow?: BBMission["yellow"] }; // 2-player overrides (missions 5–8)
    rules: string[];                                             // rule-hook ids
  }
  ```

## Phase Contract

| Phase | Who can act | Exit condition |
| --- | --- | --- |
| `setup-info` | Each player in order, starting with the captain | Everyone has placed their setup info token |
| `playing` | The player in `turn` | A Solo Cut or Reveal Red resolves at once (next turn). A Dual Cut moves to `resolving`. |
| `resolving` | The target's client (automatic, or the target's choice when the rules call for one) | Outcome applied: next turn, or `mission-won` / `mission-lost` |
| `mission-won` / `mission-lost` | Host | Retry, next mission, or back to lobby |

## Firestore

- **Hands:** add `bomb-busters` to `hasPrivateHands`. Hands are readable and updatable only by their owner, and the host creates them at setup.
  - Unlike Robotrick, there's no host read: a cut never needs anyone but the target to see a hand.
  - Cleanup (Resign and Back to Lobby) goes through the shared `clearGameData` helper, which deletes hands by player ID instead of listing them. This also fixes non-host resigns in Clover and Robotrick.
- **Game document:** writable by room members, like the other games. Every action is a transaction that checks phase, turn and `pendingAction`.
- **Emulator tests:** owner-only read, no peeking by other players or the host, and the target's resolution write.

## UI Plan

Reuse the shared pieces: `GameBanner`, `TurnStatus`, `PlayerScores` (for the mission summary), `GameEndButtons`, `ResignButton`, `useCelebration`, and `game-card` / `.selected` for selecting a wire. Use themed variables only, and support dark mode.

- **Bomb board:**
  - the detonator dial (position and skull), the validation track 1–12, and the equipment row (locked, unlocked, used)
  - the mission card summary, with counts of red and yellow wires in play
- **Teammates' stands:** a row of wire backs in stand order. Cut wires show face up in place, and info tokens sit under their wire. Click a wire to target it.
- **Your stand:** your wires face up and sorted. Cut wires are marked; wires you can't legally use are dimmed.
- **Cut flow:**
  1. Pick a teammate's wire.
  2. Pick a value from the values you hold, or "Yellow".
  3. Confirm. The Double Detector adds "pick a second wire" before confirming.
- **Resolving:** "Waiting for {name}'s stand…" for the active player. A choice prompt appears only for the target when the rules require one.
- **Turn log:** a short public history, e.g. "Ana tried 7 on Ben's 3rd wire: wrong (it's a 5)". It replaces the memory players aren't allowed to share aloud.
- **Mission end:** a defused or exploded screen with the reason. The host chooses Retry, Next mission or Back to lobby.

## Implementation Order

1. **Turn [Card Data](#card-data) into data files:** `missions.ts` and `equipment.ts`. Characters are all the Double Detector, so they need no data file.
2. **Engine and unit tests:** wire pool, stands, dealing and sorting, legality checks, Dual Cut, Solo Cut, Reveal Red, Double Detector, the dial, validation, win and loss. Include a simulated full mission.
3. **Actions and rules:** types, `useBombBustersGame.ts` actions (start, setup token, declare cut, target resolve, solo cut, reveal red, next mission or retry), Firestore rules and emulator tests.
4. **Registration:** add the game to the lobby (meta with `modes: ["co-op"]`, 2–5 players), the icon, `GameRouter` and the README.
5. **Board and cut-flow UI.** Test with two or three browser sessions.
6. **Equipment and characters** used by missions 4–8, one card at a time, each with unit tests.
7. **Mission progression:** a mission picker in the lobby (unlocked in order), retry and next-mission flow, and a full playthrough of missions 1–8.

## Definition of Done (first release: missions 1–8)

- 2–5 players can finish missions 1–8, winning and losing, without refreshes or manual database edits.
- Every equipment card and character used in missions 1–8 works as its card text says, with unit tests.
- No player can read another player's stand, including the host.
- Every rule check (holding the named value, Solo Cut eligibility, all-red reveal, turn order) is enforced in transactions, not just the UI.
- The dial, info tokens, validation and the red-wire explosion all match the rules. A mission can be retried with the next captain.
- Works on touch and desktop, in dark mode, using the shared lobby and end-game components.
