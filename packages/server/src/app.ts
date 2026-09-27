import websocket from "@fastify/websocket";
import fastify, { type FastifyServerOptions } from "fastify";
import { healthRoute } from "./health/route";
import { peersRoute } from "./peers/route";
import {
  type PeerListener,
  createSocketTransport,
} from "./peers/socketTransport";

export const buildServer = (
  listener: PeerListener,
  options: FastifyServerOptions = {},
) => {
  const app = fastify(options);
  const transport = createSocketTransport(listener);
  app.register(websocket);
  app.register(healthRoute);
  app.register(peersRoute(transport));
  app.addHook("onClose", () => transport.stop());
  return { app, transport };
};
