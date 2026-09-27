import type { FastifyInstance } from "fastify";
import type { SocketTransport } from "./socketTransport";

export const peersRoute =
  (transport: SocketTransport) =>
  async (app: FastifyInstance): Promise<void> => {
    app.get("/ws", { websocket: true }, (socket) => {
      transport.add(socket);
    });
  };
