import type { GameRules, Seat } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import type { LobbySnapshot, PlayerIntent } from "../transport/lib/protocol";
import { openTransport, transportDrivers } from "../transport/lib/registry";
import type {
  PeerId,
  Transport,
  TransportKind,
  TransportListener,
  TransportStatus,
} from "../transport/lib/types";
import { ClientRuntime } from "./clientRuntime";
import { HostRuntime } from "./hostRuntime";

export type TableMode = "idle" | "hosting" | "joining";

export type TableSnapshot = {
  mode: TableMode;
  kind: TransportKind | null;
  status: TransportStatus;
  statusDetail: string | null;
  error: string | null;
  lobby: LobbySnapshot | null;
  view: PlayerView | null;
  seat: Seat | null;
  /** The seats this device may move for. */
  controlledSeats: readonly Seat[];
  canStart: boolean;
  started: boolean;
};

const IDLE: TableSnapshot = {
  mode: "idle",
  kind: null,
  status: "idle",
  statusDetail: null,
  error: null,
  lobby: null,
  view: null,
  seat: null,
  controlledSeats: [],
  canStart: false,
  started: false,
};

export type HostOptions = {
  kind: Extract<TransportKind, "local" | "ble-host">;
  tableName: string;
  displayName: string;
  rules?: Partial<GameRules>;
  seed?: number;
};

export type JoinOptions = {
  deviceId: string;
  displayName: string;
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const listeners = new Set<() => void>();
let snapshot: TableSnapshot = IDLE;
let transport: Transport | null = null;
let host: HostRuntime | null = null;
let client: ClientRuntime | null = null;
let status: TransportStatus = "idle";
let statusDetail: string | null = null;
let error: string | null = null;

const emit = (): void => {
  for (const listener of listeners) listener();
};

const rebuild = (): void => {
  if (host !== null) {
    const lobby = host.lobby();
    snapshot = {
      mode: "hosting",
      kind: transport?.kind ?? null,
      status,
      statusDetail,
      error,
      lobby,
      view: host.view(),
      seat: host.activeLocalSeat(),
      controlledSeats: host.localSeats(),
      canStart: lobby.canStart,
      started: host.started,
    };
  } else if (client !== null) {
    const view = client.view;
    snapshot = {
      mode: "joining",
      kind: transport?.kind ?? null,
      status,
      statusDetail,
      error: error ?? client.lastRejection,
      lobby: client.lobby,
      view,
      seat: client.seat,
      controlledSeats: client.seat === null ? [] : [client.seat],
      canStart: false,
      started: view !== null,
    };
  } else {
    snapshot = { ...IDLE, status, statusDetail, error };
  }
  emit();
};

const setStatus = (next: TransportStatus, detail: string | null): void => {
  status = next;
  statusDetail = detail;
  if (next === "error" && detail !== null) error = detail;
  rebuild();
};

const hostListener = (runtime: HostRuntime): TransportListener => ({
  onPeerJoin: (peer: PeerId) => runtime.onPeerJoin(peer),
  onPeerLeave: (peer: PeerId) => runtime.onPeerLeave(peer),
  onMessage: (peer: PeerId, text: string) => runtime.onMessage(peer, text),
  onStatus: setStatus,
});

const clientListener = (runtime: ClientRuntime): TransportListener => ({
  onPeerJoin: () => {},
  onPeerLeave: () => {},
  onMessage: (_peer: PeerId, text: string) => runtime.onMessage(text),
  onStatus: setStatus,
});

const reset = (): void => {
  transport = null;
  host = null;
  client = null;
  status = "idle";
  statusDetail = null;
  error = null;
};

export const tableStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): TableSnapshot {
    return snapshot;
  },

  driverFor(kind: TransportKind) {
    return transportDrivers[kind];
  },

  async host(options: HostOptions): Promise<void> {
    await tableStore.leave();
    error = null;
    const runtime = new HostRuntime({
      tableName: options.tableName,
      hostName: options.displayName,
      holdsEverySeat: transportDrivers[options.kind].holdsEverySeat,
      rules: options.rules,
      seed: options.seed,
      onChange: rebuild,
    });
    host = runtime;
    rebuild();
    try {
      transport = await openTransport(options.kind, {
        displayName: options.displayName,
        tableName: options.tableName,
        listener: hostListener(runtime),
      });
      runtime.attach(transport);
      rebuild();
    } catch (caught: unknown) {
      error = messageOf(caught);
      host = null;
      rebuild();
      throw caught;
    }
  },

  async join(options: JoinOptions): Promise<void> {
    await tableStore.leave();
    error = null;
    const runtime = new ClientRuntime({
      displayName: options.displayName,
      onChange: rebuild,
    });
    client = runtime;
    rebuild();
    try {
      transport = await openTransport("ble-client", {
        displayName: options.displayName,
        tableName: "",
        target: options.deviceId,
        listener: clientListener(runtime),
      });
      runtime.attach(transport);
      rebuild();
    } catch (caught: unknown) {
      error = messageOf(caught);
      client = null;
      rebuild();
      throw caught;
    }
  },

  start(): void {
    host?.start();
    rebuild();
  },

  restart(): void {
    host?.restart();
    rebuild();
  },

  submit(seat: Seat, intent: PlayerIntent): void {
    if (host !== null) {
      const reason = host.submit(seat, intent);
      if (reason !== null) {
        error = reason;
        rebuild();
      }
      return;
    }
    client?.submit(intent);
  },

  clearError(): void {
    if (error === null) return;
    error = null;
    client?.clearRejection();
    rebuild();
  },

  async leave(): Promise<void> {
    const open = transport;
    reset();
    snapshot = IDLE;
    emit();
    if (open !== null) await open.stop();
  },
};
