// ~200 single-word noun cards for gameplay
export const NOUN_CARDS: string[] = [
  // Animals (varied: land, sea, air, big, small, domestic, wild)
  "elephant", "goldfish", "eagle", "spider", "dolphin", "penguin",
  "chameleon", "lobster", "owl", "tortoise", "bat", "jellyfish",
  "kangaroo", "flamingo", "octopus", "porcupine", "sloth", "parrot",

  // Foods (varied: fruits, meals, snacks, sweets, savory)
  "watermelon", "pretzel", "sushi", "waffle", "avocado", "dumpling",
  "pineapple", "chocolate", "mushroom", "mango", "popcorn", "steak",
  "croissant", "pickle", "noodle", "grape",

  // Vehicles (varied: land, air, water, old, modern)
  "helicopter", "submarine", "bicycle", "sailboat", "ambulance",
  "skateboard", "motorcycle", "tractor", "canoe", "spaceship",
  "gondola", "bulldozer", "chariot", "trolley", "rocket", "hovercraft",

  // Household / Furniture (varied: rooms, sizes, functions)
  "chandelier", "toothbrush", "pillow", "blender", "bookshelf",
  "bathtub", "mirror", "vacuum", "hammock", "candle", "curtain",
  "thermostat", "doorbell", "couch", "teapot", "wardrobe",

  // Nature / Space (varied: land, water, sky, cosmic)
  "volcano", "glacier", "rainbow", "tornado", "waterfall",
  "canyon", "island", "desert", "aurora", "swamp",
  "galaxy", "moon", "asteroid", "meteor", "nebula", "comet",

  // Clothing / Accessories (varied: head, body, feet, formal, casual)
  "helmet", "sunglasses", "scarf", "boots", "crown",
  "backpack", "apron", "gloves", "poncho", "tiara",
  "sandal", "tuxedo", "bandana", "monocle", "sombrero", "kimono",

  // Tools / Instruments (varied: music, work, science)
  "guitar", "telescope", "hammer", "microscope", "violin",
  "trumpet", "wrench", "drum", "ladder", "shovel",
  "accordion", "paintbrush", "stethoscope", "anvil", "flute", "compass",

  // Buildings / Structures (varied: old, modern, big, small)
  "lighthouse", "castle", "bridge", "skyscraper", "pyramid",
  "igloo", "windmill", "cathedral", "stadium", "pagoda",
  "barn", "cabin", "fortress", "gazebo", "silo", "treehouse",

  // Sports / Toys (varied: active, tabletop, solo, team)
  "trampoline", "surfboard", "boomerang", "frisbee", "kite",
  "chess", "dice", "dart", "lasso", "javelin",
  "domino", "pinwheel", "slingshot", "basketball", "whistle", "trophy",

  // Mythical / Fantasy
  "dragon", "mermaid", "unicorn", "phoenix", "gargoyle",
  "griffin", "centaur", "wizard", "sphinx", "goblin",
  "cyclops", "fairy", "kraken", "pegasus", "minotaur", "golem",

  // Miscellaneous (varied: old, new, big, small, common, rare)
  "anchor", "globe", "hourglass", "magnet", "parachute",
  "scarecrow", "lantern", "envelope", "feather", "balloon",
  "pendulum", "sundial", "prism", "medal", "key", "flag",
];

// Context clues — where/when you'd find or encounter the thing
export const CONTEXT_CLUES: string[] = [
  "Found outdoors",
  "Found in a kitchen",
  "You could give it as a gift",
  "Related to sports",
  "Found in a school",
  "Associated with water",
  "Found in a museum",
  "A child would enjoy it",
  "Found at a party",
  "Associated with winter",
  "Found in a hospital",
  "Used at the beach",
  "Found in an office",
  "Associated with camping",
  "Found in a garage",
];

// Attribute clues — physical or functional properties
export const ATTRIBUTE_CLUES: string[] = [
  "Usually bigger than a person",
  "Has moving parts",
  "Is soft",
  "Contains metal",
  "Is edible",
  "Can hold water",
  "Is round or circular",
  "Has a handle",
  "Is colorful",
  "Is alive",
  "Is heavier than a cat",
  "Makes noise",
  "Is flat",
  "Can break easily",
  "Has wheels",
];

// Word clues — based on the spelling/word itself
export const WORD_CLUES: string[] = [
  "Has more than 6 letters",
  "Starts with a vowel",
  "Has exactly 1 syllable",
  "Contains double letters",
  "Starts with S",
  "Has fewer than 5 letters",
  "Contains the letter E",
  "Starts with B or C",
  "Contains the letter O",
  "Ends with a vowel",
  "Has exactly 2 syllables",
  "Starts with a letter in the first half of the alphabet",
  "Contains the letter R",
  "Rhymes with a common word",
  "Has exactly 4 letters",
];

export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
