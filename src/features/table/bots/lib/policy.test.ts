import type { Card, Suit } from "@/features/euchre/lib/cards";
import { effectiveSuit, legalPlays } from "@/features/euchre/lib/trick";
import { DEFAULT_RULES } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { chooseIntent } from "./policy";

const viewWith = (over: Partial<PlayerView>): PlayerView => {
  const base: PlayerView = {
    seat: 0,
    handNumber: 1,
    phase: "bidding-up",
    rules: DEFAULT_RULES,
    dealer: 3,
    turn: 0,
    hand: [],
    handSizes: { 0: 5, 1: 5, 2: 5, 3: 5 },
    upcard: null,
    trump: null,
    maker: null,
    aloneSeat: null,
    sittingOut: null,
    trick: [],
    lastTrick: null,
    tricksWon: { 0: 0, 1: 0 },
    score: { 0: 0, 1: 0 },
    lastHand: null,
    winner: null,
    legalPlays: [],
    callableSuits: ["C", "D", "H", "S"],
  };
  const view = { ...base, ...over };
  if (view.phase !== "playing" || view.trump === null) return view;
  const first = view.trick[0];
  const led = first === undefined ? null : effectiveSuit(first.card, view.trump);
  return { ...view, legalPlays: legalPlays(view.hand, led, view.trump) };
};

describe("ordering up", () => {
  it("orders up on both bowers and an ace", () => {
    const intent = chooseIntent(
      viewWith({ hand: ["JH", "JD", "AH", "9C", "TS"], upcard: "KH", dealer: 3, seat: 0 }),
    );
    expect(intent).toEqual({ type: "order-up", alone: false });
  });

  it("passes on a hand with nothing in the suit", () => {
    const intent = chooseIntent(
      viewWith({ hand: ["9C", "TC", "QS", "9S", "TD"], upcard: "KH", dealer: 3, seat: 0 }),
    );
    expect(intent).toEqual({ type: "pass" });
  });

  it("goes alone on a hand that takes them all", () => {
    const intent = chooseIntent(
      viewWith({ hand: ["JH", "JD", "AH", "KH", "AS"], upcard: "QH", dealer: 3, seat: 0 }),
    );
    expect(intent).toEqual({ type: "order-up", alone: true });
  });

  it("counts the upcard the dealer is about to pick up", () => {
    const hand: Card[] = ["JH", "AH", "9C", "TS", "QD"];
    const asDealer = chooseIntent(viewWith({ hand, upcard: "KH", dealer: 0, seat: 0 }));
    const asEldest = chooseIntent(viewWith({ hand, upcard: "KH", dealer: 3, seat: 0 }));
    expect(asDealer).toMatchObject({ type: "order-up" });
    expect(asEldest).toEqual({ type: "pass" });
  });

  it("is keener when the partner takes the upcard than when an opponent does", () => {
    const hand: Card[] = ["JD", "AH", "KH", "9C", "TS"];
    const partnerDeals = chooseIntent(viewWith({ hand, upcard: "QH", dealer: 2, seat: 0 }));
    const opponentDeals = chooseIntent(viewWith({ hand, upcard: "QH", dealer: 1, seat: 0 }));
    expect(partnerDeals).toMatchObject({ type: "order-up" });
    expect(opponentDeals).toEqual({ type: "pass" });
  });
});

describe("naming trump", () => {
  it("names the suit the hand is strongest in", () => {
    const intent = chooseIntent(
      viewWith({
        phase: "bidding-call",
        hand: ["JS", "JC", "AS", "KS", "9D"],
        callableSuits: ["C", "D", "S"],
      }),
    );
    expect(intent).toEqual({ type: "call-trump", suit: "S", alone: false });
  });

  it("passes when no suit is worth naming", () => {
    const intent = chooseIntent(
      viewWith({
        phase: "bidding-call",
        hand: ["9C", "TD", "QS", "9H", "TC"],
        callableSuits: ["C", "D", "S"],
      }),
    );
    expect(intent).toEqual({ type: "pass" });
  });

  it("names a suit anyway when the dealer is stuck", () => {
    const intent = chooseIntent(
      viewWith({
        phase: "bidding-call",
        hand: ["9C", "TD", "QS", "9H", "TC"],
        callableSuits: ["C", "D", "S"],
        seat: 0,
        dealer: 0,
      }),
    );
    expect(intent).toMatchObject({ type: "call-trump" });
  });
});

describe("discarding", () => {
  it("keeps every trump and throws the lowest card away", () => {
    const intent = chooseIntent(
      viewWith({
        phase: "dealer-discard",
        trump: "H",
        hand: ["JH", "JD", "AH", "KC", "QC", "TC"],
      }),
    );
    expect(intent).toEqual({ type: "discard", card: "TC" });
  });

  it("throws a low singleton to make a suit void", () => {
    const intent = chooseIntent(
      viewWith({
        phase: "dealer-discard",
        trump: "H",
        hand: ["JH", "AH", "KC", "QC", "TC", "9S"],
      }),
    );
    expect(intent).toEqual({ type: "discard", card: "9S" });
  });
});

describe("playing", () => {
  const playing = (over: Partial<PlayerView>) =>
    chooseIntent(viewWith({ phase: "playing", trump: "H", maker: 0, ...over }));

  it("leads the highest trump as the maker to pull trump", () => {
    expect(playing({ hand: ["JH", "AH", "9C", "TS"], seat: 0, maker: 0 })).toEqual({
      type: "play-card",
      card: "JH",
    });
  });

  it("leads an off suit ace when it is not pulling trump", () => {
    expect(playing({ hand: ["9H", "AS", "TC", "9D"], seat: 0, maker: 1 })).toEqual({
      type: "play-card",
      card: "AS",
    });
  });

  it("follows the led suit", () => {
    const intent = playing({
      hand: ["9S", "KS", "AH"],
      seat: 1,
      trick: [{ seat: 0, card: "TS" }],
    });
    expect(intent).toMatchObject({ type: "play-card" });
    expect(["9S", "KS"]).toContain((intent as { card: Card }).card);
  });

  it("takes the trick with the cheapest card that wins", () => {
    expect(
      playing({
        hand: ["QS", "KS", "AS"],
        seat: 1,
        trick: [{ seat: 0, card: "JS" }],
      }),
    ).toEqual({ type: "play-card", card: "QS" });
  });

  it("plays low when the partner already holds the trick", () => {
    expect(
      playing({
        hand: ["9S", "AS"],
        seat: 3,
        trick: [
          { seat: 0, card: "TS" },
          { seat: 1, card: "KS" },
          { seat: 2, card: "QS" },
        ],
      }),
    ).toEqual({ type: "play-card", card: "9S" });
  });

  it("throws its lowest card when it cannot win", () => {
    expect(
      playing({
        hand: ["9C", "TC"],
        seat: 1,
        trick: [{ seat: 0, card: "AH" }],
      }),
    ).toEqual({ type: "play-card", card: "9C" });
  });
});

describe("waiting", () => {
  it("leaves the next hand to a person", () => {
    expect(chooseIntent(viewWith({ phase: "hand-over" }))).toBeNull();
    expect(chooseIntent(viewWith({ phase: "game-over" }))).toBeNull();
  });
});
