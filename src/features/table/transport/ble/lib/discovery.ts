import type { Device } from "react-native-ble-plx";
import { getBleManager } from "./bleManager";
import { EUCHRE_SERVICE_UUID } from "./constants";
import { requestScanPermissions } from "./permissions";

export type FoundTable = { id: string; name: string };

export type ScanHandlers = {
  onFound(table: FoundTable): void;
  onError(message: string): void;
};

const nameOf = (device: Device): string =>
  device.localName ?? device.name ?? "Euchre table";

/** Starts a scan and returns the call that stops it. */
export const scanForTables = (handlers: ScanHandlers): (() => void) => {
  let stopped = false;
  const manager = getBleManager();

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    manager.stopDeviceScan();
  };

  void (async () => {
    if (!(await requestScanPermissions())) {
      handlers.onError("Bluetooth permission was refused.");
      return;
    }
    if (stopped) return;
    manager.startDeviceScan([EUCHRE_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error !== null) {
        handlers.onError(error.message);
        return;
      }
      if (device === null) return;
      handlers.onFound({ id: device.id, name: nameOf(device) });
    });
  })();

  return stop;
};
