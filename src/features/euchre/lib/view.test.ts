import { applyAction, newGame } from "./engine";
import type { Card } from "./cards";
import { viewFor } from "./view";

describe("viewFor", () => {
  it("shows the seat its own hand and only the sizes of the others", () => {
    const state = newGame({ seed: 7, dealer: 0 });
    const view = viewFor(state, 2);
    expect(view.hand).toEqual(state.hands[2]);
    expect(view.handSizes).toEqual({ 0: 5, 1: 5, 2: 5, 3: 5 });
    expect(JSON.stringify(view)).not.toContain(state.hands[1][0] as Card);
  });

  it("lists legal plays only for the seat on turn", () => {
    const start = newGame({ seed: 7, dealer: 0 });
    const ordered = applyAction(start, { type: "order-up", seat: 1, alone: false });
    if (!ordered.ok) throw new Error(ordered.reason);
    const playing = applyAction(ordered.state, {
      type: "discard",
      seat: 0,
      card: ordered.state.hands[0][0] as Card,
    });
    if (!playing.ok) throw new Error(playing.reason);
    expect(viewFor(playing.state, 1).legalPlays).toHaveLength(5);
    expect(viewFor(playing.state, 2).legalPlays).toHaveLength(0);
  });

  it("survives a round trip through JSON", () => {
    const view = viewFor(newGame({ seed: 7 }), 0);
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });
});
