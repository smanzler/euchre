import { bleClientDriver } from "../ble/lib/clientTransport";
import { bleHostDriver } from "../ble/lib/hostTransport";
import { localDriver } from "../local/lib/localTransport";
import type { OpenOptions, Transport, TransportDriver, TransportKind } from "./types";

export const transportDrivers: Record<TransportKind, TransportDriver> = {
  local: localDriver,
  "ble-host": bleHostDriver,
  "ble-client": bleClientDriver,
};

export const openTransport = (
  kind: TransportKind,
  options: OpenOptions,
): Promise<Transport> => transportDrivers[kind].open(options);
