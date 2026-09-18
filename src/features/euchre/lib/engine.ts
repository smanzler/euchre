import type { Card, Suit } from "./cards";
import { suitOf } from "./cards";
import { type Deal, deal, randomSeed } from "./deal";
import { effectiveSuit, legalPlays, trickWinner } from "./trick";
import {
  type ActionType,
  DEFAULT_RULES,
  type GameAction,
  type GameEvent,
  type GameRules,
  type GameState,
  type HandResult,
  type Phase,
  SEATS,
  type Seat,
  type Team,
  nextSeat,
  otherTeam,
  partnerOf,
  sittingOutSeat,
  teamOf,
} from "./types";

export type ApplyResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

const fail = (reason: string): ApplyResult => ({ ok: false, reason });

const done = (state: GameState): ApplyResult => ({ ok: true, state });

const withEvents = (state: GameState, ...events: GameEvent[]): GameState => ({
  ...state,
  events: [...state.events, ...events],
});

const openHand = (state: GameState, dealer: Seat, dealt: Deal): GameState => ({
  ...state,
  seed: dealt.seed,
  handNumber: state.handNumber + 1,
  phase: "bidding-up",
  dealer,
  turn: nextSeat(dealer),
  hands: dealt.hands,
  upcard: dealt.upcard,
  trump: null,
  maker: null,
  aloneSeat: null,
  passes: 0,
  trick: [],
  completed: [],
  events: [{ type: "dealt", dealer }],
});

export type NewGameOptions = {
  rules?: Partial<GameRules>;
  dealer?: Seat;
  seed?: number;
};

export const newGame = (options: NewGameOptions = {}): GameState => {
  const dealer = options.dealer ?? 0;
  const seed = options.seed ?? randomSeed();
  const empty: GameState = {
    rules: { ...DEFAULT_RULES, ...options.rules },
    seed,
    handNumber: 0,
    phase: "bidding-up",
    dealer,
    turn: nextSeat(dealer),
    hands: { 0: [], 1: [], 2: [], 3: [] },
    upcard: null,
    trump: null,
    maker: null,
    aloneSeat: null,
    passes: 0,
    trick: [],
    completed: [],
    score: { 0: 0, 1: 0 },
    lastHand: null,
    events: [],
    winner: null,
  };
  return openHand(empty, dealer, deal(seed));
};

const startNextHand = (state: GameState): GameState => {
  const dealer = nextSeat(state.dealer);
  return openHand(state, dealer, deal(state.seed));
};

/** The seat after `from` that still holds cards this hand. */
const nextActiveSeat = (state: GameState, from: Seat): Seat => {
  const skip = sittingOutSeat(state);
  const candidate = nextSeat(from);
  return candidate === skip ? nextSeat(candidate) : candidate;
};

const seatsInPlay = (state: GameState): number => (state.aloneSeat === null ? 4 : 3);

const withoutCard = (hand: readonly Card[], card: Card): readonly Card[] => {
  const index = hand.indexOf(card);
  return index < 0 ? hand : [...hand.slice(0, index), ...hand.slice(index + 1)];
};

const clearSittingOutHand = (state: GameState): GameState => {
  const skip = sittingOutSeat(state);
  if (skip === null) return state;
  return { ...state, hands: { ...state.hands, [skip]: [] } };
};

/**
 * Opens play once trump is settled. The dealer never picks the upcard up when
 * the dealer is the seat that sits out: the hand is discarded either way.
 */
const beginPlay = (state: GameState): GameState => {
  const opened = clearSittingOutHand(state);
  return { ...opened, phase: "playing", turn: nextActiveSeat(opened, opened.dealer) };
};

