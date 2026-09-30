export type PeerId = string;

export type Transport = {
  send(peer: PeerId, text: string): Promise<void>;
  broadcast(text: string): Promise<void>;
  stop(): Promise<void>;
};
