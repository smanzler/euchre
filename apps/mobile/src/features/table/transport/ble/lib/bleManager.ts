import { BleManager, State } from "react-native-ble-plx";

let manager: BleManager | null = null;

/** One manager per app. Creating a second one breaks the native listeners. */
export const getBleManager = (): BleManager => {
  if (manager === null) manager = new BleManager();
  return manager;
};

/** Null while the adapter can still become ready on its own. */
const blockedMessages: Record<State, string | null> = {
  [State.Unknown]: null,
  [State.Resetting]: null,
  [State.PoweredOn]: null,
  [State.Unsupported]: "This device has no Bluetooth LE.",
  [State.Unauthorized]: "Bluetooth permission was refused.",
  [State.PoweredOff]: "Bluetooth is turned off.",
};

/**
 * Resolves null when the adapter is on, or the reason it cannot come on. The
 * adapter reports Unknown for a moment after the app starts, and a scan or a
 * connection in that moment fails.
 */
export const waitForBluetooth = (): Promise<string | null> =>
  new Promise((resolve) => {
    const subscription = getBleManager().onStateChange((state) => {
      if (state === State.PoweredOn) {
        subscription.remove();
        resolve(null);
        return;
      }
      const message = blockedMessages[state];
      if (message === null) return;
      subscription.remove();
      resolve(message);
    }, true);
  });
