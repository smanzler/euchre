import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app";
import type { PeerListener } from "./peers/socketTransport";
import { createTableRegistry } from "./tables/tableRegistry";

type Event =
  | { t: "join"; peer: string }
  | { t: "leave"; peer: string }
  | { t: "message"; peer: string; text: string };

const recordingListener = (events: Event[]): PeerListener => ({
  onPeerJoin: (peer) => events.push({ t: "join", peer }),
  onPeerLeave: (peer) => events.push({ t: "leave", peer }),
  onMessage: (peer, text) => events.push({ t: "message", peer, text }),
});

const until = async (check: () => boolean): Promise<void> => {
  for (let tries = 0; tries < 100; tries += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out");
};

const started: { close(): Promise<unknown> }[] = [];

afterEach(async () => {
  await Promise.all(started.splice(0).map((app) => app.close()));
});

describe("server", () => {
  it("answers the health check", async () => {
    const { app } = buildServer(() => recordingListener([]));
    started.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("carries text both ways over /ws and reports the peer", async () => {
    const events: Event[] = [];
    const { app, transport } = buildServer(() => recordingListener(events));
    started.push(app);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });

    const received: string[] = [];
    const socket = new WebSocket(`${address.replace("http", "ws")}/ws`);
    socket.addEventListener("message", (event) => {
      received.push(String(event.data));
    });
    await new Promise((resolve) => socket.addEventListener("open", resolve));

    await until(() => events.length === 1);
    const peer = events[0]?.peer as string;
    expect(events).toEqual([{ t: "join", peer }]);

    socket.send("hello");
    await until(() => events.length === 2);
    expect(events[1]).toEqual({ t: "message", peer, text: "hello" });

    await transport.send(peer, "to you");
    await transport.broadcast("to all");
    await until(() => received.length === 2);
    expect(received).toEqual(["to you", "to all"]);

    socket.close();
    await until(() => events.length === 3);
    expect(events[2]).toEqual({ t: "leave", peer });
  });

  it("runs a table for two phones over /ws", async () => {
    const { app } = buildServer((transport) => createTableRegistry(transport));
    started.push(app);
    const url = `${(await app.listen({ port: 0, host: "127.0.0.1" })).replace("http", "ws")}/ws`;

    const connect = async () => {
      const inbox: { t: string; [key: string]: unknown }[] = [];
      const socket = new WebSocket(url);
      socket.addEventListener("message", (event) => {
        inbox.push(JSON.parse(String(event.data)));
      });
      await new Promise((resolve) => socket.addEventListener("open", resolve));
      const say = (message: object) => socket.send(JSON.stringify(message));
      const next = async (t: string) => {
        await until(() => inbox.some((message) => message.t === t));
        const index = inbox.findIndex((message) => message.t === t);
        return inbox.splice(0, index + 1).at(-1) as Record<string, unknown>;
      };
      return { socket, say, next };
    };

    const host = await connect();
    host.say({ t: "create", tableName: "Online", name: "Sam" });
    const { code } = await host.next("table");

    const guest = await connect();
    guest.say({ t: "join", code });
    expect(await guest.next("table")).toEqual({ t: "table", code });
    guest.say({ t: "hello", name: "Ada" });
    expect(await guest.next("lobby")).toMatchObject({ seat: 1 });

    host.socket.close();
    guest.socket.close();
  });
});
