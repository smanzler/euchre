import type { Card } from "./cards";
import { applyAction, callableSuits, legalPlaysFor, newGame } from "./engine";
import type { GameAction, GameState, Seat } from "./types";

const SEED = 20240918;

const expectOk = (state: GameState, action: GameAction): GameState => {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`expected ${action.type} to be legal: ${result.reason}`);
  return result.state;
};

const expectFail = (state: GameState, action: GameAction): string => {
  const result = applyAction(state, action);
  if (result.ok) throw new Error(`expected ${action.type} to be rejected`);
  return result.reason;
};

const passAround = (start: GameState, times: number): GameState => {
  let state = start;
  for (let i = 0; i < times; i += 1) {
    state = expectOk(state, { type: "pass", seat: state.turn });
  }
  return state;
};

const withState = (over: Partial<GameState>): GameState => ({
  ...newGame({ seed: SEED, dealer: 0 }),
  ...over,
});

describe("newGame", () => {
  it("deals five cards to each seat and turns one card up", () => {
    const state = newGame({ seed: SEED, dealer: 0 });
    expect(Object.values(state.hands).map((hand) => hand.length)).toEqual([5, 5, 5, 5]);
    expect(state.upcard).not.toBeNull();
    const all = [...Object.values(state.hands).flat(), state.upcard as Card];
    expect(new Set(all).size).toBe(21);
  });

  it("starts the bidding to the left of the dealer", () => {
    const state = newGame({ seed: SEED, dealer: 2 });
    expect(state.phase).toBe("bidding-up");
    expect(state.turn).toBe(3);
  });

  it("deals the same hand for the same seed", () => {
    expect(newGame({ seed: SEED }).hands).toEqual(newGame({ seed: SEED }).hands);
  });
});

describe("bidding", () => {
  it("gives the upcard to the dealer when a seat orders it up", () => {
    const state = newGame({ seed: SEED, dealer: 0 });
    const upcard = state.upcard as Card;
    const ordered = expectOk(state, { type: "order-up", seat: 1, alone: false });
    expect(ordered.trump).toBe(upcard[1]);
    expect(ordered.maker).toBe(1);
    expect(ordered.phase).toBe("dealer-discard");
    expect(ordered.turn).toBe(0);
    expect(ordered.hands[0]).toHaveLength(6);
    expect(ordered.hands[0]).toContain(upcard);
    expect(ordered.upcard).toBeNull();
  });

  it("moves to the second round after four passes", () => {
    const state = passAround(newGame({ seed: SEED, dealer: 0 }), 4);
    expect(state.phase).toBe("bidding-call");
    expect(state.turn).toBe(1);
    expect(state.passes).toBe(0);
    expect(state.upcard).not.toBeNull();
  });

  it("refuses the suit that was turned down", () => {
    const state = passAround(newGame({ seed: SEED, dealer: 0 }), 4);
    const turnedDown = (state.upcard as Card)[1] as "C" | "D" | "H" | "S";
    expect(callableSuits(state)).not.toContain(turnedDown);
    expect(expectFail(state, { type: "call-trump", seat: 1, suit: turnedDown, alone: false })).toMatch(
      /turned down/,
    );
  });

  it("sticks the dealer when the rule is on", () => {
    const state = passAround(newGame({ seed: SEED, dealer: 0 }), 7);
    expect(state.turn).toBe(0);
    expect(expectFail(state, { type: "pass", seat: 0 })).toMatch(/must name a suit/);
  });

  it("redeals with a new dealer when the rule is off", () => {
    const start = newGame({ seed: SEED, dealer: 0, rules: { stickTheDealer: false } });
    const state = passAround(start, 8);
    expect(state.phase).toBe("bidding-up");
    expect(state.dealer).toBe(1);
    expect(state.handNumber).toBe(2);
    expect(state.events).toContainEqual({ type: "redeal" });
  });

  it("opens play from the dealer's left once the dealer discards", () => {
    const ordered = expectOk(newGame({ seed: SEED, dealer: 0 }), {
      type: "order-up",
      seat: 1,
      alone: false,
    });
    const discard = ordered.hands[0][0] as Card;
    const playing = expectOk(ordered, { type: "discard", seat: 0, card: discard });
    expect(playing.phase).toBe("playing");
    expect(playing.turn).toBe(1);
    expect(playing.hands[0]).toHaveLength(5);
    expect(playing.hands[0]).not.toContain(discard);
  });

  it("refuses a discard of a card the dealer does not hold", () => {
    const ordered = expectOk(newGame({ seed: SEED, dealer: 0 }), {
      type: "order-up",
      seat: 1,
      alone: false,
    });
    const notHeld = (["9C", "9D", "9H", "9S", "AC", "AD", "AH", "AS"] as Card[]).find(
      (card) => !ordered.hands[0].includes(card),
    ) as Card;
    expect(expectFail(ordered, { type: "discard", seat: 0, card: notHeld })).toMatch(/not in/);
  });
});

