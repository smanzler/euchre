import type { Seat } from "@/features/euchre/lib/types";
import { parseHostMessage } from "../transport/lib/protocol";
import type { PeerId, Transport } from "../transport/lib/types";
import { HostRuntime } from "./hostRuntime";

type Sent = { peer: PeerId; text: string };

const fakeTransport = (sent: Sent[]): Transport => ({
  kind: "ble-host",
  async send(peer, text) {
    sent.push({ peer, text });
  },
  async broadcast(text) {
    sent.push({ peer: "*", text });
  },
  async stop() {},
});

const hostedTable = () => {
  const sent: Sent[] = [];
  const changes = { count: 0 };
  const runtime = new HostRuntime({
    tableName: "Kitchen",
    hostName: "Sam",
    holdsEverySeat: false,
    seed: 99,
    onChange: () => {
      changes.count += 1;
    },
  });
  runtime.attach(fakeTransport(sent));
  return { runtime, sent, changes };
};

const seatThree = (runtime: HostRuntime): void => {
  for (const [peer, name] of [
    ["p1", "Ada"],
    ["p2", "Bo"],
    ["p3", "Cy"],
  ] as const) {
    runtime.onPeerJoin(peer);
    runtime.onMessage(peer, JSON.stringify({ t: "hello", name }));
  }
};

const lastTo = (sent: Sent[], peer: PeerId) =>
  parseHostMessage(sent.filter((entry) => entry.peer === peer).at(-1)?.text ?? "");

describe("HostRuntime lobby", () => {
  it("keeps the host at seat zero and leaves the rest open", () => {
    const { runtime } = hostedTable();
    const lobby = runtime.lobby();
    expect(lobby.players[0]).toMatchObject({ name: "Sam", isHost: true, connected: true });
    expect(lobby.players.filter((player) => player.connected)).toHaveLength(1);
    expect(lobby.canStart).toBe(false);
  });

  it("seats each peer that says hello and then allows the start", () => {
    const { runtime } = hostedTable();
    seatThree(runtime);
    const lobby = runtime.lobby();
    expect(lobby.players.map((player) => player.name)).toEqual(["Sam", "Ada", "Bo", "Cy"]);
    expect(lobby.canStart).toBe(true);
  });

  it("tells a fifth peer that the table is full", () => {
    const { runtime, sent } = hostedTable();
    seatThree(runtime);
    runtime.onPeerJoin("p4");
    runtime.onMessage("p4", JSON.stringify({ t: "hello", name: "Dee" }));
    expect(lastTo(sent, "p4")).toEqual({ t: "rejected", reason: "the table is full" });
    expect(runtime.lobby().players).toHaveLength(4);
  });

  it("frees a seat when a peer drops before the start", () => {
    const { runtime } = hostedTable();
    seatThree(runtime);
    runtime.onPeerLeave("p2");
    expect(runtime.lobby().players[2]).toMatchObject({ name: "Open seat", connected: false });
    expect(runtime.lobby().canStart).toBe(false);
  });

  it("holds the seat when a peer drops after the start", () => {
    const { runtime } = hostedTable();
    seatThree(runtime);
    runtime.start();
    runtime.onPeerLeave("p2");
    expect(runtime.lobby().players[2]).toMatchObject({ name: "Bo", connected: false });
  });

  it("refuses to start before the table is full", () => {
    const { runtime } = hostedTable();
    runtime.start();
    expect(runtime.started).toBe(false);
  });
});

describe("HostRuntime play", () => {
  it("sends each seat a view that holds only its own cards", () => {
    const { runtime, sent } = hostedTable();
    seatThree(runtime);
    runtime.start();
    const toAda = lastTo(sent, "p1");
    if (toAda?.t !== "view") throw new Error("expected a view");
    expect(toAda.view.seat).toBe(1);
    expect(toAda.view.hand).toHaveLength(5);
    const hostView = runtime.view();
    expect(hostView?.hand).not.toEqual(toAda.view.hand);
    expect(JSON.stringify(toAda.view)).not.toContain(hostView?.hand[0] as string);
  });

  it("takes a legal move from the seated peer", () => {
    const { runtime, sent } = hostedTable();
    seatThree(runtime);
    runtime.start();
    expect(runtime.view()?.turn).toBe(1);
    runtime.onMessage("p1", JSON.stringify({ t: "intent", intent: { type: "pass" } }));
    expect(runtime.view()?.turn).toBe(2);
    expect(lastTo(sent, "p1")?.t).toBe("view");
  });

  it("refuses a move from a seat that is not on turn", () => {
    const { runtime, sent } = hostedTable();
    seatThree(runtime);
    runtime.start();
    runtime.onMessage("p2", JSON.stringify({ t: "intent", intent: { type: "pass" } }));
    expect(lastTo(sent, "p2")).toEqual({ t: "rejected", reason: "it is not your turn" });
  });

  it("refuses a move from a peer with no seat", () => {
    const { runtime, sent } = hostedTable();
    runtime.onPeerJoin("stranger");
    runtime.onMessage("stranger", JSON.stringify({ t: "intent", intent: { type: "pass" } }));
    expect(lastTo(sent, "stranger")).toEqual({ t: "rejected", reason: "you are not seated" });
  });

  it("ignores a message it cannot parse", () => {
    const { runtime, changes } = hostedTable();
    const before = changes.count;
    runtime.onMessage("p1", "{not json");
    expect(changes.count).toBe(before);
  });
});

describe("HostRuntime pass and play", () => {
  const passAndPlay = () => {
    const runtime = new HostRuntime({
      tableName: "Kitchen",
      hostName: "Sam",
      holdsEverySeat: true,
      seed: 99,
      onChange: () => {},
    });
    return runtime;
  };

  it("seats every player on the host device", () => {
    const runtime = passAndPlay();
    expect(runtime.localSeats()).toEqual([0, 1, 2, 3]);
    expect(runtime.lobby().canStart).toBe(true);
  });

  it("follows the turn with the shown hand", () => {
    const runtime = passAndPlay();
    runtime.start();
    expect(runtime.activeLocalSeat()).toBe(1);
    expect(runtime.view()?.seat).toBe(1);
    expect(runtime.submit(1, { type: "pass" })).toBeNull();
    expect(runtime.activeLocalSeat()).toBe(2);
  });

  it("reports why a move was refused", () => {
    const runtime = passAndPlay();
    runtime.start();
    expect(runtime.submit(3, { type: "pass" })).toBe("it is not your turn");
  });
});
