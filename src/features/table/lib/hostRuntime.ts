import { applyAction, newGame } from "@/features/euchre/lib/engine";
import {
  type GameRules,
  type GameState,
  SEATS,
  type Seat,
} from "@/features/euchre/lib/types";
import { type PlayerView, viewFor } from "@/features/euchre/lib/view";
import { chooseIntent } from "../bots/lib/policy";
import {
  type LobbySnapshot,
  type PlayerIntent,
  type PlayerSlot,
  type SeatKind,
  parseClientMessage,
  toAction,
} from "../transport/lib/protocol";
import type { PeerId, Transport } from "../transport/lib/types";
import { SEAT_NAMES } from "./seats";

export const HOST_SEAT: Seat = 0;

/** Long enough to read the move a bot just made. */
export const BOT_MOVE_DELAY_MS = 750;

type Occupant =
  | { kind: "local"; name: string }
  | { kind: "bot"; name: string }
  | { kind: "remote"; peer: PeerId; name: string; connected: boolean };

const isConnected = (occupant: Occupant | null): boolean =>
  occupant !== null && (occupant.kind !== "remote" || occupant.connected);

export type HostRuntimeOptions = {
  tableName: string;
  hostName: string;
  /** Pass and play. The host device plays every seat it has not given to a bot. */
  holdsEverySeat: boolean;
  rules?: Partial<GameRules>;
  seed?: number;
  /** Paces a bot's move. Tests pass a scheduler that runs at once. */
  scheduleBotMove?: (run: () => void) => void;
  onChange(): void;
};

const emptySeats = (): Record<Seat, Occupant | null> => ({ 0: null, 1: null, 2: null, 3: null });

export class HostRuntime {
  private transport: Transport | null = null;
  private seats = emptySeats();
  private state: GameState | null = null;
  private botMoveQueued = false;

  constructor(private readonly options: HostRuntimeOptions) {
    this.seats[HOST_SEAT] = { kind: "local", name: options.hostName };
    if (!options.holdsEverySeat) return;
    for (const seat of SEATS) {
      if (seat === HOST_SEAT) continue;
      this.seats[seat] = { kind: "local", name: SEAT_NAMES[seat] };
    }
  }

  attach(transport: Transport): void {
    this.transport = transport;
  }

  get started(): boolean {
    return this.state !== null;
  }

  localSeats(): Seat[] {
    return SEATS.filter((seat) => this.seats[seat]?.kind === "local");
  }

  /** The seat whose cards the host device shows right now. */
  activeLocalSeat(): Seat {
    const local = this.localSeats();
    const turn = this.state?.turn;
    if (turn !== undefined && local.includes(turn)) return turn;
    return local[0] ?? HOST_SEAT;
  }

  /** Gives a seat to a bot. The host always keeps its own seat. */
  addBot(seat: Seat): void {
    if (this.started || seat === HOST_SEAT) return;
    const occupant = this.seats[seat];
    if (occupant?.kind === "remote" && occupant.connected) return;
    this.seats[seat] = { kind: "bot", name: `${SEAT_NAMES[seat]} bot` };
    this.publish();
  }

  removeBot(seat: Seat): void {
    if (this.started || this.seats[seat]?.kind !== "bot") return;
    this.seats[seat] = this.options.holdsEverySeat
      ? { kind: "local", name: SEAT_NAMES[seat] }
      : null;
    this.publish();
  }

  fillWithBots(): void {
    if (this.started) return;
    for (const seat of SEATS) {
      if (seat === HOST_SEAT) continue;
      if (isConnected(this.seats[seat]) && this.seats[seat]?.kind === "remote") continue;
      this.seats[seat] = { kind: "bot", name: `${SEAT_NAMES[seat]} bot` };
    }
    this.publish();
  }

  lobby(): LobbySnapshot {
    const players: PlayerSlot[] = SEATS.map((seat) => {
      const occupant = this.seats[seat];
      const kind: SeatKind =
        seat === HOST_SEAT
          ? "host"
          : occupant === null
            ? "open"
            : occupant.kind === "bot"
              ? "bot"
              : "human";
      return {
        seat,
        name: occupant?.name ?? "Open seat",
        connected: isConnected(occupant),
        kind,
      };
    });
    return {
      tableName: this.options.tableName,
      players,
      canStart: !this.started && players.every((player) => player.connected),
      started: this.started,
    };
  }

