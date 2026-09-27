import type { FastifyInstance } from "fastify";
import type { PeerListener, SocketTransport } from "./socketTransport";

export const peersRoute =
  (transport: SocketTransport, listener: PeerListener) =>
  async (app: FastifyInstance): Promise<void> => {
    app.get("/ws", { websocket: true }, (socket) => {
      transport.add(socket, listener);
    });
  };
