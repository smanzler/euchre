import type { EventSubscription } from "expo-modules-core";
import {
  type Assembler,
  DEFAULT_CHUNK_BYTES,
  type Framer,
  createAssembler,
  createFramer,
} from "../../lib/protocol";
import type {
  OpenOptions,
  PeerId,
  Transport,
  TransportDriver,
} from "../../lib/types";
import {
  ATT_OVERHEAD_BYTES,
  EUCHRE_SERVICE_UUID,
  FROM_HOST_CHARACTERISTIC_UUID,
  MAX_TABLE_NAME_BYTES,
  TO_HOST_CHARACTERISTIC_UUID,
} from "./constants";
import {
  isPeripheralAvailable,
  peripheral,
  peripheralUnavailableReason,
} from "./peripheral";
import { requestAdvertisePermissions } from "./permissions";

type HostPeer = {
  framer: Framer;
  assembler: Assembler;
  /** Notifications go out one at a time so the native queue never overflows. */
  queue: Promise<void>;
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The advertised name must fit in the 31 byte advertising packet. */
export const trimTableName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.length > MAX_TABLE_NAME_BYTES
    ? trimmed.slice(0, MAX_TABLE_NAME_BYTES)
    : trimmed;
};

const openHost = async (options: OpenOptions): Promise<Transport> => {
  const { listener } = options;
  listener.onStatus("starting", null);
  if (!(await requestAdvertisePermissions())) {
    listener.onStatus("error", "Bluetooth permission was refused.");
    throw new Error("Bluetooth permission was refused.");
  }

  const peers = new Map<PeerId, HostPeer>();
  const subscriptions: EventSubscription[] = [];

  subscriptions.push(
    peripheral.on("onCentralSubscribed", ({ id, mtu }) => {
      const chunkBytes = Math.max(20, (mtu || DEFAULT_CHUNK_BYTES) - ATT_OVERHEAD_BYTES);
      peers.set(id, {
        framer: createFramer(chunkBytes),
        assembler: createAssembler(),
        queue: Promise.resolve(),
      });
      listener.onPeerJoin(id);
    }),
  );

  subscriptions.push(
    peripheral.on("onCentralUnsubscribed", ({ id }) => {
      peers.delete(id);
      listener.onPeerLeave(id);
    }),
  );

  subscriptions.push(
    peripheral.on("onCentralWrite", ({ id, value }) => {
      const peer = peers.get(id);
      if (peer === undefined) return;
      const text = peer.assembler.push(value);
      if (text !== null) listener.onMessage(id, text);
    }),
  );

  subscriptions.push(
    peripheral.on("onPeripheralError", ({ message }) => {
      listener.onStatus("error", message);
    }),
  );

  const send = (peerId: PeerId, text: string): Promise<void> => {
    const peer = peers.get(peerId);
    if (peer === undefined) return Promise.resolve();
    const frames = peer.framer.encode(text);
    peer.queue = peer.queue
      .then(async () => {
        for (const frame of frames) await peripheral.notify(peerId, frame);
      })
      .catch((error: unknown) => {
        listener.onStatus("error", messageOf(error));
      });
    return peer.queue;
  };

  try {
    await peripheral.startAdvertising({
      serviceUuid: EUCHRE_SERVICE_UUID,
      toHostUuid: TO_HOST_CHARACTERISTIC_UUID,
      fromHostUuid: FROM_HOST_CHARACTERISTIC_UUID,
      localName: trimTableName(options.tableName),
    });
  } catch (error: unknown) {
    for (const subscription of subscriptions) subscription.remove();
    listener.onStatus("error", messageOf(error));
    throw error;
  }

  listener.onStatus("ready", null);

  return {
    kind: "ble-host",
    send,
    async broadcast(text) {
      await Promise.all([...peers.keys()].map((peerId) => send(peerId, text)));
    },
    async stop() {
      for (const subscription of subscriptions) subscription.remove();
      peers.clear();
      try {
        await peripheral.stopAdvertising();
      } finally {
        listener.onStatus("stopped", null);
      }
    },
  };
};

export const bleHostDriver: TransportDriver = {
  kind: "ble-host",
  label: "Host over Bluetooth",
  holdsEverySeat: false,
  isAvailable: isPeripheralAvailable,
  unavailableReason: peripheralUnavailableReason,
  open: openHost,
} satisfies TransportDriver<"ble-host">;
