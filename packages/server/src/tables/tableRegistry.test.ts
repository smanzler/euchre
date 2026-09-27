import type { PeerId, Transport } from "@euchre/game/host/transport";
import type { HostMessage } from "@euchre/game/protocol/messages";
import type { TableReply } from "@euchre/game/protocol/tables";
import { describe, expect, it } from "vitest";
import { createTableRegistry } from "./tableRegistry";

type Message = TableReply | HostMessage;

const setup = () => {
  const sent: { peer: PeerId; message: Message }[] = [];
  const transport: Transport = {
    async send(peer, text) {
      sent.push({ peer, message: JSON.parse(text) });
    },
    async broadcast() {},
    async stop() {},
  };
  const registry = createTableRegistry(transport, {
    scheduleBotMove: (run) => run(),
  });
  const say = (peer: PeerId, message: object): void => {
    registry.onPeerJoin(peer);
    registry.onMessage(peer, JSON.stringify(message));
  };
  const to = (peer: PeerId): Message[] =>
    sent.filter((entry) => entry.peer === peer).map((entry) => entry.message);
  const lastTo = (peer: PeerId): Message | undefined => to(peer).at(-1);
  return { registry, say, to, lastTo };
};

const withTable = () => {
  const table = setup();
  table.say("h", { t: "create", tableName: "Online", name: "Sam" });
  const reply = table.to("h").find((message) => message.t === "table");
  if (reply?.t !== "table") throw new Error("no table code");
  table.say("h", { t: "hello", name: "Sam" });
  return { ...table, code: reply.code };
};

describe("table registry", () => {
  it("gives the creator a code and the host seat", () => {
    const { lastTo, code } = withTable();
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(lastTo("h")).toMatchObject({
      t: "lobby",
      seat: 0,
      lobby: { tableName: "Online" },
    });
  });

  it("seats a peer that joins with the code, in any case", () => {
    const { say, lastTo, code } = withTable();
    say("p1", { t: "join", code: code.toLowerCase() });
    expect(lastTo("p1")).toEqual({ t: "table", code });
    say("p1", { t: "hello", name: "Ada" });
    expect(lastTo("p1")).toMatchObject({ t: "lobby", seat: 1 });
    const lobby = lastTo("h");
    if (lobby?.t !== "lobby") throw new Error("expected a lobby");
    expect(lobby.lobby.players.slice(0, 2)).toMatchObject([
      { name: "Sam" },
      { name: "Ada", connected: true },
    ]);
  });

  it("refuses a code that no table has", () => {
    const { say, lastTo } = setup();
    say("p1", { t: "join", code: "ZZZZ" });
    expect(lastTo("p1")).toEqual({
      t: "rejected",
      reason: "no table has that code",
    });
  });

  it("refuses a table message before a create or a join", () => {
    const { say, lastTo } = setup();
    say("p1", { t: "hello", name: "Ada" });
    expect(lastTo("p1")).toEqual({
      t: "rejected",
      reason: "create or join a table first",
    });
  });

  it("lets the host fill the table with bots and deal", () => {
    const { say, lastTo } = withTable();
    for (const seat of [1, 2, 3]) say("h", { t: "add-bot", seat });
    say("h", { t: "start" });
    expect(lastTo("h")).toMatchObject({ t: "view", view: { seat: 0 } });
  });

  it("closes the lobby when the host leaves before the start", () => {
    const { registry, say, lastTo, code } = withTable();
    say("p1", { t: "join", code });
    say("p1", { t: "hello", name: "Ada" });
    registry.onPeerLeave("h");
    expect(lastTo("p1")).toEqual({ t: "closed", reason: "the host left" });
    say("p2", { t: "join", code });
    expect(lastTo("p2")).toMatchObject({ t: "rejected" });
  });

  it("keeps a started game when the host drops", () => {
    const { registry, say, lastTo, code } = withTable();
    say("p1", { t: "join", code });
    say("p1", { t: "hello", name: "Ada" });
    for (const seat of [2, 3]) say("h", { t: "add-bot", seat });
    say("h", { t: "start" });
    registry.onPeerLeave("h");
    expect(lastTo("p1")).toMatchObject({ t: "view" });
    say("p2", { t: "join", code });
    expect(lastTo("p2")).toEqual({ t: "table", code });
  });

  it("removes a table when its last player leaves", () => {
    const { registry, say, lastTo, code } = withTable();
    say("p1", { t: "join", code });
    say("p1", { t: "hello", name: "Ada" });
    for (const seat of [2, 3]) say("h", { t: "add-bot", seat });
    say("h", { t: "start" });
    registry.onPeerLeave("h");
    registry.onPeerLeave("p1");
    say("p2", { t: "join", code });
    expect(lastTo("p2")).toEqual({
      t: "rejected",
      reason: "no table has that code",
    });
  });
});
