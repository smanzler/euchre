import { requireOptionalNativeModule } from "expo";
import type { EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";

export type CentralSubscribedEvent = { id: string; mtu: number };
export type CentralUnsubscribedEvent = { id: string };
export type CentralWriteEvent = { id: string; value: string };
export type PeripheralErrorEvent = { message: string };

type PeripheralEvents = {
  onCentralSubscribed: (event: CentralSubscribedEvent) => void;
  onCentralUnsubscribed: (event: CentralUnsubscribedEvent) => void;
  onCentralWrite: (event: CentralWriteEvent) => void;
  onPeripheralError: (event: PeripheralErrorEvent) => void;
};

export type AdvertiseOptions = {
  serviceUuid: string;
  toHostUuid: string;
  fromHostUuid: string;
  localName: string;
};

type NativePeripheral = {
  isSupported(): boolean;
  startAdvertising(options: AdvertiseOptions): Promise<void>;
  stopAdvertising(): Promise<void>;
  notify(centralId: string, valueBase64: string): Promise<void>;
  addListener<K extends keyof PeripheralEvents>(
    event: K,
    listener: PeripheralEvents[K],
  ): EventSubscription;
};

const native = requireOptionalNativeModule<NativePeripheral>("EuchreBlePeripheral");

const MISSING_MODULE =
  "Hosting over Bluetooth needs a development build. Run `npx expo prebuild` and install the dev client.";

export const isPeripheralAvailable = (): boolean =>
  native !== null && Platform.OS !== "web" && native.isSupported();

export const peripheralUnavailableReason = (): string | null => {
  if (Platform.OS === "web") return "Bluetooth hosting is not available on web.";
  if (native === null) return MISSING_MODULE;
  if (!native.isSupported()) return "This device cannot advertise over Bluetooth LE.";
  return null;
};

const requireNative = (): NativePeripheral => {
  if (native === null) throw new Error(MISSING_MODULE);
  return native;
};

export const peripheral = {
  startAdvertising: (options: AdvertiseOptions): Promise<void> =>
    requireNative().startAdvertising(options),
  stopAdvertising: (): Promise<void> => requireNative().stopAdvertising(),
  notify: (centralId: string, valueBase64: string): Promise<void> =>
    requireNative().notify(centralId, valueBase64),
  on: <K extends keyof PeripheralEvents>(
    event: K,
    listener: PeripheralEvents[K],
  ): EventSubscription => requireNative().addListener(event, listener),
};
