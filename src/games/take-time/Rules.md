# Overview
Take time is a co-op game consisting of 40 tests, divided into 10 chapters each with 4 tests. In the lobby, we should be able to pick which chapter and which test (eg. I-1, I-2, I-3, I-4, II-1, II-2, II-3, II-4, all the way up to X-4 where the chapter is a Roman numeral).

# Setup
Game consists of circular clock like object composed of 6 segments, with a hand pointed to the starting segment. In later levels, the players will choose which segment the game will start on.
Each test has a different clock, so we'll have to define a level for each - each clock may have a special rule in the center. Each segment additionally main contain a rule We should likely consider some sort of level editor that defines how each segment is encoded.
There is one reminder token corresponding to the number of players playing. Shared resource between all players.
The deck is composed of 12 black cards, 1-12, and 12 white cards, 1-12.
Always deal 12 cards, at 4 players, each player gets 3 cards. At 3, each player gets 4. At 2, each player gets 6 cards, they see an initial set of 4 of the 6, and only see the remaining once BOTH players have played 2 cards from hand.

# Play
Playing a test consists of 3 Phases:
Discussion - Players discover the nature of the test and discuss their strategy without looking at their cards.
Placement - Players place cards facedown next to the segments
of the clock in an effort to satisfy the general rules Rule for the game, as well as any special rules that apply
to the current clock.
Resolution - Players ensure that they have placed at least
1 card next to each segment around the clock, and that the sum of the card values next to each segment are in ascending numerical order without exceeding 24. Additionally, they must also verify that they adhered to any special rules for the test.

# Discussion
After dealing (so players can see backs of cards) but BEFORE any players are allowed to look at their cards, players may freely discuss the strategy for the level (and move the clock hand if applicapable). Once all players are ready, the game starts and players may no longer talk freely.

# Placement
Any player can begin this phase by playing 1 card from their hand facedown. Play then proceeds clockwise from there until all players have placed their cards. 
By default, cards should be placed facedown around the clock. However, during each test, players may collectively place as many faceup cards as there are eye symbols on the Reminder token (ie equal to the number of players). The placing of faceup cards may be done freely among the players but the decision to do so cannot be discussed openly during this Phase.
# Resolution
Starting with the segment with the Clock Hand and proceeding clockwise, reveal each facedown card, being careful not to alter the order of the cards.
The value of a segment is equal to the sum of the values on the cards placed next to it.

To pass the test:
1. At least 1 card must have been placed next to each of the 6 segments.
2. The value of each segment must be equal to or greater than the previous segment. In other words, the segments must increase in value (or remain the same) as you proceed clockwise from the Hand.
3. The value of each segment must be less than or equal to 24. Note that this limit does not apply to the first 3 clocks from Chapter 1 (as indicated by the symbol in the middle of the clock).
In addition to these requirements, each clock has special rules that you must comply with in order to pass the Test. Each of these are explained on the Rules sheet for the Chapter. Some rules apply to the entire clock, while others apply to a specific segment.
Individual segments may be affected by several rules. Most of these rules are conditions that must be met during the Resolution Phase, while others indicate what is allowed during the Placement Phase.

If you pass the test, proceed to the next chapter.

# Levels
I'll start by enumerating some of the levels to give you a sense, but we'll need to add support for additional levels. Assume all non-described segments don't have rules. When a number of cards is listed, it's always exact.
## Chapter I - Awakening
1w = 1 white card only, 1w1b = 1 white 1 black card only, 3c = 3 cards only
[a, b] = sum must be inclusive between a, b
T1 = Starting player must play here on turn 1
T2 = Second player must play here on turn 2
|x| = Must be segment closest in value to 6, ties are ok

### I-1
Clock: Infinity - Segment values may exceed 24
Clock hand: Starts at 1 (not adjustable)
1. 1w
6. 3c

### I-2
Clock: Infinity - Segment values may exceed 24
Clock hand: Starts at 1 (not adjustable)
3. [8, 12]
4. 3c

### I-3
Clock: Infinity - Segment values may exceed 24
Clock hand: Starts at 1 (not adjustable)
2. T2
3. T1
6. [20, 30]

### I-4
Clock hand: Starts at 1 (not adjustable)
1. |6|
4. 1b, 1w

