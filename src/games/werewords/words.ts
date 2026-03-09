export type Difficulty = "easy" | "medium" | "hard" | "impossible";

export const WORD_LISTS: Record<Difficulty, string[]> = {
  easy: [
    "pizza", "beach", "cat", "dog", "rain",
    "sun", "tree", "book", "chair", "shoe",
    "cake", "ball", "hat", "milk", "door",
    "fire", "snow", "star", "apple", "house",
    "water", "bread", "moon", "car", "phone",
    "bed", "egg", "lamp", "boat", "clock",
    "candy", "park", "train", "cloud", "tooth",
    "piano", "knife", "ring", "robot", "truck",
    "heart", "grass", "key", "ocean", "rock",
    "drum", "tower", "bridge", "wheel", "soap",
    "kite", "spoon", "hammer", "bucket", "scissors",
    "pillow", "mirror", "candle", "ladder", "broom",
    "fence", "garage", "stove", "zipper", "blanket",
    "wallet", "tape", "shelf", "crayon", "penny",
  ],
  medium: [
    "sunglasses", "backpack", "volcano", "compass", "hammock",
    "cactus", "penguin", "telescope", "waterfall", "campfire",
    "skateboard", "lighthouse", "surfboard", "trampoline", "pretzel",
    "tornado", "igloo", "flamingo", "waffle", "jellyfish",
    "pineapple", "mailbox", "rollercoaster", "snowflake", "fireplace",
    "suitcase", "scarecrow", "mushroom", "goldfish", "binoculars",
    "lemonade", "stopwatch", "windmill", "dolphin", "giraffe",
    "fishing rod", "greenhouse", "horseshoe", "popcorn", "chopsticks",
    // landmarks & famous people
    "Eiffel Tower", "Statue of Liberty", "Great Wall of China", "Big Ben", "Golden Gate Bridge",
    "Mount Everest", "Niagara Falls", "Hollywood sign", "Taj Mahal", "Pyramids",
    "Beyonce", "Taylor Swift", "Michael Jordan", "Elvis Presley", "Oprah",
    "Mario", "Spider-Man", "Harry Potter", "Sherlock Holmes", "Santa Claus",
  ],
  hard: [
    "treadmill", "souvenir", "escalator", "kombucha", "gazebo",
    "chandelier", "boomerang", "espresso", "origami", "gondola",
    "pistachio", "sundial", "metronome", "avocado", "spatula",
    "macaron", "chisel", "corkscrew", "tambourine", "kayak",
    "bagpipes", "thermostat", "baguette", "mandolin", "zucchini",
    "artichoke", "pomegranate", "stethoscope", "fondue", "pendulum",
    "kimono", "tiramisu", "sauerkraut", "maracas", "terrarium",
    // landmarks & famous people (harder to narrow down)
    "Colosseum", "Stonehenge", "Machu Picchu", "Parthenon", "Grand Canyon",
    "Mount Rushmore", "Alcatraz", "Bermuda Triangle", "Dead Sea", "Panama Canal",
    "Cleopatra", "Galileo", "Frida Kahlo", "Nikola Tesla", "Amelia Earhart",
    "Houdini", "Beethoven", "Genghis Khan", "Da Vinci", "Marie Curie",
    "Dumbledore", "Voldemort", "Darth Vader", "Willy Wonka", "Dracula",
  ],
  impossible: [
    // abstract concepts
    "nostalgia", "irony", "karma", "procrastination", "deja vu",
    "awkward silence", "gut feeling", "hindsight", "paradox", "peer pressure",
    "stage fright", "writers block", "comfort zone", "guilty pleasure", "growing pains",
    "second wind", "tunnel vision", "cold shoulder", "silver lining", "blind spot",
    // vague / hard to narrow down
    "tradition", "superstition", "etiquette", "charisma", "momentum",
    "atmosphere", "instinct", "reputation", "tension", "plot twist",
    "limbo", "loophole", "fine print", "red herring", "dark horse",
    // obscure objects & things
    "zoetrope", "astrolabe", "sextant", "abacus", "theremin",
    "armillary sphere", "stereoscope", "thimble", "awl", "plumb bob",
    "bellows", "spindle", "pestle", "quill", "inkwell",
    "gaiter", "ferrule", "snuffer", "bodkin", "gimbal",
    "lanyard", "dowel", "cleat", "gasket", "rivets",
    // obscure people & places
    "Rasputin", "Blackbeard", "Fibonacci", "Sisyphus", "Achilles",
    "El Dorado", "Atlantis", "Rosetta Stone", "Bermuda Triangle", "Area 51",
    "Schrodinger's cat", "Trojan Horse", "Pandora's box", "Occam's razor", "Murphy's law",
  ],
};

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "impossible", label: "Impossible" },
];
