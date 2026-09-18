import type { Device } from "react-native-ble-plx";
import { fromBase64, utf8Decode } from "../../lib/bytes";
import { getBleManager } from "./bleManager";
import { EUCHRE_SERVICE_UUID } from "./constants";
import { requestScanPermissions } from "./permissions";

export type FoundTable = { id: string; name: string };

export type ScanHandlers = {
  onFound(table: FoundTable): void;
  onError(message: string): void;
};

/** An Android host puts the table name in service data; iOS uses the local name. */
const nameOf = (device: Device): string => {
  const advertised = device.serviceData?.[EUCHRE_SERVICE_UUID];
  if (advertised !== undefined && advertised !== null) {
    const decoded = utf8Decode(fromBase64(advertised)).trim();
    if (decoded.length > 0) return decoded;
  }
  return device.localName ?? device.name ?? "Euchre table";
};

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
