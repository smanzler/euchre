import type {
  PeerId,
  Transport as PeerTransport,
} from "@euchre/game/host/transport";

export type { PeerId };

export const TRANSPORT_KINDS = [
  "local",
  "ble-host",
  "ble-client",
  "online",
] as const;
export type TransportKind = (typeof TRANSPORT_KINDS)[number];

export type TransportStatus =
  "idle" | "starting" | "ready" | "stopped" | "error";

export type TransportListener = {
  onPeerJoin(peer: PeerId): void;
  onPeerLeave(peer: PeerId): void;
  onMessage(peer: PeerId, text: string): void;
  onStatus(status: TransportStatus, detail: string | null): void;
};

export type Transport = PeerTransport & {
  readonly kind: TransportKind;
  /** The code other players type to join. Only an online table has one. */
  readonly tableCode: string | null;
};

export type OpenOptions = {
  displayName: string;
  tableName: string;
  /**
   * The table to join: a device id for Bluetooth, a code for online.
   * Without it, the online driver creates a table.
   */
  target?: string;
  listener: TransportListener;
};

export type TransportDriver<K extends TransportKind = TransportKind> = {
  readonly kind: K;
  readonly label: string;
  /** The seats the local device plays. A host holds one, pass and play holds all. */
  readonly holdsEverySeat: boolean;
  /** False when this build or platform cannot run the transport. */
  isAvailable(): boolean;
  /** The reason isAvailable is false, for the lobby to show. */
  unavailableReason(): string | null;
  open(options: OpenOptions): Promise<Transport>;
};
