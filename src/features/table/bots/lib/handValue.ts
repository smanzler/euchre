import { type Card, RANKS, SUITS, type Suit, rankOf, suitOf } from "@/features/euchre/lib/cards";
import { effectiveSuit, isLeftBower, isRightBower, isTrump } from "@/features/euchre/lib/trick";

/**
 * Hand values are hundredths of a trick, so a threshold never lands on a
 * floating point edge. 100 is one trick.
 */
export const TRICK = 100;

const TRUMP_WORTH: Record<string, number> = { A: 80, K: 50, Q: 30, T: 15, "9": 15 };

const RIGHT_BOWER_WORTH = 100;
const LEFT_BOWER_WORTH = 90;
const OFF_ACE_WORTH = 50;
const VOID_WORTH = 30;
const MIN_TRUMP_FOR_VOID = 2;

const cardWorth = (card: Card, trump: Suit): number => {
  if (isRightBower(card, trump)) return RIGHT_BOWER_WORTH;
  if (isLeftBower(card, trump)) return LEFT_BOWER_WORTH;
  if (suitOf(card) === trump) return TRUMP_WORTH[rankOf(card)] ?? 0;
  return rankOf(card) === "A" ? OFF_ACE_WORTH : 0;
};

/** A short suit is only worth something when there is trump to ruff with. */
const voidWorth = (hand: readonly Card[], trump: Suit): number => {
  const trumpCount = hand.filter((card) => isTrump(card, trump)).length;
  if (trumpCount < MIN_TRUMP_FOR_VOID) return 0;
  const held = new Set(hand.map((card) => effectiveSuit(card, trump)));
  return SUITS.filter((suit) => suit !== trump && !held.has(suit)).length * VOID_WORTH;
};

/** What this hand is worth with the given trump, in hundredths of a trick. */
export const handPoints = (hand: readonly Card[], trump: Suit): number =>
  hand.reduce((sum, card) => sum + cardWorth(card, trump), 0) + voidWorth(hand, trump);

/** The card to throw away, keeping trump and making a suit void where it can. */
export const weakestCard = (hand: readonly Card[], trump: Suit): Card => {
  const offSuit = hand.filter((card) => !isTrump(card, trump));
  const pool = offSuit.length > 0 ? offSuit : hand;
  const counts = new Map<Suit, number>();
  for (const card of pool) {
    const suit = effectiveSuit(card, trump);
    counts.set(suit, (counts.get(suit) ?? 0) + 1);
  }
  const cost = (card: Card): number => {
    const singleton = counts.get(effectiveSuit(card, trump)) === 1;
    const rank = RANKS.indexOf(rankOf(card));
    return rank - (singleton && rankOf(card) !== "A" ? RANKS.length : 0);
  };
  return pool.reduce((worst, card) => (cost(card) < cost(worst) ? card : worst), pool[0] as Card);
};

/** The five cards to keep once a sixth is picked up. */
export const bestFive = (hand: readonly Card[], trump: Suit): Card[] => {
  const dropped = weakestCard(hand, trump);
  const index = hand.indexOf(dropped);
  return [...hand.slice(0, index), ...hand.slice(index + 1)];
};

export const bestTrumpSuit = (
  hand: readonly Card[],
  choices: readonly Suit[],
): { suit: Suit; points: number } | null => {
  let best: { suit: Suit; points: number } | null = null;
  for (const suit of choices) {
    const points = handPoints(hand, suit);
    if (best === null || points > best.points) best = { suit, points };
  }
  return best;
};
