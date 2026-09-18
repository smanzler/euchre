import { DECK, colorOf, isCard, rankOf, sameColorSuit, suitOf } from "./cards";

describe("cards", () => {
  it("builds a 24 card deck with no duplicates", () => {
    expect(DECK).toHaveLength(24);
    expect(new Set(DECK).size).toBe(24);
  });

  it("reads the rank and the suit off a card", () => {
    expect(rankOf("JH")).toBe("J");
    expect(suitOf("JH")).toBe("H");
  });

  it("pairs each suit with the other suit of its colour", () => {
    expect(sameColorSuit("H")).toBe("D");
    expect(sameColorSuit("D")).toBe("H");
    expect(sameColorSuit("S")).toBe("C");
    expect(sameColorSuit("C")).toBe("S");
    for (const suit of ["C", "D", "H", "S"] as const) {
      expect(colorOf(sameColorSuit(suit))).toBe(colorOf(suit));
    }
  });

  it("rejects values that are not cards", () => {
    expect(isCard("JH")).toBe(true);
    expect(isCard("8H")).toBe(false);
    expect(isCard("JX")).toBe(false);
    expect(isCard(7)).toBe(false);
  });
});
