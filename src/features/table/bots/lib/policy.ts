import { type Card, type Suit, suitOf } from "@/features/euchre/lib/cards";
import { cardStrength, effectiveSuit, isTrump } from "@/features/euchre/lib/trick";
import { type Phase, type Seat, partnerOf } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import type { PlayerIntent } from "../../transport/lib/protocol";
import { TRICK, bestFive, bestTrumpSuit, handPoints, weakestCard } from "./handValue";

/** All in hundredths of a trick. See handValue. */
const ORDER_UP_POINTS = 2.6 * TRICK;
const CALL_POINTS = 2.8 * TRICK;
const ALONE_POINTS = 4.1 * TRICK;

/** The upcard is a trump for whoever ends up with it. */
const PARTNER_GETS_UPCARD = 30;
const OPPONENT_GETS_UPCARD = -35;

/** What the bidder's own five cards are worth once the upcard has settled. */
const ownPoints = (view: PlayerView, upcard: Card): number => {
  const trump = suitOf(upcard);
  return view.seat === view.dealer
    ? handPoints(bestFive([...view.hand, upcard], trump), trump)
    : handPoints(view.hand, trump);
};

const orderUp = (view: PlayerView): PlayerIntent => {
  const upcard = view.upcard;
  if (upcard === null) return { type: "pass" };
  const own = ownPoints(view, upcard);
  const adjustment =
    view.seat === view.dealer
      ? 0
      : partnerOf(view.seat) === view.dealer
        ? PARTNER_GETS_UPCARD
        : OPPONENT_GETS_UPCARD;
  if (own + adjustment < ORDER_UP_POINTS) return { type: "pass" };
  // Going alone turns on the five cards held, not on who holds the upcard.
  return { type: "order-up", alone: own >= ALONE_POINTS };
};

const callTrump = (view: PlayerView): PlayerIntent => {
  const best = bestTrumpSuit(view.hand, view.callableSuits);
  if (best === null) return { type: "pass" };
  const stuck = view.rules.stickTheDealer && view.seat === view.dealer;
  if (!stuck && best.points < CALL_POINTS) return { type: "pass" };
  return { type: "call-trump", suit: best.suit, alone: best.points >= ALONE_POINTS };
};

const discard = (view: PlayerView): PlayerIntent | null => {
  if (view.trump === null) return null;
  return { type: "discard", card: weakestCard(view.hand, view.trump) };
};

const lowest = (cards: readonly Card[], trump: Suit, led: Suit): Card =>
  cards.reduce(
    (low, card) => (cardStrength(card, trump, led) < cardStrength(low, trump, led) ? card : low),
    cards[0] as Card,
  );

const highest = (cards: readonly Card[], trump: Suit, led: Suit): Card =>
  cards.reduce(
    (high, card) => (cardStrength(card, trump, led) > cardStrength(high, trump, led) ? card : high),
    cards[0] as Card,
  );

const lead = (view: PlayerView, trump: Suit, legal: readonly Card[]): Card => {
  const isMaker = view.maker !== null && view.maker % 2 === view.seat % 2;
  const trumps = legal.filter((card) => isTrump(card, trump));
  // The maker pulls trump so the partner's off suit winners survive.
  if (isMaker && trumps.length >= 2) return highest(trumps, trump, trump);
  const offAces = legal.filter((card) => !isTrump(card, trump) && card[0] === "A");
  if (offAces.length > 0) return offAces[0] as Card;
  const offSuit = legal.filter((card) => !isTrump(card, trump));
  if (offSuit.length > 0) return lowest(offSuit, trump, suitOf(offSuit[0] as Card));
  return highest(legal, trump, trump);
};

const follow = (view: PlayerView, trump: Suit, legal: readonly Card[]): Card => {
  const first = view.trick[0] as { seat: Seat; card: Card };
  const led = effectiveSuit(first.card, trump);
  const best = view.trick.reduce((winner, play) =>
    cardStrength(play.card, trump, led) > cardStrength(winner.card, trump, led) ? play : winner,
  );
  const partnerLeads = best.seat === partnerOf(view.seat);
  const lastToPlay = view.trick.length === (view.sittingOut === null ? 3 : 2);
  // Do not spend a card over a partner who already holds the trick.
  if (partnerLeads && lastToPlay) return lowest(legal, trump, led);
  const winners = legal.filter(
    (card) => cardStrength(card, trump, led) > cardStrength(best.card, trump, led),
  );
  if (winners.length === 0) return lowest(legal, trump, led);
  if (partnerLeads) return lowest(legal, trump, led);
  return lowest(winners, trump, led);
};

const play = (view: PlayerView): PlayerIntent | null => {
  const trump = view.trump;
  const legal = view.legalPlays;
  if (trump === null || legal.length === 0) return null;
  const card = view.trick.length === 0 ? lead(view, trump, legal) : follow(view, trump, legal);
  return { type: "play-card", card };
};

/** A person reads the score, so a bot never deals the next hand. */
const wait = (): null => null;

const botMoves: Record<Phase, (view: PlayerView) => PlayerIntent | null> = {
  "bidding-up": orderUp,
  "bidding-call": callTrump,
  "dealer-discard": discard,
  playing: play,
  "hand-over": wait,
  "game-over": wait,
};

export const chooseIntent = (view: PlayerView): PlayerIntent | null =>
  botMoves[view.phase](view);
