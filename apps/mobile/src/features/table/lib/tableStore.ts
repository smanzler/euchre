import type { GameRules, Seat } from "@euchre/game/rules/types";
import type { PlayerView } from "@euchre/game/rules/view";
import type {
  LobbySnapshot,
  PlayerIntent,
} from "@euchre/game/protocol/messages";
import { openTransport, transportDrivers } from "../transport/lib/registry";
import type {
  OpenOptions,
  PeerId,
  Transport,
  TransportKind,
  TransportListener,
  TransportStatus,
} from "../transport/lib/types";
import { ClientRuntime } from "./clientRuntime";
import { HostRuntime } from "@euchre/game/host/hostRuntime";

export type TableMode = "idle" | "hosting" | "joining";

export type TableSnapshot = {
  mode: TableMode;
  kind: TransportKind | null;
  status: TransportStatus;
  statusDetail: string | null;
  error: string | null;
  lobby: LobbySnapshot | null;
  /** The code other players type to join. Only an online table has one. */
  code: string | null;
  /** True when this device adds bots, names seats and starts the game. */
  controlsLobby: boolean;
  view: PlayerView | null;
  seat: Seat | null;
  /** The seats this device may move for. */
  controlledSeats: readonly Seat[];
  /** The seats this device may name. */
  renamableSeats: readonly Seat[];
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
  code: null,
  controlsLobby: false,
  view: null,
  seat: null,
  controlledSeats: [],
  renamableSeats: [],
  canStart: false,
  started: false,
};

export type HostOptions = {
  kind: Extract<TransportKind, "local" | "ble-host">;
  tableName: string;
  displayName: string;
  /** Gives every other seat to a bot as soon as the table opens. */
  fillWithBots?: boolean;
  rules?: Partial<GameRules>;
  seed?: number;
};

export type JoinOptions = {
  deviceId: string;
  displayName: string;
};

export type HostOnlineOptions = {
  tableName: string;
  displayName: string;
};

export type JoinOnlineOptions = {
  code: string;
  displayName: string;
};

type LobbyControl = Pick<
  HostRuntime,
  "addBot" | "removeBot" | "renameSeat" | "start" | "restart"
>;

/** Sends the lobby commands to a server that holds the table. */
const remoteControl = (runtime: ClientRuntime): LobbyControl => ({
  addBot: (seat) => runtime.command({ t: "add-bot", seat }),
  removeBot: (seat) => runtime.command({ t: "remove-bot", seat }),
  renameSeat: (seat, name) => runtime.command({ t: "rename", seat, name }),
  start: () => runtime.command({ t: "start" }),
  restart: () => runtime.command({ t: "restart" }),
});

/** A remote host names only its bots, as HostRuntime allows. */
const botSeats = (lobby: LobbySnapshot | null): Seat[] =>
  lobby === null || lobby.started
    ? []
    : lobby.players
        .filter((player) => player.kind === "bot")
        .map((player) => player.seat);

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const listeners = new Set<() => void>();
let snapshot: TableSnapshot = IDLE;
let transport: Transport | null = null;
let host: HostRuntime | null = null;
let client: ClientRuntime | null = null;
let control: LobbyControl | null = null;
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
      code: transport?.tableCode ?? null,
      controlsLobby: true,
      view: host.view(),
      seat: host.activeLocalSeat(),
      controlledSeats: host.localSeats(),
      renamableSeats: host.renamableSeats(),
      canStart: lobby.canStart,
      started: host.started,
    };
  } else if (client !== null) {
    const view = client.view;
    const lobby = client.lobby;
    const controls = control !== null;
    snapshot = {
      mode: "joining",
      kind: transport?.kind ?? null,
      status,
      statusDetail,
      error: error ?? client.closed ?? client.lastRejection,
      lobby,
      code: transport?.tableCode ?? null,
      controlsLobby: controls,
      view,
      seat: client.seat,
      controlledSeats: client.seat === null ? [] : [client.seat],
      renamableSeats: controls ? botSeats(lobby) : [],
      canStart: controls && (lobby?.canStart ?? false),
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
  control = null;
  status = "idle";
  statusDetail = null;
  error = null;
};

/** Opens a client transport. The creator of an online table controls its lobby. */
const connectClient = async (
  kind: Extract<TransportKind, "ble-client" | "online">,
  open: Omit<OpenOptions, "listener">,
  controlsLobby: boolean,
): Promise<void> => {
  await tableStore.leave();
  error = null;
  const runtime = new ClientRuntime({
    displayName: open.displayName,
    onChange: rebuild,
  });
  client = runtime;
  control = controlsLobby ? remoteControl(runtime) : null;
  rebuild();
  try {
    transport = await openTransport(kind, {
      ...open,
      listener: clientListener(runtime),
    });
    runtime.attach(transport);
    rebuild();
  } catch (caught: unknown) {
    error = messageOf(caught);
    client = null;
    control = null;
    rebuild();
    throw caught;
  }
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
      host: { kind: "local", name: options.displayName },
      holdsEverySeat: transportDrivers[options.kind].holdsEverySeat,
      rules: options.rules,
      seed: options.seed,
      onChange: rebuild,
    });
    host = runtime;
    control = runtime;
    if (options.fillWithBots === true) runtime.fillWithBots();
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
      control = null;
      rebuild();
      throw caught;
    }
  },

  join(options: JoinOptions): Promise<void> {
    return connectClient(
      "ble-client",
      {
        displayName: options.displayName,
        tableName: "",
        target: options.deviceId,
      },
      false,
    );
  },

  hostOnline(options: HostOnlineOptions): Promise<void> {
    return connectClient(
      "online",
      { displayName: options.displayName, tableName: options.tableName },
      true,
    );
  },

  joinOnline(options: JoinOnlineOptions): Promise<void> {
    return connectClient(
      "online",
      { displayName: options.displayName, tableName: "", target: options.code },
      false,
    );
  },

  start(): void {
    control?.start();
    rebuild();
  },

  restart(): void {
    control?.restart();
    rebuild();
  },

  addBot(seat: Seat): void {
    control?.addBot(seat);
  },

  removeBot(seat: Seat): void {
    control?.removeBot(seat);
  },

  renameSeat(seat: Seat, name: string): void {
    control?.renameSeat(seat, name);
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
    transport = null;
    if (open !== null) {
      try {
        await open.stop();
      } catch {
        // The radio may already be gone; the table closes either way.
      }
    }
    reset();
    snapshot = IDLE;
    emit();
  },
};
