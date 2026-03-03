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
  "Most people have touched it",
  "You expect to find it at a school",
  "Mostly found outside",
  "Can be dangerous",
  "Useful",
  "Man-made",
  "Found in an office",
  "Most people have it at home",
  "Usually worth more than $100",
  "Usually only owned by rich people",
  "Makes people happy",
  "Easily found if lost",
  "Usually found with others nearby",
  "Can be bought in a store",
  "Single use",
];

// Attribute clues — physical or functional properties
export const ATTRIBUTE_CLUES: string[] = [
  "Would hurt if dropped on you",
  "Flammable",
  "Often has spots or stripes",
  "Contains wood",
  "Has one or more holes",
  "Alive",
  "Weighs more than a chair",
  "Bigger than a person",
  "You can look through it",
  "Has a point or a spike",
  "Usually round or curved",
  "Floats in water",
  "Shiny or reflective",
  "Easy to destroy",
  "Often makes a sound",
  "Contains plastic",
];

// Word clues — based on the spelling/word itself
export const WORD_CLUES: string[] = [
  "Has an 'O'",
  "Has 2 syllables",
  "Has 1 syllable",
  "5 or fewer letters long",
  "Starts with a vowel or 'Y'",
  "Exactly 5 letters long",
  "Has an 'R'",
  "Has a consecutive double letter (eg 'TT')",
  "Has 2 or more different vowels",
  "First letter is repeated within the world (eg. Rural)",
  "Has 4 or fewer unique letters",
  "Is a compound word (eg. underground)",
  "Starts with a letter from A-M",
  "Has 1 or more repeated letters (eg Total)",
  "Ends with a consonant or 'Y'",
  "Has 3 or more consecutive consonants (eg Fight)",
  "Ends with a letter from N-Z",
];

export { shuffled } from "../../utils/shuffle";
