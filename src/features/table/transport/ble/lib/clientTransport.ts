import { Platform } from "react-native";
import type { Device, Subscription } from "react-native-ble-plx";
import { DEFAULT_CHUNK_BYTES, createAssembler, createFramer } from "../../lib/protocol";
import type { OpenOptions, Transport, TransportDriver } from "../../lib/types";
import { getBleManager } from "./bleManager";
import {
  ATT_OVERHEAD_BYTES,
  EUCHRE_SERVICE_UUID,
  FROM_HOST_CHARACTERISTIC_UUID,
  PREFERRED_MTU,
  TO_HOST_CHARACTERISTIC_UUID,
} from "./constants";
import { requestScanPermissions } from "./permissions";

/** The only peer a client ever talks to. */
export const HOST_PEER = "host";

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const negotiateMtu = async (device: Device): Promise<number> => {
  if (Platform.OS !== "android") return DEFAULT_CHUNK_BYTES + ATT_OVERHEAD_BYTES;
  try {
    const upgraded = await device.requestMTU(PREFERRED_MTU);
    return upgraded.mtu ?? DEFAULT_CHUNK_BYTES + ATT_OVERHEAD_BYTES;
  } catch {
    return DEFAULT_CHUNK_BYTES + ATT_OVERHEAD_BYTES;
  }
};

const openClient = async (options: OpenOptions): Promise<Transport> => {
  const { listener, target } = options;
  if (target === undefined) throw new Error("joining a table needs a device id");
  listener.onStatus("starting", null);
  if (!(await requestScanPermissions())) {
    listener.onStatus("error", "Bluetooth permission was refused.");
    throw new Error("Bluetooth permission was refused.");
  }

  const manager = getBleManager();
  const subscriptions: Subscription[] = [];
  let stopped = false;

  const teardown = (): void => {
    for (const subscription of subscriptions) subscription.remove();
    subscriptions.length = 0;
  };

  try {
    const connected = await manager.connectToDevice(target, { autoConnect: false });
    const mtu = await negotiateMtu(connected);
    await connected.discoverAllServicesAndCharacteristics();

    const framer = createFramer(Math.max(20, mtu - ATT_OVERHEAD_BYTES));
    const assembler = createAssembler();

    subscriptions.push(
      connected.onDisconnected(() => {
        if (stopped) return;
        listener.onPeerLeave(HOST_PEER);
        listener.onStatus("stopped", "The table closed.");
      }),
    );

    subscriptions.push(
      connected.monitorCharacteristicForService(
        EUCHRE_SERVICE_UUID,
        FROM_HOST_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error !== null) {
            if (!stopped) listener.onStatus("error", error.message);
            return;
          }
          const value = characteristic?.value;
          if (value === null || value === undefined) return;
          const text = assembler.push(value);
          if (text !== null) listener.onMessage(HOST_PEER, text);
        },
      ),
    );

    listener.onPeerJoin(HOST_PEER);
    listener.onStatus("ready", null);

    let queue: Promise<void> = Promise.resolve();
    const send = (_peer: string, text: string): Promise<void> => {
      const frames = framer.encode(text);
      queue = queue
        .then(async () => {
          for (const frame of frames) {
            await connected.writeCharacteristicWithResponseForService(
              EUCHRE_SERVICE_UUID,
              TO_HOST_CHARACTERISTIC_UUID,
              frame,
            );
          }
        })
        .catch((error: unknown) => {
          listener.onStatus("error", messageOf(error));
        });
      return queue;
    };

    return {
      kind: "ble-client",
      send,
      broadcast: (text) => send(HOST_PEER, text),
      async stop() {
        stopped = true;
        teardown();
        try {
          await manager.cancelDeviceConnection(target);
        } catch {
          // The host may already be gone; the session is over either way.
        } finally {
          listener.onStatus("stopped", null);
        }
      },
    };
  } catch (error: unknown) {
    teardown();
    listener.onStatus("error", messageOf(error));
    throw error;
  }
};

export const bleClientDriver: TransportDriver = {
  kind: "ble-client",
  label: "Join over Bluetooth",
  holdsEverySeat: false,
  isAvailable: () => Platform.OS === "ios" || Platform.OS === "android",
  unavailableReason: () =>
    Platform.OS === "ios" || Platform.OS === "android"
      ? null
      : "Bluetooth is not available on web.",
  open: openClient,
} satisfies TransportDriver<"ble-client">;
