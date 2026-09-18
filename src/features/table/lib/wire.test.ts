import type { Card } from "@/features/euchre/lib/cards";
import type { Phase } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { createAssembler, createFramer } from "../transport/lib/protocol";
import type { PlayerIntent } from "../transport/lib/protocol";
import type { PeerId, Transport, TransportListener } from "../transport/lib/types";
import { ClientRuntime } from "./clientRuntime";
import { HostRuntime } from "./hostRuntime";

/**
 * A host and its clients joined by the real framer, so a test covers the
 * chunking that a small ATT MTU forces. Delivery is synchronous.
 */
const CHUNK_BYTES = 24;

type Wire = {
  host: Transport;
  join(peer: PeerId, listener: TransportListener): Transport;
};

const createWire = (hostListener: TransportListener): Wire => {
  const toClient = new Map<PeerId, (frame: string) => void>();
  const fromClient = new Map<PeerId, (frame: string) => void>();

  const host: Transport = {
    kind: "ble-host",
    async send(peer, text) {
      const deliver = toClient.get(peer);
      if (deliver === undefined) return;
      for (const frame of hostFramers(peer).encode(text)) deliver(frame);
    },
    async broadcast(text) {
      for (const peer of toClient.keys()) await host.send(peer, text);
    },
    async stop() {
      toClient.clear();
      fromClient.clear();
    },
  };

  const framers = new Map<PeerId, ReturnType<typeof createFramer>>();
  function hostFramers(peer: PeerId) {
    const held = framers.get(peer);
    if (held !== undefined) return held;
    const made = createFramer(CHUNK_BYTES);
    framers.set(peer, made);
    return made;
  }

  return {
    host,
    join(peer, listener) {
      const inbound = createAssembler();
      toClient.set(peer, (frame) => {
        const text = inbound.push(frame);
        if (text !== null) listener.onMessage("host", text);
      });
      const outbound = createAssembler();
      fromClient.set(peer, (frame) => {
        const text = outbound.push(frame);
        if (text !== null) hostListener.onMessage(peer, text);
      });
      hostListener.onPeerJoin(peer);
      const clientFramer = createFramer(CHUNK_BYTES);
      const send = async (_target: string, text: string): Promise<void> => {
        const deliver = fromClient.get(peer);
        if (deliver === undefined) return;
        for (const frame of clientFramer.encode(text)) deliver(frame);
      };
      return {
        kind: "ble-client",
        send,
        broadcast: (text) => send("host", text),
        async stop() {
          toClient.delete(peer);
          fromClient.delete(peer);
          hostListener.onPeerLeave(peer);
        },
      };
    },
  };
};

const listenAsHost = (runtime: HostRuntime): TransportListener => ({
  onPeerJoin: (peer) => runtime.onPeerJoin(peer),
  onPeerLeave: (peer) => runtime.onPeerLeave(peer),
  onMessage: (peer, text) => runtime.onMessage(peer, text),
  onStatus: () => {},
});

const listenAsClient = (runtime: ClientRuntime): TransportListener => ({
  onPeerJoin: () => {},
  onPeerLeave: () => {},
  onMessage: (_peer, text) => runtime.onMessage(text),
  onStatus: () => {},
});

const nextIntents: Record<Phase, (view: PlayerView) => PlayerIntent | null> = {
  "bidding-up": () => ({ type: "pass" }),
  "bidding-call": (view) => ({
    type: "call-trump",
    suit: view.callableSuits[0] ?? "S",
    alone: false,
  }),
  "dealer-discard": (view) => ({ type: "discard", card: view.hand[0] as Card }),
  playing: (view) => ({ type: "play-card", card: view.legalPlays[0] as Card }),
  "hand-over": () => ({ type: "next-hand" }),
  "game-over": () => null,
};