describe("going alone", () => {
  it("empties the partner's hand and skips their turn", () => {
    const ordered = expectOk(newGame({ seed: SEED, dealer: 0 }), {
      type: "order-up",
      seat: 1,
      alone: true,
    });
    const playing = expectOk(ordered, {
      type: "discard",
      seat: 0,
      card: ordered.hands[0][0] as Card,
    });
    expect(playing.aloneSeat).toBe(1);
    expect(playing.hands[3]).toHaveLength(0);
    expect(playing.turn).toBe(1);
    const afterLead = expectOk(playing, {
      type: "play-card",
      seat: 1,
      card: legalPlaysFor(playing, 1)[0] as Card,
    });
    expect(afterLead.turn).toBe(2);
  });

  it("keeps the dealer out of the discard when the dealer sits out", () => {
    const state = passAround(newGame({ seed: SEED, dealer: 0 }), 1);
    const before = state.hands[0];
    const ordered = expectOk(state, { type: "order-up", seat: 2, alone: true });
    expect(ordered.phase).toBe("playing");
    expect(ordered.hands[0]).toHaveLength(0);
    expect(before).toHaveLength(5);
    expect(ordered.turn).toBe(1);
  });

  it("resolves a trick after three cards", () => {
    const ordered = expectOk(newGame({ seed: SEED, dealer: 0 }), {
      type: "order-up",
      seat: 1,
      alone: true,
    });
    let state = expectOk(ordered, {
      type: "discard",
      seat: 0,
      card: ordered.hands[0][0] as Card,
    });
    for (let i = 0; i < 3; i += 1) {
      state = expectOk(state, {
        type: "play-card",
        seat: state.turn,
        card: legalPlaysFor(state, state.turn)[0] as Card,
      });
    }
    expect(state.completed).toHaveLength(1);
    expect(state.completed[0]?.plays).toHaveLength(3);
  });
});

describe("play rules", () => {
  const openPlay = (): GameState => {
    const ordered = expectOk(newGame({ seed: SEED, dealer: 0 }), {
      type: "order-up",
      seat: 1,
      alone: false,
    });
    return expectOk(ordered, { type: "discard", seat: 0, card: ordered.hands[0][0] as Card });
  };

  it("refuses a card from a seat that is not on turn", () => {
    const state = openPlay();
    expect(expectFail(state, { type: "play-card", seat: 2, card: state.hands[2][0] as Card })).toMatch(
      /not your turn/,
    );
  });

  it("refuses a card the seat does not hold", () => {
    const state = openPlay();
    const notHeld = state.hands[2][0] as Card;
    expect(expectFail(state, { type: "play-card", seat: 1, card: notHeld })).toMatch(/not in your hand/);
  });

  it("makes a seat follow suit", () => {
    const state = withState({
      phase: "playing",
      trump: "H",
      maker: 1,
      turn: 1,
      hands: { 0: [], 1: ["9C", "AS"], 2: [], 3: [] },
      trick: [{ seat: 0, card: "KC" }],
    });
    expect(expectFail(state, { type: "play-card", seat: 1, card: "AS" })).toMatch(/follow suit/);
    expect(legalPlaysFor(state, 1)).toEqual(["9C"]);
  });

  it("refuses an action in the wrong phase", () => {
    const state = openPlay();
    expect(expectFail(state, { type: "pass", seat: 1 })).toMatch(/cannot pass during playing/);
  });
});

describe("scoring", () => {
  const lastTrick = (over: Partial<GameState>): GameState =>
    withState({
      phase: "playing",
      trump: "H",
      maker: 1,
      upcard: null,
      hands: { 0: ["9C"], 1: ["AH"], 2: ["TC"], 3: ["QC"] },
      turn: 1,
      trick: [],
      ...over,
    });

  const wonBy = (winners: Seat[]) => winners.map((winner) => ({ plays: [], winner }));

  const playOut = (state: GameState): GameState => {
    let next = state;
    while (next.phase === "playing") {
      next = expectOk(next, {
        type: "play-card",
        seat: next.turn,
        card: legalPlaysFor(next, next.turn)[0] as Card,
      });
    }
    return next;
  };

  it("gives the makers one point for three or four tricks", () => {
    const state = playOut(lastTrick({ completed: wonBy([1, 1, 0, 0]) }));
    expect(state.lastHand).toMatchObject({ makerTricks: 3, points: 1, scoringTeam: 1, euchred: false });
    expect(state.score).toEqual({ 0: 0, 1: 1 });
    expect(state.phase).toBe("hand-over");
  });

  it("gives the makers two points for a march", () => {
    const state = playOut(lastTrick({ completed: wonBy([1, 3, 1, 3]) }));
    expect(state.lastHand).toMatchObject({ makerTricks: 5, points: 2, scoringTeam: 1 });
  });

  it("gives a lone march four points", () => {
    const state = playOut(
      lastTrick({
        aloneSeat: 1,
        hands: { 0: ["9C"], 1: ["AH"], 2: ["TC"], 3: [] },
        completed: wonBy([1, 1, 1, 1]),
      }),
    );
    expect(state.lastHand).toMatchObject({ makerTricks: 5, alone: true, points: 4, scoringTeam: 1 });
  });

  it("gives the defenders two points for a euchre", () => {
    const state = playOut(lastTrick({ completed: wonBy([0, 0, 2, 1]) }));
    expect(state.lastHand).toMatchObject({ makerTricks: 2, points: 2, scoringTeam: 0, euchred: true });
    expect(state.score).toEqual({ 0: 2, 1: 0 });
  });

  it("ends the game when a team reaches the target", () => {
    const state = playOut(lastTrick({ score: { 0: 0, 1: 9 }, completed: wonBy([1, 1, 0, 0]) }));
    expect(state.phase).toBe("game-over");
    expect(state.winner).toBe(1);
    expect(expectFail(state, { type: "next-hand", seat: 0 })).toMatch(/cannot next-hand/);
  });

  it("deals the next hand with the dealer moved along", () => {
    const over = playOut(lastTrick({ completed: wonBy([1, 1, 0, 0]) }));
    const next = expectOk(over, { type: "next-hand", seat: 3 });
    expect(next.phase).toBe("bidding-up");
    expect(next.dealer).toBe(1);
    expect(next.turn).toBe(2);
    expect(next.score).toEqual({ 0: 0, 1: 1 });
  });
});
