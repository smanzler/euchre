import type { Card, Suit } from "./cards";
import type { TrickPlay } from "./trick";

export const SEATS = [0, 1, 2, 3] as const;
export type Seat = (typeof SEATS)[number];

export const TEAMS = [0, 1] as const;
export type Team = (typeof TEAMS)[number];

export const teamOf = (seat: Seat): Team => (seat % 2) as Team;

export const otherTeam = (team: Team): Team => (1 - team) as Team;

export const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;

export const nextSeat = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;

export const isSeat = (value: unknown): value is Seat =>
  (SEATS as readonly unknown[]).includes(value);

export const PHASES = [
  "bidding-up",
  "bidding-call",
  "dealer-discard",
  "playing",
  "hand-over",
  "game-over",
] as const;
export type Phase = (typeof PHASES)[number];

export type GameRules = {
  pointsToWin: number;
  /** The dealer must name a suit when the second bidding round reaches them. */
  stickTheDealer: boolean;
};

export const DEFAULT_RULES: GameRules = { pointsToWin: 10, stickTheDealer: true };

export type CompletedTrick = {
  plays: readonly TrickPlay<Seat>[];
  winner: Seat;
};

export type HandResult = {
  maker: Seat;
  trump: Suit;
  alone: boolean;
  makerTricks: number;
  scoringTeam: Team;
  points: number;
  euchred: boolean;
};

export type GameEvent =
  | { type: "dealt"; dealer: Seat }
  | { type: "passed"; seat: Seat }
  | { type: "ordered-up"; seat: Seat; suit: Suit; alone: boolean }
  | { type: "called"; seat: Seat; suit: Suit; alone: boolean }
  | { type: "trick-won"; seat: Seat }
  | { type: "hand-scored"; result: HandResult }
  | { type: "redeal" }
  | { type: "game-won"; team: Team };

export type GameState = {
  rules: GameRules;
  /** Seeds the next deal. Carried in state so a game replays exactly. */
  seed: number;
  handNumber: number;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  hands: Record<Seat, readonly Card[]>;
  /** The face up card while it can still be ordered up. */
  upcard: Card | null;
  trump: Suit | null;
  maker: Seat | null;
  aloneSeat: Seat | null;
  /** Passes in the current bidding round. */
  passes: number;
  trick: readonly TrickPlay<Seat>[];
  completed: readonly CompletedTrick[];
  score: Record<Team, number>;
  lastHand: HandResult | null;
  events: readonly GameEvent[];
  winner: Team | null;
};

export type GameAction =
  | { type: "order-up"; seat: Seat; alone: boolean }
  | { type: "pass"; seat: Seat }
  | { type: "call-trump"; seat: Seat; suit: Suit; alone: boolean }
  | { type: "discard"; seat: Seat; card: Card }
  | { type: "play-card"; seat: Seat; card: Card }
  | { type: "next-hand"; seat: Seat };

export type ActionType = GameAction["type"];

/** The seat that the alone caller's partner leaves empty. */
export const sittingOutSeat = (state: GameState): Seat | null =>
  state.aloneSeat === null ? null : partnerOf(state.aloneSeat);
