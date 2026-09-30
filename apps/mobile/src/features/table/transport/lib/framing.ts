import { fromBase64, toBase64, utf8Decode, utf8Encode } from "./bytes";

/** messageId, chunk index, chunk count. */
export const FRAME_HEADER_BYTES = 3;

export const MAX_CHUNKS = 256;

/** Used until a connection reports its own MTU. */
export const DEFAULT_CHUNK_BYTES = 180;

export type Framer = {
  /** Base64 frames, in order, for one message. */
  encode(text: string): string[];
};

export const createFramer = (chunkBytes = DEFAULT_CHUNK_BYTES): Framer => {
  const payloadBytes = Math.max(1, chunkBytes - FRAME_HEADER_BYTES);
  let nextId = 0;
  return {
    encode(text) {
      const bytes = utf8Encode(text);
      const total = Math.max(1, Math.ceil(bytes.length / payloadBytes));
      if (total > MAX_CHUNKS) throw new Error("message is too large to frame");
      const id = nextId;
      nextId = (nextId + 1) % MAX_CHUNKS;
      const frames: string[] = [];
      for (let index = 0; index < total; index += 1) {
        const slice = bytes.subarray(
          index * payloadBytes,
          (index + 1) * payloadBytes,
        );
        const frame = new Uint8Array(FRAME_HEADER_BYTES + slice.length);
        frame[0] = id;
        frame[1] = index;
        frame[2] = total - 1;
        frame.set(slice, FRAME_HEADER_BYTES);
        frames.push(toBase64(frame));
      }
      return frames;
    },
  };
};

export type Assembler = {
  /** The whole message once its last frame arrives, otherwise null. */
  push(frame: string): string | null;
  reset(): void;
};

export const createAssembler = (): Assembler => {
  const pending = new Map<number, (Uint8Array | undefined)[]>();
  return {
    push(frame) {
      const bytes = fromBase64(frame);
      if (bytes.length < FRAME_HEADER_BYTES) return null;
      const id = bytes[0] as number;
      const index = bytes[1] as number;
      const total = (bytes[2] as number) + 1;
      if (index >= total) return null;
      const held = pending.get(id);
      // A different size under the same id means the old partial is stale.
      const parts =
        held !== undefined && held.length === total
          ? held
          : Array.from<undefined, Uint8Array | undefined>(
              { length: total },
              () => undefined,
            );
      parts[index] = bytes.subarray(FRAME_HEADER_BYTES);
      pending.set(id, parts);
      if (parts.some((part) => part === undefined)) return null;
      pending.delete(id);
      const size = parts.reduce((sum, part) => sum + (part?.length ?? 0), 0);
      const joined = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) {
        if (part === undefined) continue;
        joined.set(part, offset);
        offset += part.length;
      }
      return utf8Decode(joined);
    },
    reset() {
      pending.clear();
    },
  };
};
