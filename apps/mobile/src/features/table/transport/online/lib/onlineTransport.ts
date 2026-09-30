import { parseTableReply } from "@euchre/game/protocol/tables";
import type { OpenOptions, Transport, TransportDriver } from "../../lib/types";
import { serverUrl } from "./serverUrl";

/** The only peer an online client talks to. */
export const SERVER_PEER = "server";

const NO_SERVER = "Set EXPO_PUBLIC_SERVER_URL to play online.";

const connect = (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`${url}/ws`);
    socket.onopen = () => resolve(socket);
    socket.onerror = () => reject(new Error("Could not reach the server."));
  });

/** Gets the table code from the first reply, then passes each message on. */
const awaitTable = (socket: WebSocket, options: OpenOptions): Promise<string> =>
  new Promise((resolve, reject) => {
    let code: string | null = null;
    socket.onmessage = (event) => {
      const text = String(event.data);
      if (code !== null) {
        options.listener.onMessage(SERVER_PEER, text);
        return;
      }
      const reply = parseTableReply(text);
      if (reply === null) return;
      if (reply.t === "rejected") {
        reject(new Error(reply.reason));
        return;
      }
      code = reply.code;
      resolve(code);
    };
    socket.onclose = () => {
      if (code === null) reject(new Error("The server closed the connection."));
    };
    socket.send(
      JSON.stringify(
        options.target === undefined
          ? {
              t: "create",
              tableName: options.tableName,
              name: options.displayName,
            }
          : { t: "join", code: options.target },
      ),
    );
  });

const openOnline = async (options: OpenOptions): Promise<Transport> => {
  const { listener } = options;
  const url = serverUrl();
  if (url === null) throw new Error(NO_SERVER);
  listener.onStatus("starting", null);

  let socket: WebSocket | null = null;
  let stopped = false;
  try {
    socket = await connect(url);
    const open = socket;
    const tableCode = await awaitTable(open, options);
    open.onclose = () => {
      if (stopped) return;
      listener.onPeerLeave(SERVER_PEER);
      listener.onStatus("error", "Lost the connection to the server.");
    };
    listener.onStatus("ready", null);

    const send = async (_peer: string, text: string): Promise<void> => {
      if (open.readyState === WebSocket.OPEN) open.send(text);
    };
    return {
      kind: "online",
      tableCode,
      send,
      broadcast: (text) => send(SERVER_PEER, text),
      async stop() {
        stopped = true;
        open.close();
        listener.onStatus("stopped", null);
      },
    };
  } catch (error: unknown) {
    stopped = true;
    socket?.close();
    const message = error instanceof Error ? error.message : String(error);
    listener.onStatus("error", message);
    throw error;
  }
};

export const onlineDriver: TransportDriver = {
  kind: "online",
  label: "Online",
  holdsEverySeat: false,
  isAvailable: () => serverUrl() !== null,
  unavailableReason: () => (serverUrl() === null ? NO_SERVER : null),
  open: openOnline,
} satisfies TransportDriver<"online">;
