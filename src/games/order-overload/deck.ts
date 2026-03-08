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

const duckduckGooseEntries: [string, number][] = [
  ["Duck", 5],
  ["Canada Goose", 5],
  ["Squirrel", 5],
  ["Birb", 5],
  ["Chipmunk", 3],
  ["Doggo", 3],
  ["Baby Duck", 3],
  ["Smol Birb", 3],
  ["Psyduck", 2],
  ["Rubber Duck", 2],
  ["Tortle", 2],
  ["Baby Goose", 2],
  ["Hummingbirb", 2],
  ["Chubby Squirrel", 2],
  ["Corgi", 2],
  ["Cucco", 2],
  ["Bunny", 2],
  ["Mama Goose", 2],
  ["Hawaiian Goose", 2],
  ["Pikmin", 2],
  ["Froggo", 2],
  ["Aflac Duck (Quack!)", 1],
  ["SNAKE O_O", 1],
  ["Donald Duck", 1],
  ["Duck Hunt Duck", 1],
  ["Duck Hunt Doggo", 1],
  ["Doog (Not a Cow)", 1],
  ["Maya", 1],
  ["Untitled Goose with a Knife", 1],
  ["Rubber Duck w/ Sunglasses", 1],
  ["Squirtle", 1],
  ["Teenage Mutant Ninja Turtle", 1],
  ["Chubby Squirrel w/ a French Fry", 1],
  ["Chip & Dale", 1],
  ["Skunk", 1],
  ["Roast Duck", 1],
  ["Peking Duck", 1],
  ["Angry Mama Goose", 1],
  ["Ugly Baby Duck", 1],
  ["Wet Doggo", 1],
  ["Mushroom", 1],
  ["Flamingogo", 1],
  ["DuckDuckGo", 1],
  ["Bugs Bunny", 1],
  ["Salamander", 1],
  ["Barking Doggo", 1],
  ["Shuckle?!", 1],
];

const pokemonEntries: [string, number][] = [
  ["Rattata", 5],
  ["Pidgey", 5],
  ["Zubat", 5],
  ["Paras", 5],
  ["Raticate", 3],
  ["Pidgeotto", 3],
  ["Golbat", 3],
  ["Staryu", 3],
  ["Pidgeot", 2],
  ["Parasect", 2],
  ["Growlithe", 2],
  ["Starmie", 2],
  ["Exeggcute", 2],
  ["Spearow", 2],
  ["Fearow", 2],
  ["Slowpoke", 2],
  ["Jigglypuff", 2],
  ["Sandshrew", 2],
  ["Meowth", 2],
  ["Pikachu", 2],
  ["Eevee", 2],
  ["Pichu", 1],
  ["Vaporeon", 1],
  ["Jolteon", 1],
  ["Flareon", 1],
  ["Espeon", 1],
  ["Umbreon", 1],
  ["Leafeon", 1],
  ["Glaceon", 1],
  ["Sylveon", 1],
  ["Arcanine", 1],
  ["Alolan Raichu", 1],
  ["Slowbro", 1],
  ["Raichu", 1],
  ["Mew", 1],
  ["Mewtwo", 1],
  ["Exeggcutor", 1],
  ["Sandslash", 1],
  ["Bulbasaur", 1],
  ["Charmander", 1],
  ["Squirtle", 1],
  ["Ditto", 1],
  ["Zapdos", 1],
  ["Articuno", 1],
  ["Moltres", 1],
  ["Articuno", 1],
  ["Shuckle?!", 1],
];

/** Registry of available decks. */
export const DECKS: Record<string, { label: string; entries: [string, number][] }> = {
  cafe: { label: "Cafe", entries: cafeEntries },
  duckDuckGoose: { label: "Duck Duck Goose", entries: duckduckGooseEntries },
  mtg: { label: "Magic: The Gathering", entries: mtgEntries },
  pokemon: { label: "Pokémon", entries: pokemonEntries, },
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
