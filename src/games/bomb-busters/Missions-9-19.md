# Bomb Busters — Missions 9–19 Plan

Missions 9–19 add a **special rule** to almost every mission. The goal of this plan is to add them without the engine, actions or UI growing a pile of `if (missionId === n)` checks: **each special rule is its own module**, plugged in through a small set of named hooks.

Source notes: `9-19.txt` (your transcription of the mission cards). Missions 1–8 are in `Rules.md`.

## New components

- **Number cards:** a deck of 12 cards, 1–12. Used by missions 9, 11, 12, 15, 16 and 18.
- **Equipment "False Bottom" (yellow):** a 13th equipment card, added to the equipment pool from mission 9 onward. It unlocks once 2 yellow wires are cut. Effect: draw two more equipment cards at random from the unused ones and add them to the board.

## Missions 9–19

| # | Name | Red | Yellow | 2 players | Special rule (module) |
| --- | --- | --- | --- | --- | --- |
| 9 | A Sense of Priorities | 1 | 2 | 2 red, 4 yellow | `sequence` (3 number cards; 2 of each before the next) |
| 10 | A Rough Patch | 1 | 4 | 12-min timer | `timer` (15 min) + `freeTurns`; equipment #11 excluded |
| 11 | Blue on Red Looks Like We Are Dead | 0 | 2 | 4 yellow | `deadlyValue` (one number card's blue value acts like red); captain places no info token |
| 12 | Wrapped in Red Tape | 1 | 4 | 2 red, 4 yellow | `redTape` (each equipment also needs its number card's pair cut) |
| 13 | Red Alert | 3, dealt one per player | 0 | Captain gets 2 (one per stand) | `redAlert` (new "cut three reds" action; random setup info tokens) |
| 14 | High Risk Bomb Disposal Expert | 2 | 2 out of 3 | 2 red, 4 yellow | `rookie` (random roles; Rookie's failed Dual Cut explodes; no Stabilizer) |
| 15 | Mission in Russian | 1 out of 3 | 0 | 2 out of 3 red | `russianToolbox` (equipment face down; flips when a number card's 4 wires are cut) |
| 16 | Time to Reprioritize | 1 | 2 out of 3 | 2 red, 4 yellow | `sequence` (all 4 of each before the next) |
| 17 | Red Herring | 2 out of 3 | 0 | 3 red | `redHerring` (random roles; Red Herring's info tokens are all fake; no equipment) |
| 18 | Bat Helping Hand | 2 | 0 | 3 red | `batRadar` (only equipment #8, always usable; a number deck drives each turn; no setup info tokens) |
| 19 | In the Belly of the Beast | 1 | 2 out of 3 | — | `audioTimer` (no special rules; the mission's audio track sets the time limit) |

All missions use the full 48 blue wires and one equipment card per player unless noted.

## Architecture: rule modules

### Mission data references rules by id, with parameters

```ts
// missions.ts
{ id: 9,  ..., rules: [{ id: "sequence", params: { cards: 3, threshold: 2 } }] }
{ id: 16, ..., rules: [{ id: "sequence", params: { cards: 3, threshold: 4 } }] }
{ id: 10, ..., rules: [{ id: "timer", params: { minutes: 15, twoPlayerMinutes: 12 } }, { id: "freeTurns" }] }
```

Parameterized modules cover near-duplicates: missions 9 and 16 share `sequence`, and missions 14 and 17 share a `secretRole` helper.

### One file per rule

```
src/games/bomb-busters/rules/
  types.ts           MissionRule interface + hook contexts
  index.ts           registry (id → module) and helpers that fold hooks: rulesFor(game)
  numberDeck.ts      shared number-card deck helpers (draw, discard, reshuffle)
  secretRole.ts      shared random character deal (Rookie, Red Herring)
  sequence.ts        9, 16
  timer.ts           10
  freeTurns.ts       10
  deadlyValue.ts     11
  redTape.ts         12
  redAlert.ts        13
  rookie.ts          14
  russianToolbox.ts  15
  redHerring.ts      17
  batRadar.ts        18
  audioTimer.ts      19 (shares the countdown with timer.ts)
```

Each module also owns:
- **its UI panel,** e.g. the sequence cards, timer, number card or role badge, in `rules/ui/<rule>.tsx`
- **its unit tests,** in `rules/<rule>.test.ts`

Rule state lives in a namespaced bag on the game: `game.ruleState[ruleId]`, typed by its module. Nothing else reads another rule's state.

### Hooks

Every hook is optional. The engine and actions call the folded hook at a fixed point and never check mission ids. **"Runs on"** matters because stands are owner-only: a hook that needs a hand runs on that hand owner's client.

| Hook | When | Runs on | Used by |
| --- | --- | --- | --- |
| `setup(ctx)` | Building the mission | Host | Most: number cards, red dealing (13), roles (14, 17), equipment changes (12, 15, 18), initial `ruleState` |
| `setupInfoPolicy` | Setup info tokens | Each player | 11 (captain none), 13 (random token), 17 (2 fake for Red Herring), 18 (none) |
| `turnPolicy` | Who may act next | Any | 10 (free order, no back-to-back except 2 players) |
| `canCut(ctx, value)` | Declaring a Dual Cut / Solo Cut value | Active player | 9, 16 (sequence), 11 (can't cut the deadly value) |
| `isDeadly(wire, game)` | Resolving a pointed wire | Target | 11 (blue value acts like red) |
| `onWrongGuess(ctx)` | After a failed Dual Cut | Target | 14 (Rookie explodes), 17 (fake info token) |
| `extraActions` | Extra turn actions | Active player, then targets | 13 ("cut three reds"), 18 (turn starts with the number card + radar) |
| `afterCut(game, wire)` | After any wire is cut | Any | 9, 16 (advance the sequence), 12 (discard the number card), 15 (flip equipment), 18 (discard the number card) |
| `equipmentPolicy` | Unlocking / using equipment | Any | 12, 15 (unlock rules), 14, 17 (who can't use what), 18 (radar always usable) |
| `checkLoss(game, now)` | Each action, plus a client timer | Any | 10 (timer), 19 (audio track ends) |
| `Panel` / `describe` | Rendering | Everyone | All: the board widget and rule summary text |

The existing missions 1–8 have `rules: []`, so the refactor is behavior-neutral for them. The 62 existing tests guard that.

## Implementation order

1. **Framework and number cards:** `rules/types.ts`, the registry and the hook calls in the engine, actions and UI. Missions 1–8 unchanged. Add False Bottom.
2. **Simple rules:** `sequence` (9, 16), `deadlyValue` (11), `redTape` (12), `russianToolbox` (15). Each touches one hook family.
3. **Roles:** `secretRole`, then `rookie` (14) and `redHerring` (17).
4. **Turns and time:** `timer` and `freeTurns` (10), with a "Snip!" button to claim the turn.
5. **Multi-target actions:** `redAlert` (13), whose "cut three reds" needs each owner's client to confirm its pointed wires. `batRadar` (18).
6. **`audioTimer` (19):** play the publisher's audio track for everyone, linked from Pegasus's CDN rather than copied into the repo. The mission is lost if the track ends before the bomb is defused.
7. **Playthrough:** for each mission, add a simulation test where the rule allows it, then a manual playthrough.

## Decisions

Answered:

1. **False Bottom** joins the equipment pool from mission 9, unlocks after 2 yellow cuts, and draws 2 random unused cards onto the board.
2. **Missions 14 and 17:** whoever is dealt the Captain card (the Rookie / Red Herring) is also the first player. Mission 14's 2-player setup is 2 red, 4 yellow.
3. **Mission 13:** the 3 reds go to the first three players from the captain. With 2–3 players everyone holds at least one red, and nobody ever holds all 3, so "cut three reds" always points at wires on more than one stand, including your own.
4. **Mission 18:** each turn, the active player reveals the top number card N and runs the General Radar for N. Then the active player picks who must carry out a cut action for value N, which can be themselves. That player takes the cut (a Dual Cut naming N, or a Solo Cut of N).
5. **Mission 19:** no special rules. Everyone plays the mission's audio track, which acts as the timer.

Defaults (change any of these if they're wrong):

6. **Mission 9:** 1 red and 2 yellow wires, plus the number-card component.
7. **Mission 10:**
   - "Snip!" is a button any eligible player can press to claim the turn.
   - The bomb explodes when the timer runs out.
   - With 2 players, back-to-back turns are allowed.
8. **Mission 11:** other players place setup info tokens as usual, including on the deadly value. Naming the deadly value in a Dual Cut is blocked, since a successful cut of it would explode anyway.
9. **Mission 12:** if a number card shows the same value as the equipment it covers, cutting that value's first pair satisfies both.
10. **Mission 15:** each time a number card's 4 wires are cut, a random face-down equipment card flips.
11. **Mission 17:** Red Herring's General Radar answers and Walkie-Talkies swaps are truthful. Only info tokens are fake.