const scoreHand = (state: GameState): GameState => {
  const maker = state.maker;
  const trump = state.trump;
  if (maker === null || trump === null) return state;
  const makerTeam = teamOf(maker);
  const makerTricks = state.completed.filter(
    (trick) => teamOf(trick.winner) === makerTeam,
  ).length;
  const euchred = makerTricks < 3;
  const alone = state.aloneSeat !== null;
  const scoringTeam: Team = euchred ? otherTeam(makerTeam) : makerTeam;
  const points = euchred ? 2 : makerTricks === 5 ? (alone ? 4 : 2) : 1;
  const result: HandResult = {
    maker,
    trump,
    alone,
    makerTricks,
    scoringTeam,
    points,
    euchred,
  };
  const score: Record<Team, number> = {
    ...state.score,
    [scoringTeam]: state.score[scoringTeam] + points,
  };
  const won = score[scoringTeam] >= state.rules.pointsToWin;
  const scored: GameState = {
    ...state,
    score,
    lastHand: result,
    phase: won ? "game-over" : "hand-over",
    winner: won ? scoringTeam : null,
  };
  return won
    ? withEvents(scored, { type: "hand-scored", result }, { type: "game-won", team: scoringTeam })
    : withEvents(scored, { type: "hand-scored", result });
};

const resolveTrick = (state: GameState): GameState => {
  const trump = state.trump;
  if (trump === null) return state;
  const winner = trickWinner(state.trick, trump);
  const completed = [...state.completed, { plays: state.trick, winner }];
  const closed = withEvents(
    { ...state, trick: [], completed, turn: winner },
    { type: "trick-won", seat: winner },
  );
  const handOver = SEATS.every((seat) => closed.hands[seat].length === 0);
  return handOver ? scoreHand(closed) : closed;
};

type ActionHandler<T extends ActionType = ActionType> = {
  readonly phases: readonly Phase[];
  /** Set when a seat that is not on turn may send the action. */
  readonly offTurn?: boolean;
  apply(state: GameState, action: Extract<GameAction, { type: T }>): ApplyResult;
};

const passHandler: ActionHandler = {
  phases: ["bidding-up", "bidding-call"],
  apply(state, action) {
    if (action.type !== "pass") return fail("wrong handler");
    const isDealer = action.seat === state.dealer;
    if (state.phase === "bidding-call" && isDealer && state.rules.stickTheDealer) {
      return fail("the dealer must name a suit");
    }
    const passed = withEvents({ ...state, passes: state.passes + 1 }, {
      type: "passed",
      seat: action.seat,
    });
    if (passed.passes < SEATS.length) {
      return done({ ...passed, turn: nextSeat(passed.turn) });
    }
    if (passed.phase === "bidding-up") {
      return done({
        ...passed,
        phase: "bidding-call",
        passes: 0,
        turn: nextSeat(passed.dealer),
      });
    }
    return done(withEvents(startNextHand(passed), { type: "redeal" }));
  },
} satisfies ActionHandler<"pass">;

const orderUpHandler: ActionHandler = {
  phases: ["bidding-up"],
  apply(state, action) {
    if (action.type !== "order-up") return fail("wrong handler");
    const upcard = state.upcard;
    if (upcard === null) return fail("there is no upcard to order up");
    const trump = suitOf(upcard);
    const called: GameState = withEvents(
      {
        ...state,
        trump,
        maker: action.seat,
        aloneSeat: action.alone ? action.seat : null,
        upcard: null,
        passes: 0,
        hands: { ...state.hands, [state.dealer]: [...state.hands[state.dealer], upcard] },
        phase: "dealer-discard",
        turn: state.dealer,
      },
      { type: "ordered-up", seat: action.seat, suit: trump, alone: action.alone },
    );
    if (sittingOutSeat(called) !== state.dealer) return done(called);
    const skipped: GameState = {
      ...called,
      hands: { ...called.hands, [state.dealer]: state.hands[state.dealer] },
    };
    return done(beginPlay(skipped));
  },
} satisfies ActionHandler<"order-up">;

