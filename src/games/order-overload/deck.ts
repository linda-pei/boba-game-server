/** Order decks for Order Overload. Common items have multiple copies. */

const cafeEntries: [string, number][] = [
  // Coffee drinks — common
  ["Hot Coffee", 5],
  ["Iced Coffee", 5],
  ["Hot Latte", 5],
  ["Iced Latte", 5],
  ["Cappuccino", 3],
  ["Espresso", 2],
  ["Double Espresso", 2],
  ["Cold Brew Coffee", 2],

  // Tea drinks — common
  ["Iced Lemon Tea", 3],
  ["Iced Milk Tea", 3],
  ["Hot Tea", 3],
  ["Bubble Milk Tea", 2],
  ["Matcha Latte", 2],

  // Specialty coffee
  ["Caramel Macchiato", 2],
  ["Cafe Mocha", 2],
  ["Soy Latte", 2],
  ["Almond Caramel Latte", 1],
  ["Extra Hot Cafe Latte", 1],
  ["Room Temperature Coffee", 1],
  ["Iced Coffee Without Ice", 1],

  // Non-coffee/tea drinks
  ["Orange Juice", 2],
  ["Apple Juice", 2],
  ["Chocolate Shake", 1],
  ["Vanilla Shake", 1],
  ["Banana Shake", 1],
  ["Strawberry Milk", 1],
  ["Banana Milk", 1],
  ["Milk", 1],
  ["Lemonade", 1],

  // Foods
  ["Apple Pie", 2],
  ["Ham & Cheese Sandwich", 2],
  ["Hot Ham & Cheese Sandwich", 1],
  ["Chocolate Gateau", 2],
  ["Cinnamon Roll", 1],
  ["Glazed Donut", 1],
  ["Pancake", 1],
  ["Mille Crepe", 1],
  ["Egg Sandwich", 1],
  ["French Toast", 1],
  ["Banana", 1],
  ["Chocolate Chip Cookie", 1],
  ["Tuna Sandwich", 1],
  ["Cheese Cake", 1],
  ["Lemon Cake", 1],
  ["Chiffon Cake", 1],
  ["Chocolate Croissant", 1],
  ["Banana Muffin", 1],
];

const mtgEntries: [string, number][] = [
  // Creatures — common
  ["Llanowar Elves", 4],
  ["Grizzly Bears", 3],
  ["Serra Angel", 3],
  ["Shivan Dragon", 2],
  ["Mother of Runes", 2],
  ["Prodigal Sorcerer", 2],
  ["Royal Assassin", 2],
  ["Sengir Vampire", 2],
  ["Air Elemental", 2],
  ["Tarmogoyf", 1],
  ["Snapcaster Mage", 1],
  ["Dark Confidant", 1],
  ["Goblin Guide", 1],
  ["Thalia", 1],
  ["Delver of Secrets", 1],
  ["Emrakul", 1],
  ["Nicol Bolas", 1],
  ["Craterhoof Behemoth", 1],
  ["Wurmcoil Engine", 1],
  ["Blightsteel Colossus", 1],
  ["Stoneforge Mystic", 1],
  ["Young Pyromancer", 1],

  // Instants & sorceries
  ["Lightning Bolt", 3],
  ["Counterspell", 3],
  ["Giant Growth", 2],
  ["Dark Ritual", 2],
  ["Swords to Plowshares", 1],
  ["Wrath of God", 2],
  ["Swords to Plowshares", 2],
  ["Path to Exile", 1],
  ["Brainstorm", 1],
  ["Demonic Tutor", 1],
  ["Ancestral Recall", 1],
  ["Time Walk", 1],

  // Artifacts
  ["Sol Ring", 2],
  ["Black Lotus", 1],
  ["Nevinyrral's Disk", 1],
  ["Aether Vial", 1],
  ["Chrome Mox", 1],
  ["Chalice of the Void", 1],
];

/** Registry of available decks. */
export const DECKS: Record<string, { label: string; entries: [string, number][] }> = {
  cafe: { label: "Cafe", entries: cafeEntries },
  mtg: { label: "Magic: The Gathering", entries: mtgEntries },
};

function flatten(entries: [string, number][]): string[] {
  return entries.flatMap(([name, count]) =>
    Array.from({ length: count }, () => name)
  );
}

/** Get the flat deck array for a given deck ID. */
export function getDeck(deckId: string): string[] {
  const deck = DECKS[deckId] ?? DECKS.cafe;
  return flatten(deck.entries);
}

/** Get unique order names for a given deck ID. */
export function getUniqueOrders(deckId: string): string[] {
  const deck = DECKS[deckId] ?? DECKS.cafe;
  return deck.entries.map(([name]) => name);
}
