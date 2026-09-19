import type { Seat } from "@/features/euchre/lib/types";
import { parseHostMessage } from "../transport/lib/protocol";
import type { PeerId, Transport } from "../transport/lib/types";
import { chooseIntent } from "../bots/lib/policy";
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
    expect(lobby.players[0]).toMatchObject({ name: "Sam", kind: "host", connected: true });
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

  it("names a seat the host holds, and refuses a remote player's seat", () => {
    const { runtime } = hostedTable();
    seatThree(runtime);
    expect(runtime.renamableSeats()).toEqual([0]);
    runtime.renameSeat(0, "Sammy");
    runtime.renameSeat(1, "Not Ada");
    expect(runtime.lobby().players[0]?.name).toBe("Sammy");
    expect(runtime.lobby().players[1]?.name).toBe("Ada");
  });

  it("stops naming seats once the game is under way", () => {
    const { runtime } = hostedTable();
    seatThree(runtime);
    runtime.start();
    runtime.renameSeat(0, "Sammy");
    expect(runtime.renamableSeats()).toEqual([]);
    expect(runtime.lobby().players[0]?.name).toBe("Sam");
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

describe("HostRuntime bots", () => {
  const soloTable = () => {
    const runtime = new HostRuntime({
      tableName: "Kitchen",
      hostName: "Sam",
      holdsEverySeat: false,
      seed: 99,
      scheduleBotMove: (run) => run(),
      onChange: () => {},
    });
    runtime.fillWithBots();
    return runtime;
  };

  it("fills every seat but the host's own", () => {
    const runtime = soloTable();
    const lobby = runtime.lobby();
    expect(lobby.players.map((player) => player.kind)).toEqual(["host", "bot", "bot", "bot"]);
    expect(lobby.canStart).toBe(true);
    expect(runtime.localSeats()).toEqual([0]);
  });

  it("names a bot's seat", () => {
    const runtime = soloTable();
    runtime.renameSeat(2, "Nora");
    expect(runtime.lobby().players[2]).toMatchObject({ name: "Nora", kind: "bot" });
  });

  it("gives a seat back when a bot is removed", () => {
    const runtime = soloTable();
    runtime.removeBot(2);
    expect(runtime.lobby().players[2]).toMatchObject({ kind: "open", connected: false });
    expect(runtime.lobby().canStart).toBe(false);
  });

  it("never gives the host's seat to a bot", () => {
    const runtime = soloTable();
    runtime.addBot(0);
    expect(runtime.lobby().players[0]?.kind).toBe("host");
  });

  it("runs the bots up to the human's turn as soon as the hand opens", () => {
    const runtime = soloTable();
    runtime.start();
    const view = runtime.view();
    expect(view).not.toBeNull();
    expect(view?.seat).toBe(0);
    // Seats 1 to 3 are bots, so play stops only where the human must act.
    expect(view?.turn === 0 || view?.phase === "hand-over").toBe(true);
  });

  it("plays a whole hand with the human always following the bots", () => {
    const runtime = soloTable();
    runtime.start();
    for (let step = 0; step < 60; step += 1) {
      const view = runtime.view();
      if (view === null || view.phase === "hand-over" || view.phase === "game-over") break;
      if (view.turn !== 0) break;
      const intent = chooseIntent(view);
      if (intent === null) break;
      const reason = runtime.submit(0, intent);
      if (reason !== null) throw new Error(`${view.phase}: ${reason}`);
    }
    const view = runtime.view();
    expect(view?.phase).toBe("hand-over");
    expect(view?.lastHand).not.toBeNull();
    expect((view?.score[0] ?? 0) + (view?.score[1] ?? 0)).toBeGreaterThan(0);
  });

  it("plays a whole game of bots against bots to a winner", () => {
    const runtime = soloTable();
    runtime.start();
    for (let hand = 0; hand < 60; hand += 1) {
      for (let step = 0; step < 60; step += 1) {
        const view = runtime.view();
        if (view === null || view.turn !== 0) break;
        const intent = chooseIntent(view);
        if (intent === null) break;
        if (runtime.submit(0, intent) !== null) break;
      }
      const view = runtime.view();
      if (view?.phase === "game-over") break;
      if (view?.phase !== "hand-over") break;
      runtime.submit(0, { type: "next-hand" });
    }
    const view = runtime.view();
    expect(view?.phase).toBe("game-over");
    expect(view?.winner).not.toBeNull();
    expect(Math.max(view?.score[0] ?? 0, view?.score[1] ?? 0)).toBeGreaterThanOrEqual(10);
  });

  it("seats a late person in a bot's chair rather than turning them away", () => {
    const sent: Sent[] = [];
    const runtime = new HostRuntime({
      tableName: "Kitchen",
      hostName: "Sam",
      holdsEverySeat: false,
      seed: 99,
      scheduleBotMove: (run) => run(),
      onChange: () => {},
    });
    runtime.attach(fakeTransport(sent));
    runtime.fillWithBots();
    runtime.onPeerJoin("p1");
    runtime.onMessage("p1", JSON.stringify({ t: "hello", name: "Ada" }));
    const lobby = runtime.lobby();
    expect(lobby.players[1]).toMatchObject({ name: "Ada", kind: "human" });
    expect(lobby.players.filter((player) => player.kind === "bot")).toHaveLength(2);
  });
});
