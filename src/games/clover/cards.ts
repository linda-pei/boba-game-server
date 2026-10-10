import type { CloverCard } from "../../types";
import { shuffled } from "../../utils/shuffle";

const WORDS = [
  "anchor", "apple", "arcade", "artist", "autumn", "badge", "bamboo", "beach",
  "beacon", "bear", "bell", "bicycle", "blizzard", "book", "bridge", "bubble",
  "camera", "candle", "castle", "cat", "cave", "chalk", "cherry", "clock",
  "cloud", "coffee", "comet", "compass", "concert", "cookie", "coral", "crown",
  "dance", "desert", "diamond", "dinosaur", "doctor", "dragon", "dream", "drum",
  "eagle", "earth", "echo", "engine", "feather", "festival", "fire", "flower",
  "forest", "fox", "galaxy", "garden", "ghost", "glacier", "globe", "gold",
  "guitar", "harbor", "honey", "horse", "hotel", "ice", "island", "jacket",
  "jungle", "key", "kite", "ladder", "lantern", "lemon", "library", "light",
  "lion", "magic", "map", "market", "mirror", "moon", "mountain", "movie",
  "museum", "music", "nest", "night", "ocean", "orange", "painter", "palace",
  "panda", "paper", "parade", "pearl", "pencil", "pepper", "piano", "pirate",
  "planet", "pool", "postcard", "puzzle", "rainbow", "river", "rocket", "rose",
  "sailor", "sand", "school", "shadow", "ship", "shoe", "silver", "skate",
  "sky", "snow", "song", "space", "spider", "spoon", "spring", "star",
  "station", "stone", "storm", "sun", "telescope", "theater", "ticket", "tower",
  "train", "treasure", "tree", "violin", "volcano", "water", "whale", "window",
  "winter", "wizard", "wolf", "world", "zebra",
] as const;

export function createCloverDeck(gameId: string, cardCount: number): CloverCard[] {
  const requiredWords = cardCount * 4;
  if (requiredWords > WORDS.length) {
    throw new Error(`Clover needs ${requiredWords} unique words, but only ${WORDS.length} are available.`);
  }

  const words = shuffled([...WORDS]).slice(0, requiredWords);
  const cards: CloverCard[] = [];

  for (let index = 0; index < cardCount; index += 1) {
    const start = index * 4;
    cards.push({
      id: `${gameId}-card-${index + 1}`,
      words: [words[start], words[start + 1], words[start + 2], words[start + 3]],
    });
  }

  return shuffled(cards);
}
