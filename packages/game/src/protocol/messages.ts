import type { Card, Suit } from "../rules/cards";
import type { GameAction, Seat } from "../rules/types";
import type { PlayerView } from "../rules/view";

type WithoutSeat<T> = T extends { seat: Seat } ? Omit<T, "seat"> : never;

/** A move as a player expresses it. The host fills in the seat. */
export type PlayerIntent = WithoutSeat<GameAction>;

export const toAction = (intent: PlayerIntent, seat: Seat): GameAction =>
  ({ ...intent, seat }) as GameAction;

export const SEAT_KINDS = ["host", "human", "bot", "open"] as const;
export type SeatKind = (typeof SEAT_KINDS)[number];

export type PlayerSlot = {
  seat: Seat;
  name: string;
  connected: boolean;
  kind: SeatKind;
};

export type LobbySnapshot = {
  tableName: string;
  players: readonly PlayerSlot[];
  canStart: boolean;
  started: boolean;
};

export type ClientMessage =
  { t: "hello"; name: string } | { t: "intent"; intent: PlayerIntent };

export type HostMessage =
  | { t: "lobby"; seat: Seat; lobby: LobbySnapshot }
  | { t: "view"; view: PlayerView }
  | { t: "rejected"; reason: string }
  | { t: "closed"; reason: string };

const CLIENT_TAGS: readonly ClientMessage["t"][] = ["hello", "intent"];
const HOST_TAGS: readonly HostMessage["t"][] = [
  "lobby",
  "view",
  "rejected",
  "closed",
];

const parseTagged = <T extends { t: string }>(
  text: string,
  tags: readonly string[],
): T | null => {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const tag = (value as { t?: unknown }).t;
    return typeof tag === "string" && tags.includes(tag) ? (value as T) : null;
  } catch {
    return null;
  }
};

export const parseClientMessage = (text: string): ClientMessage | null =>
  parseTagged<ClientMessage>(text, CLIENT_TAGS);

export const parseHostMessage = (text: string): HostMessage | null =>
  parseTagged<HostMessage>(text, HOST_TAGS);

export const suitIntent = (suit: Suit, alone: boolean): PlayerIntent => ({
  type: "call-trump",
  suit,
  alone,
});

export const playIntent = (card: Card): PlayerIntent => ({
  type: "play-card",
  card,
});
