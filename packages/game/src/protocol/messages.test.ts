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
