/** The 12 number cards (1–12), shared by missions 9, 11, 12, 15, 16 and 18. */
export function createNumberDeck(random: () => number = Math.random): number[] {
  const deck = Array.from({ length: 12 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Draw `count` cards from the top; returns the drawn cards and the rest of the deck. */
export function drawNumbers(deck: number[], count: number): { drawn: number[]; deck: number[] } {
  return { drawn: deck.slice(0, count), deck: deck.slice(count) };
}
