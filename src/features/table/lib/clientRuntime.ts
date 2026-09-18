import type { Seat } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import {
  type LobbySnapshot,
  type PlayerIntent,
  parseHostMessage,
} from "../transport/lib/protocol";
import type { Transport } from "../transport/lib/types";

export type ClientRuntimeOptions = {
  displayName: string;
  onChange(): void;
};

export class ClientRuntime {
  private transport: Transport | null = null;
  private lobbyState: LobbySnapshot | null = null;
  private viewState: PlayerView | null = null;
  private seatNumber: Seat | null = null;
  private rejection: string | null = null;
  private closedReason: string | null = null;

  constructor(private readonly options: ClientRuntimeOptions) {}

  attach(transport: Transport): void {
    this.transport = transport;
    void transport.broadcast(
      JSON.stringify({ t: "hello", name: this.options.displayName }),
    );
  }

  get lobby(): LobbySnapshot | null {
    return this.lobbyState;
  }

  get view(): PlayerView | null {
    return this.viewState;
  }

  get seat(): Seat | null {
    return this.viewState?.seat ?? this.seatNumber;
  }

  get lastRejection(): string | null {
    return this.rejection;
  }

  get closed(): string | null {
    return this.closedReason;
  }

  clearRejection(): void {
    if (this.rejection === null) return;
    this.rejection = null;
    this.options.onChange();
  }

  onMessage(text: string): void {
    const message = parseHostMessage(text);
    if (message === null) return;
    if (message.t === "lobby") {
      this.lobbyState = message.lobby;
      this.seatNumber = message.seat;
    } else if (message.t === "view") {
      this.viewState = message.view;
      this.rejection = null;
    } else if (message.t === "rejected") {
      this.rejection = message.reason;
    } else {
      this.closedReason = message.reason;
    }
    this.options.onChange();
  }

  submit(intent: PlayerIntent): void {
    void this.transport?.broadcast(JSON.stringify({ t: "intent", intent }));
  }
}
