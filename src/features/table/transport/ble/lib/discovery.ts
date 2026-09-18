import type { Device } from "react-native-ble-plx";
import { fromBase64, utf8Decode } from "../../lib/bytes";
import { getBleManager } from "./bleManager";
import { EUCHRE_SERVICE_UUID } from "./constants";
import { requestScanPermissions } from "./permissions";

export type FoundTable = { id: string; name: string };

export type Advertisement = {
  serviceData: Record<string, string> | null;
  localName: string | null;
  name: string | null;
};

/**
 * An Android host puts the table name in service data because it cannot set
 * the advertised local name; an iOS host sets the local name. The two
 * platforms also disagree on the case of a uuid key.
 */
export const tableNameFrom = (advertisement: Advertisement): string => {
  const entry = Object.entries(advertisement.serviceData ?? {}).find(
    ([uuid]) => uuid.toLowerCase() === EUCHRE_SERVICE_UUID,
  );
  if (entry !== undefined) {
    const decoded = utf8Decode(fromBase64(entry[1])).trim();
    if (decoded.length > 0) return decoded;
  }
  return advertisement.localName ?? advertisement.name ?? "Euchre table";
};

export type ScanHandlers = {
  onFound(table: FoundTable): void;
  onError(message: string): void;
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
      handlers.onFound({ id: device.id, name: tableNameFrom(device as Advertisement) });
    });
  })();

  return stop;
};
