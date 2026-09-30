import type { PeerId, Transport } from "@euchre/game/host/transport";
import type { WebSocket } from "ws";

export type PeerListener = {
  onPeerJoin(peer: PeerId): void;
  onPeerLeave(peer: PeerId): void;
  onMessage(peer: PeerId, text: string): void;
};

export type SocketTransport = Transport & {
  /** Gives the socket a new peer id and sends its events to the listener. */
  add(socket: WebSocket, listener: PeerListener): PeerId;
};

/** A close code from RFC 6455. */
const INTERNAL_ERROR = 1011;

const sendText = (socket: WebSocket, text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    socket.send(text, (error) => (error ? reject(error) : resolve()));
  });

export const createSocketTransport = (): SocketTransport => {
  const sockets = new Map<PeerId, WebSocket>();

  const send = async (peer: PeerId, text: string): Promise<void> => {
    const socket = sockets.get(peer);
    if (socket === undefined || socket.readyState !== socket.OPEN) return;
    await sendText(socket, text);
  };

  return {
    add(socket, listener) {
      const peer = crypto.randomUUID();
      sockets.set(peer, socket);
      socket.on("message", (data, isBinary) => {
        if (isBinary) return;
        // A throw from a socket event stops the server, so close only this peer.
        try {
          listener.onMessage(peer, data.toString());
        } catch {
          socket.close(INTERNAL_ERROR);
        }
      });
      // ws closes the socket after an error. Without a listener, the error stops the server.
      socket.on("error", () => {});
      socket.on("close", () => {
        sockets.delete(peer);
        listener.onPeerLeave(peer);
      });
      listener.onPeerJoin(peer);
      return peer;
    },
    send,
    async broadcast(text) {
      await Promise.all([...sockets.keys()].map((peer) => send(peer, text)));
    },
    async stop() {
      for (const socket of sockets.values()) socket.close(1001);
    },
  };
};
