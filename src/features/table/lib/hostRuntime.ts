import { applyAction, newGame } from "@/features/euchre/lib/engine";
import {
  type GameRules,
  type GameState,
  SEATS,
  type Seat,
} from "@/features/euchre/lib/types";
import { type PlayerView, viewFor } from "@/features/euchre/lib/view";
import {
  type LobbySnapshot,
  type PlayerIntent,
  type PlayerSlot,
  parseClientMessage,
  toAction,
} from "../transport/lib/protocol";
import type { PeerId, Transport } from "../transport/lib/types";
import { SEAT_NAMES } from "./seats";

export const HOST_SEAT: Seat = 0;

type Occupant = {
  /** null for a seat the host device plays itself. */
  peer: PeerId | null;
  name: string;
  connected: boolean;
};

export type HostRuntimeOptions = {
  tableName: string;
  hostName: string;
  /** Pass and play. The host device plays every seat. */
  holdsEverySeat: boolean;
  rules?: Partial<GameRules>;
  seed?: number;
  onChange(): void;
};

const emptySeats = (): Record<Seat, Occupant | null> => ({
  0: null,
  1: null,
  2: null,
  3: null,
});

export class HostRuntime {
  private transport: Transport | null = null;
  private seats = emptySeats();
  private state: GameState | null = null;

  constructor(private readonly options: HostRuntimeOptions) {
    if (options.holdsEverySeat) {
      for (const seat of SEATS) {
        this.seats[seat] = { peer: null, name: SEAT_NAMES[seat], connected: true };
      }
      return;
    }
    this.seats[HOST_SEAT] = { peer: null, name: options.hostName, connected: true };
  }

  attach(transport: Transport): void {
    this.transport = transport;
  }

  get started(): boolean {
    return this.state !== null;
  }

  localSeats(): Seat[] {
    return SEATS.filter((seat) => this.seats[seat]?.peer === null);
  }

  /** The seat whose cards the host device shows right now. */
  activeLocalSeat(): Seat {
    const local = this.localSeats();
    const turn = this.state?.turn;
    if (turn !== undefined && local.includes(turn)) return turn;
    return local[0] ?? HOST_SEAT;
  }

  lobby(): LobbySnapshot {
    const players: PlayerSlot[] = SEATS.map((seat) => {
      const occupant = this.seats[seat];
      return {
        seat,
        name: occupant?.name ?? "Open seat",
        connected: occupant?.connected ?? false,
        isHost: seat === HOST_SEAT,
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
    if (occupant === null) return;
    this.seats[seat] = this.started
      ? { ...occupant, connected: false }
      : null;
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
    return SEATS.find((seat) => this.seats[seat]?.peer === peer) ?? null;
  }

  private seatPeer(peer: PeerId, name: string): void {
    const existing = this.seatOf(peer);
    if (existing !== null) {
      this.seats[existing] = { peer, name, connected: true };
      this.publish();
      return;
    }
    const free = SEATS.find((seat) => this.seats[seat] === null);
    if (free === undefined) {
      void this.sendTo(peer, { t: "rejected", reason: "the table is full" });
      return;
    }
    this.seats[free] = { peer, name, connected: true };
    this.publish();
  }

  private sendTo(peer: PeerId, message: object): Promise<void> {
    return this.transport?.send(peer, JSON.stringify(message)) ?? Promise.resolve();
  }

  private publish(): void {
    const lobby = this.lobby();
    for (const seat of SEATS) {
      const occupant = this.seats[seat];
      if (occupant === null || occupant.peer === null || !occupant.connected) continue;
      const message =
        this.state === null
          ? { t: "lobby", seat, lobby }
          : { t: "view", view: viewFor(this.state, seat) };
      void this.sendTo(occupant.peer, message);
    }
    this.options.onChange();
  }
}
