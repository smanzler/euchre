import { HostRuntime } from "@euchre/game/host/hostRuntime";
import type { PeerId, Transport } from "@euchre/game/host/transport";
import type { HostMessage } from "@euchre/game/protocol/messages";
import {
  type TableReply,
  type TableRequest,
  parseTableRequest,
} from "@euchre/game/protocol/tables";
import type { PeerListener } from "../peers/socketTransport";
import { newTableCode } from "./codes";

type Table = {
  code: string;
  host: PeerId;
  runtime: HostRuntime;
  peers: Set<PeerId>;
};

export type TableRegistryOptions = {
  /** Paces a bot's move. Tests pass a scheduler that runs at once. */
  scheduleBotMove?: (run: () => void) => void;
};

type RequestHandlers = {
  [T in TableRequest["t"]]: (
    peer: PeerId,
    request: Extract<TableRequest, { t: T }>,
  ) => Table | string;
};

/** Keeps the tables in memory, so a restart removes them. */
export const createTableRegistry = (
  transport: Transport,
  options: TableRegistryOptions = {},
): PeerListener => {
  const tables = new Map<string, Table>();
  const tableOf = new Map<PeerId, Table>();

  const reply = (peer: PeerId, message: TableReply | HostMessage): void => {
    void transport.send(peer, JSON.stringify(message));
  };

  const handlers: RequestHandlers = {
    create: (peer, { tableName, name }) => {
      const code = newTableCode((taken) => tables.has(taken));
      const runtime = new HostRuntime({
        tableName,
        host: { kind: "remote", peer, name },
        holdsEverySeat: false,
        scheduleBotMove: options.scheduleBotMove,
        onChange: () => {},
      });
      runtime.attach(transport);
      const table: Table = { code, host: peer, runtime, peers: new Set() };
      tables.set(code, table);
      return table;
    },
    join: (_peer, { code }) => tables.get(code) ?? "no table has that code",
  };

  const close = (table: Table, reason: string): void => {
    tables.delete(table.code);
    for (const peer of table.peers) {
      tableOf.delete(peer);
      reply(peer, { t: "closed", reason });
    }
  };

  return {
    onPeerJoin: () => {},

    onMessage(peer, text) {
      const seated = tableOf.get(peer);
      if (seated !== undefined) {
        seated.runtime.onMessage(peer, text);
        return;
      }
      const request = parseTableRequest(text);
      if (request === null) {
        reply(peer, { t: "rejected", reason: "create or join a table first" });
        return;
      }
      const handle = handlers[request.t] as (
        peer: PeerId,
        request: TableRequest,
      ) => Table | string;
      const table = handle(peer, request);
      if (typeof table === "string") {
        reply(peer, { t: "rejected", reason: table });
        return;
      }
      table.peers.add(peer);
      tableOf.set(peer, table);
      reply(peer, { t: "table", code: table.code });
      table.runtime.onPeerJoin(peer);
    },

    onPeerLeave(peer) {
      const table = tableOf.get(peer);
      if (table === undefined) return;
      tableOf.delete(peer);
      table.peers.delete(peer);
      // Only the host can start the game, so the lobby cannot go on without it.
      if (peer === table.host && !table.runtime.started) {
        close(table, "the host left");
        return;
      }
      table.runtime.onPeerLeave(peer);
      if (table.peers.size === 0) tables.delete(table.code);
    },
  };
};