const seatTable = () => {
  const hostRuntime = new HostRuntime({
    tableName: "Kitchen",
    hostName: "Sam",
    holdsEverySeat: false,
    seed: 4242,
    onChange: () => {},
  });
  const wire = createWire(listenAsHost(hostRuntime));
  hostRuntime.attach(wire.host);

  const clients = ["p1", "p2", "p3"].map((peer, index) => {
    const runtime = new ClientRuntime({
      displayName: ["Ada", "Bo", "Cy"][index] as string,
      onChange: () => {},
    });
    runtime.attach(wire.join(peer, listenAsClient(runtime)));
    return runtime;
  });

  return { hostRuntime, clients };
};

describe("host and clients over a framed wire", () => {
  it("seats every client and tells each one its seat", () => {
    const { hostRuntime, clients } = seatTable();
    expect(hostRuntime.lobby().canStart).toBe(true);
    expect(clients.map((client) => client.seat)).toEqual([1, 2, 3]);
    expect(clients[0]?.lobby?.players.map((player) => player.name)).toEqual([
      "Sam",
      "Ada",
      "Bo",
      "Cy",
    ]);
  });

  it("deals each client a view holding only its own cards", () => {
    const { hostRuntime, clients } = seatTable();
    hostRuntime.start();
    const hands = [hostRuntime.view(), ...clients.map((client) => client.view)].map(
      (view) => view?.hand ?? [],
    );
    for (const hand of hands) expect(hand).toHaveLength(5);
    expect(new Set(hands.flat()).size).toBe(20);
    const [hostHand, mine, ...rest] = hands;
    const serialized = JSON.stringify(clients[0]?.view);
    for (const card of [...(hostHand ?? []), ...rest.flat()]) {
      expect(serialized).not.toContain(card);
    }
    for (const card of mine ?? []) expect(serialized).toContain(card);
  });

  it("tells a client that moved out of turn why it was refused", () => {
    const { hostRuntime, clients } = seatTable();
    hostRuntime.start();
    const offTurn = clients.find((client) => client.view?.turn !== client.seat);
    offTurn?.submit({ type: "pass" });
    expect(offTurn?.lastRejection).toBe("it is not your turn");
  });

  it("plays a whole hand through the wire and agrees on the score", () => {
    const { hostRuntime, clients } = seatTable();
    hostRuntime.start();

    const act = (): boolean => {
      const hostView = hostRuntime.view();
      if (hostView === null) return false;
      if (hostView.phase === "game-over") return false;
      if (hostView.turn === hostView.seat) {
        const intent = nextIntents[hostView.phase](hostView);
        if (intent === null) return false;
        hostRuntime.submit(hostView.seat, intent);
        return true;
      }
      const onTurn = clients.find((client) => client.view?.turn === client.seat);
      const view = onTurn?.view;
      if (onTurn === undefined || view === undefined || view === null) return false;
      const intent = nextIntents[view.phase](view);
      if (intent === null) return false;
      onTurn.submit(intent);
      return true;
    };

    let steps = 0;
    while (hostRuntime.view()?.phase !== "hand-over" && steps < 200) {
      if (!act()) break;
      steps += 1;
    }

    const final = hostRuntime.view();
    expect(final?.phase).toBe("hand-over");
    expect(final?.lastHand).not.toBeNull();
    expect((final?.score[0] ?? 0) + (final?.score[1] ?? 0)).toBeGreaterThan(0);
    for (const client of clients) {
      expect(client.view?.score).toEqual(final?.score);
      expect(client.view?.lastHand).toEqual(final?.lastHand);
    }
  });

  it("frees the seat when a client drops before the deal", () => {
    const hostRuntime = new HostRuntime({
      tableName: "Kitchen",
      hostName: "Sam",
      holdsEverySeat: false,
      seed: 1,
      onChange: () => {},
    });
    const wire = createWire(listenAsHost(hostRuntime));
    hostRuntime.attach(wire.host);
    const runtime = new ClientRuntime({ displayName: "Ada", onChange: () => {} });
    const transport = wire.join("p1", listenAsClient(runtime));
    runtime.attach(transport);
    expect(hostRuntime.lobby().players[1]?.name).toBe("Ada");
    void transport.stop();
    expect(hostRuntime.lobby().players[1]?.name).toBe("Open seat");
  });
});