## Chapter II - Limitation
x(1,2,3) = No card of any of the depicted values can be placed next to this segment
### II-1
Clock hand: Starts at 1 (not adjustable)
1. x(1,2,3)
2. x(1,2,3)
3. x(1,2,3)

### II-2
Clock hand: Starts at 1 (not adjustable)
3. x(7,8,9)
4. x(7,8,9)

### II-3
Clock hand: Starts at 1 (not adjustable)
1. x(1,2,3)
3. x(4,5,6)
4. x(7,8,9)
6. x(10,11,12)

### II-4
Clock hand: Starts at 1 (not adjustable)
Special rule: No cards can be played face-up.

## Chapter III - As within, so without
During discussion phase, players can consult to determine which segment to point clock hand against as the starting segment. Clock hand cannot be moved during Placement. However, after all cards have been revealed during Resolution, it may be moved to a different segment as needed.
Max = Card with highest value played by the group must be next to this segment, ties are fine
Min = Card with lowest value played by the group must be played next to this segment, ties are fine. If there's multiple min, each segment must have one of the two lowest values.
TLast = Final card player by group must be hear.
WMax = White card with highest value played by the group must be next here.
Accordingly for WMin (white, lowest value), BMax, BMin.

### III-1
1. Max
3. 20

### III-2
1. Min
2. TLast
4. Min

### III-3
1. Max
3. Min
4. T1 T2

### III-4
1. BMax
3. 2c
4. |6|
5. WMin

## Chapter IV - Roar
Clock rules
+ to - = On your turn, you must play the highest value in your hand. If you have two cards of the same highest values, you choose which to play.
- to + = On your turn, you must play the lowest value in your hand. If you have two cards of the same lowest values, you choose which to play.
Locked -> = Once the cards have been flipped after Discussion phase, order cannot be changed. You must always play the leftmost card in your hand.
### IV-1
Clock: + to -
1. T1
4. 1c
### IV-2
Clock: - to +
1. T1
2. Max
### IV-3
Clock: Locked ->
1. x(1,2,3)
3. x(1,2,3)
5. x(1,2,3)
### IV-4
Clock: Locked ->
1. |12|
2. Min
3. Max
## Chapter V - Tranquility
All levels in this chapter have clock rule: There must be exactly 2 cards next to each segment
### V-1
No additional rules

### V-2
1. Min
5. |15|

### V-3
1. Min
2. Max

### V-4
1. T3
2. 1b1w
3. 1b1w
4. T2

## Chapter VI - As above, so below
All levels in this chapter have Clock rules: Card - Card - There must be exactly 2 cards next to each segment. Also instead of summing the values, it is the difference between the highest and lowest that matters. To pass the test, the difference must increase going around.

### VI-1
1. Max

### VI-2
1. x(1,2,3)
2. 1b1w


### VI-3
1. |12|
4. T2, T3

### VI-4
1. BMax
4. WMin
5. |24|

## VII - Intrusion
Draw - When you place a card next to the segment, immediately draw the first card from the deck if able. The deck consists of the cards that were not dealt ou during setup. As uaual, placement ends when all players have placed all of the cards from their hands. If some players have run out of cards, the players who still have cards will continue to play until they run out.
### VII-1
1. Draw
3. x(7,8,9)
4. x(7,8,9)
### VII-2
1. Draw
4. Draw
5. TLast
### VII-3
1. WMin, BMax
2. Draw
3. 2b2w
### VII-4
1. Draw
3. Draw
5. Draw

## VIII - Revolution
Segment Rules:
Clockwise - When you place a card next to this segment, rotate the clock one segment clockwise. The cards around the clock and the clock hand remain in their original position.
Counter-Clockwise - When you place a card next to this segment, rotate the clock one segment counter-clockwise. The cards around the clock and the clock hand remain in their original position.
X - Players are not allowed to place a card next to this sgement. In order to have cards next to this segment, you will need to rotate the clock.
### VIII-1
1. Clockwise
3. X
5. [16,20]
### VIII-2
1. Clockwise
3. X
4. Clockwise
5. X
6. X
### VIII-3
1. 1c
2. Clockwise
3. Clockwise
4. Clockwise
5. 2c
### VIII-4
Clock hand: Starts at 1 and roates with the board
