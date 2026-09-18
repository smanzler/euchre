export const SUITS = ["C", "D", "H", "S"] as const;
export type Suit = (typeof SUITS)[number];

/** Low to high. Index is the rank order inside a suit. */
export const RANKS = ["9", "T", "J", "Q", "K", "A"] as const;
export type Rank = (typeof RANKS)[number];

export type Card = `${Rank}${Suit}`;

export const DECK: readonly Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank): Card => `${rank}${suit}`),
);

export const rankOf = (card: Card): Rank => card[0] as Rank;

export const suitOf = (card: Card): Suit => card[1] as Suit;

const SUIT_COLORS: Record<Suit, "black" | "red"> = {
  C: "black",
  D: "red",
  H: "red",
  S: "black",
};

export const colorOf = (suit: Suit): "black" | "red" => SUIT_COLORS[suit];

const SAME_COLOR_SUITS: Record<Suit, Suit> = { C: "S", S: "C", D: "H", H: "D" };

/** The other suit with the same colour. The left bower comes from it. */
export const sameColorSuit = (suit: Suit): Suit => SAME_COLOR_SUITS[suit];

const SUIT_NAMES: Record<Suit, string> = {
  C: "Clubs",
  D: "Diamonds",
  H: "Hearts",
  S: "Spades",
};

export const suitName = (suit: Suit): string => SUIT_NAMES[suit];

const SUIT_SYMBOLS: Record<Suit, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
};

export const suitSymbol = (suit: Suit): string => SUIT_SYMBOLS[suit];

const RANK_LABELS: Record<Rank, string> = {
  "9": "9",
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
};

export const rankLabel = (rank: Rank): string => RANK_LABELS[rank];

export const isCard = (value: unknown): value is Card =>
  typeof value === "string" &&
  value.length === 2 &&
  (RANKS as readonly string[]).includes(value[0] as string) &&
  (SUITS as readonly string[]).includes(value[1] as string);
