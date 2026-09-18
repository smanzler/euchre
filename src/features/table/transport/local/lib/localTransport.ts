import type { OpenOptions, Transport, TransportDriver } from "../../lib/types";

/** Pass and play. One device holds every seat, so nothing leaves it. */
const openLocal = async (options: OpenOptions): Promise<Transport> => {
  options.listener.onStatus("ready", null);
  return {
    kind: "local",
    async send() {},
    async broadcast() {},
    async stop() {
      options.listener.onStatus("stopped", null);
    },
  };
};

export const localDriver: TransportDriver = {
  kind: "local",
  label: "Pass and play",
  holdsEverySeat: true,
  isAvailable: () => true,
  unavailableReason: () => null,
  open: openLocal,
} satisfies TransportDriver<"local">;
