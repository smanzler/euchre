import { type Card, RANKS, type Suit, rankOf, sameColorSuit, suitOf } from "./cards";

export const isRightBower = (card: Card, trump: Suit): boolean =>
  rankOf(card) === "J" && suitOf(card) === trump;

export const isLeftBower = (card: Card, trump: Suit): boolean =>
  rankOf(card) === "J" && suitOf(card) === sameColorSuit(trump);

export const isTrump = (card: Card, trump: Suit): boolean =>
  suitOf(card) === trump || isLeftBower(card, trump);

/** The suit a card belongs to in play. The left bower belongs to trump. */
export const effectiveSuit = (card: Card, trump: Suit): Suit =>
  isLeftBower(card, trump) ? trump : suitOf(card);

const RIGHT_BOWER_STRENGTH = 300;
const LEFT_BOWER_STRENGTH = 200;
const TRUMP_STRENGTH = 100;

/** Comparable only inside one trick. A card that cannot win scores 0. */
export const cardStrength = (card: Card, trump: Suit, led: Suit): number => {
  if (isRightBower(card, trump)) return RIGHT_BOWER_STRENGTH;
  if (isLeftBower(card, trump)) return LEFT_BOWER_STRENGTH;
  const rank = RANKS.indexOf(rankOf(card)) + 1;
  if (suitOf(card) === trump) return TRUMP_STRENGTH + rank;
  if (effectiveSuit(card, trump) === led) return rank;
  return 0;
};

export const sortForHand = (hand: readonly Card[], trump: Suit | null): Card[] => {
  const order = (card: Card): number => {
    if (trump === null) {
      return SUIT_ORDER.indexOf(suitOf(card)) * 10 + RANKS.indexOf(rankOf(card));
    }
    const suit = effectiveSuit(card, trump);
    const suitRank = suit === trump ? -1 : SUIT_ORDER.indexOf(suit);
    return suitRank * 10 + cardStrength(card, trump, suit) / 100;
  };
  return [...hand].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
};

const SUIT_ORDER: readonly Suit[] = ["S", "H", "C", "D"];

export const legalPlays = (
  hand: readonly Card[],
  led: Suit | null,
  trump: Suit,
): Card[] => {
  if (led === null) return [...hand];
  const following = hand.filter((card) => effectiveSuit(card, trump) === led);
  return following.length > 0 ? following : [...hand];
};

export type TrickPlay<Seat> = { seat: Seat; card: Card };

export const trickWinner = <Seat>(
  plays: readonly TrickPlay<Seat>[],
  trump: Suit,
): Seat => {
  const first = plays[0];
  if (first === undefined) throw new Error("an empty trick has no winner");
  const led = effectiveSuit(first.card, trump);
  let best = first;
  for (const play of plays) {
    if (cardStrength(play.card, trump, led) > cardStrength(best.card, trump, led)) {
      best = play;
    }
  }
  return best.seat;
};
