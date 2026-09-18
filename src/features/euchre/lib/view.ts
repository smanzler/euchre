import type { Card, Suit } from "./cards";
import { callableSuits, legalPlaysFor } from "./engine";
import type { TrickPlay } from "./trick";
import {
  type CompletedTrick,
  type GameRules,
  type GameState,
  type HandResult,
  type Phase,
  SEATS,
  type Seat,
  type Team,
  sittingOutSeat,
} from "./types";

/** Everything one seat may know. Other hands appear only as a card count. */
export type PlayerView = {
  seat: Seat;
  handNumber: number;
  phase: Phase;
  rules: GameRules;
  dealer: Seat;
  turn: Seat;
  hand: readonly Card[];
  handSizes: Record<Seat, number>;
  upcard: Card | null;
  trump: Suit | null;
  maker: Seat | null;
  aloneSeat: Seat | null;
  sittingOut: Seat | null;
  trick: readonly TrickPlay<Seat>[];
  lastTrick: CompletedTrick | null;
  tricksWon: Record<Team, number>;
  score: Record<Team, number>;
  lastHand: HandResult | null;
  winner: Team | null;
  legalPlays: readonly Card[];
  callableSuits: readonly Suit[];
};

export const viewFor = (state: GameState, seat: Seat): PlayerView => {
  const handSizes = {} as Record<Seat, number>;
  for (const other of SEATS) handSizes[other] = state.hands[other].length;
  const tricksWon: Record<Team, number> = { 0: 0, 1: 0 };
  for (const trick of state.completed) {
    const team = (trick.winner % 2) as Team;
    tricksWon[team] += 1;
  }
  return {
    seat,
    handNumber: state.handNumber,
    phase: state.phase,
    rules: state.rules,
    dealer: state.dealer,
    turn: state.turn,
    hand: state.hands[seat],
    handSizes,
    upcard: state.upcard,
    trump: state.trump,
    maker: state.maker,
    aloneSeat: state.aloneSeat,
    sittingOut: sittingOutSeat(state),
    trick: state.trick,
    lastTrick: state.completed[state.completed.length - 1] ?? null,
    tricksWon,
    score: state.score,
    lastHand: state.lastHand,
    winner: state.winner,
    legalPlays: legalPlaysFor(state, seat),
    callableSuits: callableSuits(state),
  };
};