const callTrumpHandler: ActionHandler = {
  phases: ["bidding-call"],
  apply(state, action) {
    if (action.type !== "call-trump") return fail("wrong handler");
    const turnedDown = state.upcard;
    if (turnedDown !== null && action.suit === suitOf(turnedDown)) {
      return fail("that suit was turned down");
    }
    const called: GameState = withEvents(
      {
        ...state,
        trump: action.suit,
        maker: action.seat,
        aloneSeat: action.alone ? action.seat : null,
        upcard: null,
        passes: 0,
      },
      { type: "called", seat: action.seat, suit: action.suit, alone: action.alone },
    );
    return done(beginPlay(called));
  },
} satisfies ActionHandler<"call-trump">;

const discardHandler: ActionHandler = {
  phases: ["dealer-discard"],
  apply(state, action) {
    if (action.type !== "discard") return fail("wrong handler");
    if (!state.hands[state.dealer].includes(action.card)) {
      return fail("that card is not in the dealer's hand");
    }
    const hands = {
      ...state.hands,
      [state.dealer]: withoutCard(state.hands[state.dealer], action.card),
    };
    return done(beginPlay({ ...state, hands }));
  },
} satisfies ActionHandler<"discard">;

const playCardHandler: ActionHandler = {
  phases: ["playing"],
  apply(state, action) {
    if (action.type !== "play-card") return fail("wrong handler");
    const trump = state.trump;
    if (trump === null) return fail("trump is not set");
    const hand = state.hands[action.seat];
    if (!hand.includes(action.card)) return fail("that card is not in your hand");
    const first = state.trick[0];
    const led = first === undefined ? null : effectiveSuit(first.card, trump);
    if (!legalPlays(hand, led, trump).includes(action.card)) {
      return fail("you must follow suit");
    }
    const played: GameState = {
      ...state,
      hands: { ...state.hands, [action.seat]: withoutCard(hand, action.card) },
      trick: [...state.trick, { seat: action.seat, card: action.card }],
    };
    if (played.trick.length === seatsInPlay(played)) return done(resolveTrick(played));
    return done({ ...played, turn: nextActiveSeat(played, action.seat) });
  },
} satisfies ActionHandler<"play-card">;

const nextHandHandler: ActionHandler = {
  phases: ["hand-over"],
  offTurn: true,
  apply(state, action) {
    if (action.type !== "next-hand") return fail("wrong handler");
    return done(startNextHand(state));
  },
} satisfies ActionHandler<"next-hand">;

const actionHandlers: Record<ActionType, ActionHandler> = {
  pass: passHandler,
  "order-up": orderUpHandler,
  "call-trump": callTrumpHandler,
  discard: discardHandler,
  "play-card": playCardHandler,
  "next-hand": nextHandHandler,
};

export const applyAction = (state: GameState, action: GameAction): ApplyResult => {
  const handler = actionHandlers[action.type];
  if (!handler.phases.includes(state.phase)) {
    return fail(`cannot ${action.type} during ${state.phase}`);
  }
  if (handler.offTurn !== true && action.seat !== state.turn) {
    return fail("it is not your turn");
  }
  if (handler.offTurn !== true && action.seat === sittingOutSeat(state)) {
    return fail("you sit this hand out");
  }
  return handler.apply(state, action);
};

export const legalPlaysFor = (state: GameState, seat: Seat): readonly Card[] => {
  if (state.phase !== "playing" || state.trump === null || state.turn !== seat) return [];
  const first = state.trick[0];
  const led = first === undefined ? null : effectiveSuit(first.card, state.trump);
  return legalPlays(state.hands[seat], led, state.trump);
};

export const callableSuits = (state: GameState): readonly Suit[] => {
  const turnedDown = state.upcard;
  const excluded = turnedDown === null ? null : suitOf(turnedDown);
  return (["C", "D", "H", "S"] as const).filter((suit) => suit !== excluded);
};

export const tricksWonBy = (state: GameState, team: Team): number =>
  state.completed.filter((trick) => teamOf(trick.winner) === team).length;

export const partnerLabelSeats = (seat: Seat): readonly Seat[] => [seat, partnerOf(seat)];
