import type { Transport } from "@euchre/game/host/transport";
import websocket from "@fastify/websocket";
import fastify, { type FastifyServerOptions } from "fastify";
import { healthRoute } from "./health/route";
import { peersRoute } from "./peers/route";
import {
  type PeerListener,
  createSocketTransport,
} from "./peers/socketTransport";

/** In bytes. A lobby or a view is far smaller. */
const MAX_MESSAGE_BYTES = 64 * 1024;

export const buildServer = (
  listenerFor: (transport: Transport) => PeerListener,
  options: FastifyServerOptions = {},
) => {
  const app = fastify(options);
  const transport = createSocketTransport();
  app.register(websocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });
  app.register(healthRoute);
  app.register(peersRoute(transport, listenerFor(transport)));
  app.addHook("onClose", () => transport.stop());
  return { app, transport };
};
