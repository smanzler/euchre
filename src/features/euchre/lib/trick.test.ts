import type { Card } from "./cards";
import {
  cardStrength,
  effectiveSuit,
  isLeftBower,
  isRightBower,
  isTrump,
  legalPlays,
  trickWinner,
} from "./trick";

describe("bowers", () => {
  it("treats the jack of trump as the right bower", () => {
    expect(isRightBower("JH", "H")).toBe(true);
    expect(isLeftBower("JH", "H")).toBe(false);
  });

  it("treats the jack of the same colour as the left bower and as trump", () => {
    expect(isLeftBower("JD", "H")).toBe(true);
    expect(isTrump("JD", "H")).toBe(true);
    expect(effectiveSuit("JD", "H")).toBe("H");
  });

  it("leaves the off colour jacks alone", () => {
    expect(isTrump("JS", "H")).toBe(false);
    expect(effectiveSuit("JS", "H")).toBe("S");
  });
});

describe("cardStrength", () => {
  it("orders the trump suit right bower, left bower, then ace down", () => {
    const ordered: Card[] = ["JH", "JD", "AH", "KH", "QH", "TH", "9H"];
    const scores = ordered.map((card) => cardStrength(card, "H", "H"));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(ordered.length);
  });

  it("puts any trump above the led suit", () => {
    expect(cardStrength("9H", "H", "S")).toBeGreaterThan(cardStrength("AS", "H", "S"));
  });

  it("scores a card that neither follows nor trumps as zero", () => {
    expect(cardStrength("AC", "H", "S")).toBe(0);
  });
});

describe("legalPlays", () => {
  it("allows anything on the lead", () => {
    const hand: Card[] = ["9C", "AS", "JD"];
    expect(legalPlays(hand, null, "H")).toEqual(hand);
  });

  it("makes the player follow the led suit", () => {
    expect(legalPlays(["9C", "AS", "KS"], "S", "H")).toEqual(["AS", "KS"]);
  });

  it("counts the left bower as trump when following suit", () => {
    expect(legalPlays(["JD", "9C"], "H", "H")).toEqual(["JD"]);
    expect(legalPlays(["JD", "9C", "AD"], "D", "H")).toEqual(["AD"]);
  });

  it("frees the player who is void in the led suit", () => {
    const hand: Card[] = ["9C", "AH"];
    expect(legalPlays(hand, "S", "H")).toEqual(hand);
  });
});

describe("trickWinner", () => {
  it("gives the trick to the highest card of the led suit", () => {
    const seat = trickWinner(
      [
        { seat: 0, card: "9S" },
        { seat: 1, card: "AS" },
        { seat: 2, card: "KS" },
        { seat: 3, card: "AC" },
      ],
      "H",
    );
    expect(seat).toBe(1);
  });

  it("gives the trick to the highest trump when someone trumps in", () => {
    const seat = trickWinner(
      [
        { seat: 0, card: "AS" },
        { seat: 1, card: "9H" },
        { seat: 2, card: "JD" },
        { seat: 3, card: "KS" },
      ],
      "H",
    );
    expect(seat).toBe(2);
  });

  it("lets the right bower beat the left bower", () => {
    const seat = trickWinner(
      [
        { seat: 0, card: "JD" },
        { seat: 1, card: "JH" },
      ],
      "H",
    );
    expect(seat).toBe(1);
  });

  it("lets a led left bower pull trump", () => {
    const seat = trickWinner(
      [
        { seat: 0, card: "JD" },
        { seat: 1, card: "AD" },
      ],
      "H",
    );
    expect(seat).toBe(0);
  });
});
