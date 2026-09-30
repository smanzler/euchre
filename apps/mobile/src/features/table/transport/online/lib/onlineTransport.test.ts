import type { TransportListener, TransportStatus } from "../../lib/types";
import { SERVER_PEER, onlineDriver } from "./onlineTransport";

class FakeSocket {
  static readonly OPEN = 1;
  static last: FakeSocket | null = null;
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.last = this;
    setTimeout(() => {
      this.readyState = FakeSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(text: string): void {
    this.sent.push(JSON.parse(text));
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  receive(message: object): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const socket = (): FakeSocket => {
  if (FakeSocket.last === null) throw new Error("no socket");
  return FakeSocket.last;
};

const recording = () => {
  const statuses: [TransportStatus, string | null][] = [];
  const messages: [string, string][] = [];
  const listener: TransportListener = {
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onMessage: (peer, text) => messages.push([peer, text]),
    onStatus: (status, detail) => statuses.push([status, detail]),
  };
  return { listener, statuses, messages };
};

const realWebSocket = globalThis.WebSocket;

beforeEach(() => {
  process.env.EXPO_PUBLIC_SERVER_URL = "ws://server.test/";
  FakeSocket.last = null;
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  globalThis.WebSocket = realWebSocket;
  delete process.env.EXPO_PUBLIC_SERVER_URL;
});

describe("online driver", () => {
  it("creates a table, gets its code, then passes messages on", async () => {
    const { listener, statuses, messages } = recording();
    const opening = onlineDriver.open({
      displayName: "Sam",
      tableName: "Kitchen",
      listener,
    });
    await flush();
    expect(socket().url).toBe("ws://server.test/ws");
    expect(socket().sent).toEqual([
      { t: "create", tableName: "Kitchen", name: "Sam" },
    ]);

    socket().receive({ t: "table", code: "KQJT" });
    const transport = await opening;
    expect(transport.tableCode).toBe("KQJT");
    expect(statuses.at(-1)).toEqual(["ready", null]);

    socket().receive({ t: "lobby" });
    expect(messages).toEqual([[SERVER_PEER, '{"t":"lobby"}']]);

    await transport.broadcast('{"t":"hello"}');
    expect(socket().sent.at(-1)).toEqual({ t: "hello" });
  });

  it("joins by code and fails with the server's reason", async () => {
    const { listener, statuses } = recording();
    const opening = onlineDriver.open({
      displayName: "Ada",
      tableName: "",
      target: "ZZZZ",
      listener,
    });
    await flush();
    expect(socket().sent).toEqual([{ t: "join", code: "ZZZZ" }]);
    socket().receive({ t: "rejected", reason: "no table has that code" });
    await expect(opening).rejects.toThrow("no table has that code");
    expect(statuses.at(-1)).toEqual(["error", "no table has that code"]);
  });

  it("reports a lost connection after the table opens", async () => {
    const { listener, statuses } = recording();
    const opening = onlineDriver.open({
      displayName: "Sam",
      tableName: "Kitchen",
      listener,
    });
    await flush();
    socket().receive({ t: "table", code: "KQJT" });
    await opening;
    socket().close();
    expect(statuses.at(-1)).toEqual([
      "error",
      "Lost the connection to the server.",
    ]);
  });

  it("needs a server URL", async () => {
    delete process.env.EXPO_PUBLIC_SERVER_URL;
    expect(onlineDriver.isAvailable()).toBe(false);
    await expect(
      onlineDriver.open({
        displayName: "Sam",
        tableName: "Kitchen",
        listener: recording().listener,
      }),
    ).rejects.toThrow("EXPO_PUBLIC_SERVER_URL");
  });
});
