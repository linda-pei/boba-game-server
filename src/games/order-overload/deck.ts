/** Café order deck for Order Overload. Common orders have multiple copies. */

const deckEntries: [string, number][] = [
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

/** Flat array of all order cards (with duplicates for common orders). */
export const ORDER_DECK: string[] = deckEntries.flatMap(([name, count]) =>
  Array.from({ length: count }, () => name)
);

/** Unique order names for reference. */
export const UNIQUE_ORDERS: string[] = deckEntries.map(([name]) => name);
