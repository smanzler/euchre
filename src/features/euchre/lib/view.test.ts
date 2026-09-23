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

  it("counts the tricks each seat takes", () => {
    const start = newGame({ seed: 7, dealer: 0 });
    const ordered = applyAction(start, { type: "order-up", seat: 1, alone: false });
    if (!ordered.ok) throw new Error(ordered.reason);
    const discarded = applyAction(ordered.state, {
      type: "discard",
      seat: 0,
      card: ordered.state.hands[0][0] as Card,
    });
    if (!discarded.ok) throw new Error(discarded.reason);
    let state = discarded.state;
    for (let i = 0; i < 8; i += 1) {
      const next = applyAction(state, {
        type: "play-card",
        seat: state.turn,
        card: viewFor(state, state.turn).legalPlays[0] as Card,
      });
      if (!next.ok) throw new Error(next.reason);
      state = next.state;
    }
    const expected = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const trick of state.completed) expected[trick.winner] += 1;
    const view = viewFor(state, 0);
    expect(state.completed).toHaveLength(2);
    expect(view.tricksBySeat).toEqual(expected);
    expect(view.tricksBySeat[0] + view.tricksBySeat[2]).toBe(view.tricksWon[0]);
  });

  it("survives a round trip through JSON", () => {
    const view = viewFor(newGame({ seed: 7 }), 0);
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });
});