  view(): PlayerView | null {
    return this.state === null ? null : viewFor(this.state, this.activeLocalSeat());
  }

  start(): void {
    if (this.started || !this.lobby().canStart) return;
    this.state = newGame({ rules: this.options.rules, seed: this.options.seed, dealer: HOST_SEAT });
    this.publish();
  }

  /** Deals a fresh game to the same table. */
  restart(): void {
    if (!this.started) return;
    this.state = newGame({ rules: this.options.rules, dealer: HOST_SEAT });
    this.publish();
  }

  /** The reason the move was refused, or null when it was taken. */
  submit(seat: Seat, intent: PlayerIntent): string | null {
    if (this.state === null) return "the hand has not started";
    const result = applyAction(this.state, toAction(intent, seat));
    if (!result.ok) return result.reason;
    this.state = result.state;
    this.publish();
    return null;
  }

  onPeerJoin(_peer: PeerId): void {
    // A seat is taken once the peer says hello, so there is nothing to do yet.
  }

  onPeerLeave(peer: PeerId): void {
    const seat = this.seatOf(peer);
    if (seat === null) return;
    const occupant = this.seats[seat];
    if (occupant === null || occupant.kind !== "remote") return;
    this.seats[seat] = this.started ? { ...occupant, connected: false } : null;
    this.publish();
  }

  onMessage(peer: PeerId, text: string): void {
    const message = parseClientMessage(text);
    if (message === null) return;
    if (message.t === "hello") {
      this.seatPeer(peer, message.name);
      return;
    }
    const seat = this.seatOf(peer);
    if (seat === null) {
      void this.sendTo(peer, { t: "rejected", reason: "you are not seated" });
      return;
    }
    const reason = this.submit(seat, message.intent);
    if (reason !== null) void this.sendTo(peer, { t: "rejected", reason });
  }

  private seatOf(peer: PeerId): Seat | null {
    return (
      SEATS.find((seat) => {
        const occupant = this.seats[seat];
        return occupant?.kind === "remote" && occupant.peer === peer;
      }) ?? null
    );
  }

  private seatPeer(peer: PeerId, name: string): void {
    const existing = this.seatOf(peer);
    if (existing !== null) {
      this.seats[existing] = { kind: "remote", peer, name, connected: true };
      this.publish();
      return;
    }
    // A person takes an open seat first, and a bot's seat only if none is open.
    const free =
      SEATS.find((seat) => this.seats[seat] === null) ??
      (this.started ? undefined : SEATS.find((seat) => this.seats[seat]?.kind === "bot"));
    if (free === undefined) {
      void this.sendTo(peer, { t: "rejected", reason: "the table is full" });
      return;
    }
    this.seats[free] = { kind: "remote", peer, name, connected: true };
    this.publish();
  }

  private sendTo(peer: PeerId, message: object): Promise<void> {
    return this.transport?.send(peer, JSON.stringify(message)) ?? Promise.resolve();
  }

  private queueBotMove(): void {
    if (this.botMoveQueued || this.state === null) return;
    if (this.seats[this.state.turn]?.kind !== "bot") return;
    this.botMoveQueued = true;
    const schedule =
      this.options.scheduleBotMove ??
      ((run: () => void) => {
        setTimeout(run, BOT_MOVE_DELAY_MS);
      });
    schedule(() => {
      this.botMoveQueued = false;
      this.takeBotMove();
    });
  }

  private takeBotMove(): void {
    const state = this.state;
    if (state === null) return;
    const seat = state.turn;
    if (this.seats[seat]?.kind !== "bot") return;
    const intent = chooseIntent(viewFor(state, seat));
    // A refused move would loop, so stop and let a person see the table.
    if (intent === null) return;
    this.submit(seat, intent);
  }

  private publish(): void {
    const lobby = this.lobby();
    for (const seat of SEATS) {
      const occupant = this.seats[seat];
      if (occupant === null || occupant.kind !== "remote" || !occupant.connected) continue;
      const message =
        this.state === null
          ? { t: "lobby", seat, lobby }
          : { t: "view", view: viewFor(this.state, seat) };
      void this.sendTo(occupant.peer, message);
    }
    this.options.onChange();
    this.queueBotMove();
  }
}
