/** Café order deck for Order Overload. Common orders have multiple copies. */

const deckEntries: [string, number][] = [
  // Coffee drinks — common
  ["Hot Coffee", 4],
  ["Iced Coffee", 3],
  ["Hot Latte", 3],
  ["Cappuccino", 2],
  ["Espresso", 2],
  ["Americano", 2],
  ["Mocha", 2],
  ["Cold Brew", 2],
  ["Iced Latte", 2],

  // Tea drinks — common
  ["Hot Tea", 3],
  ["Iced Tea", 3],
  ["Chai Latte", 2],
  ["Matcha Latte", 2],
  ["Chai Tea", 1],

  // Specialty coffee
  ["Caramel Macchiato", 1],
  ["Flat White", 1],
  ["Vanilla Latte", 1],
  ["Hazelnut Latte", 1],
  ["Oat Milk Latte", 1],
  ["Dirty Chai", 1],
  ["Affogato", 1],
  ["Macchiato", 1],
  ["Cortado", 1],
  ["Red Eye", 1],
  ["Iced Mocha", 1],

  // Non-coffee/tea drinks
  ["Hot Chocolate", 2],
  ["Lemonade", 2],
  ["Iced Matcha", 1],
  ["Orange Juice", 1],
  ["Apple Juice", 1],
  ["Smoothie", 1],
  ["Sparkling Water", 1],
  ["Italian Soda", 1],

  // Foods
  ["Croissant", 2],
  ["Muffin", 2],
  ["Bagel", 1],
  ["Scone", 1],
  ["Cookie", 1],
  ["Breakfast Sandwich", 1],
];

/** Flat array of all order cards (with duplicates for common orders). */
export const ORDER_DECK: string[] = deckEntries.flatMap(([name, count]) =>
  Array.from({ length: count }, () => name)
);

/** Unique order names for reference. */
export const UNIQUE_ORDERS: string[] = deckEntries.map(([name]) => name);
