import { parseClientMessage, parseHostMessage, toAction } from "./messages";

describe("messages", () => {
  it("accepts the tags it knows", () => {
    expect(
      parseClientMessage(JSON.stringify({ t: "hello", name: "Sam" })),
    ).toEqual({
      t: "hello",
      name: "Sam",
    });
    expect(
      parseHostMessage(JSON.stringify({ t: "rejected", reason: "no" })),
    ).toEqual({
      t: "rejected",
      reason: "no",
    });
  });

  it("accepts a host command", () => {
    expect(
      parseClientMessage(JSON.stringify({ t: "add-bot", seat: 2 })),
    ).toEqual({ t: "add-bot", seat: 2 });
    expect(parseClientMessage(JSON.stringify({ t: "start" }))).toEqual({
      t: "start",
    });
  });

  it("rejects a client message with a bad field", () => {
    const bad = [
      { t: "intent", intent: { type: "cheat" } },
      { t: "intent", intent: { type: "play-card", card: "1X" } },
      { t: "intent", intent: { type: "call-trump", suit: "Z", alone: false } },
      { t: "add-bot", seat: 7 },
      { t: "hello", name: "" },
      { t: "hello", name: "x".repeat(21) },
      { t: "rename", seat: 1 },
    ];
    for (const message of bad) {
      expect(parseClientMessage(JSON.stringify(message))).toBeNull();
    }
  });

  it("rejects junk, the wrong direction and unknown tags", () => {
    expect(parseClientMessage("not json")).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: "view" }))).toBeNull();
    expect(parseHostMessage(JSON.stringify({ t: "hello" }))).toBeNull();
    expect(parseHostMessage(JSON.stringify([1, 2]))).toBeNull();
    expect(parseHostMessage(JSON.stringify(null))).toBeNull();
  });
});

describe("toAction", () => {
  it("stamps the seat onto an intent", () => {
    expect(toAction({ type: "play-card", card: "JH" }, 2)).toEqual({
      type: "play-card",
      card: "JH",
      seat: 2,
    });
  });
});
