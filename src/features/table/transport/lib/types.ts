export const TRANSPORT_KINDS = ["local", "ble-host", "ble-client"] as const;
export type TransportKind = (typeof TRANSPORT_KINDS)[number];

export type PeerId = string;

export type TransportStatus = "idle" | "starting" | "ready" | "stopped" | "error";

export type TransportListener = {
  onPeerJoin(peer: PeerId): void;
  onPeerLeave(peer: PeerId): void;
  onMessage(peer: PeerId, text: string): void;
  onStatus(status: TransportStatus, detail: string | null): void;
};

export type Transport = {
  readonly kind: TransportKind;
  send(peer: PeerId, text: string): Promise<void>;
  broadcast(text: string): Promise<void>;
  stop(): Promise<void>;
};

export type OpenOptions = {
  displayName: string;
  tableName: string;
  /** The table to join. Client transports need it; host transports ignore it. */
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
