import { z } from "zod";
import { type Card, SUITS, type Suit, isCard } from "../rules/cards";
import { type GameAction, SEATS, type Seat } from "../rules/types";
import type { PlayerView } from "../rules/view";
import { parseTagged } from "./tagged";

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

/** Covers a player name and a table name. */
export const MAX_NAME_LENGTH = 20;

export type ClientMessage =
  | { t: "hello"; name: string }
  | { t: "intent"; intent: PlayerIntent }
  | { t: "add-bot"; seat: Seat }
  | { t: "remove-bot"; seat: Seat }
  | { t: "rename"; seat: Seat; name: string }
  | { t: "start" }
  | { t: "restart" };

/** The client messages that only the player in the host seat may send. */
export type HostCommand = Exclude<ClientMessage, { t: "hello" | "intent" }>;

export type HostMessage =
  | { t: "lobby"; seat: Seat; lobby: LobbySnapshot }
  | { t: "view"; view: PlayerView }
  | { t: "rejected"; reason: string }
  | { t: "closed"; reason: string };

export const nameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);
export const seatSchema = z.literal(SEATS);
const cardSchema = z.custom<Card>(isCard);

const intentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("order-up"), alone: z.boolean() }),
  z.object({ type: z.literal("pass") }),
  z.object({
    type: z.literal("call-trump"),
    suit: z.enum(SUITS),
    alone: z.boolean(),
  }),
  z.object({ type: z.literal("discard"), card: cardSchema }),
  z.object({ type: z.literal("play-card"), card: cardSchema }),
  z.object({ type: z.literal("next-hand") }),
]) satisfies z.ZodType<PlayerIntent>;

const clientMessageSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("hello"), name: nameSchema }),
  z.object({ t: z.literal("intent"), intent: intentSchema }),
  z.object({ t: z.literal("add-bot"), seat: seatSchema }),
  z.object({ t: z.literal("remove-bot"), seat: seatSchema }),
  z.object({ t: z.literal("rename"), seat: seatSchema, name: nameSchema }),
  z.object({ t: z.literal("start") }),
  z.object({ t: z.literal("restart") }),
]) satisfies z.ZodType<ClientMessage>;

/** Parses JSON text against the schema. Gives null for bad JSON or a bad shape. */
export const parseWith = <T>(schema: z.ZodType<T>, text: string): T | null => {
  try {
    const result = schema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const HOST_TAGS: readonly HostMessage["t"][] = [
  "lobby",
  "view",
  "rejected",
  "closed",
];

/** Checks every field, because a client is not trusted. */
export const parseClientMessage = (text: string): ClientMessage | null =>
  parseWith(clientMessageSchema, text);

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
