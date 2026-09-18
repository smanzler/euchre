import { BleManager } from "react-native-ble-plx";

let manager: BleManager | null = null;

/** One manager per app. Creating a second one breaks the native listeners. */
export const getBleManager = (): BleManager => {
  if (manager === null) manager = new BleManager();
  return manager;
};
