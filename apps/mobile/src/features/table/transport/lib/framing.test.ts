import { createAssembler, createFramer } from "./framing";

describe("framing", () => {
  const roundTrip = (text: string, chunkBytes: number): string | null => {
    const assembler = createAssembler();
    let out: string | null = null;
    for (const frame of createFramer(chunkBytes).encode(text)) {
      out = assembler.push(frame) ?? out;
    }
    return out;
  };

  it("carries a short message in one frame", () => {
    expect(createFramer(180).encode("hi")).toHaveLength(1);
    expect(roundTrip("hi", 180)).toBe("hi");
  });

  it("splits and rebuilds a long message", () => {
    const text = JSON.stringify({ t: "view", pad: "x".repeat(2000) });
    expect(createFramer(40).encode(text).length).toBeGreaterThan(50);
    expect(roundTrip(text, 40)).toBe(text);
  });

  it("carries an empty message", () => {
    expect(roundTrip("", 180)).toBe("");
  });

  it("keeps multi byte characters intact across a chunk boundary", () => {
    const text = "♠♥♦♣".repeat(40);
    expect(roundTrip(text, 20)).toBe(text);
  });

  it("interleaves two messages without mixing them", () => {
    const framer = createFramer(20);
    const assembler = createAssembler();
    const first = framer.encode("first message that needs several frames");
    const second = framer.encode("second message that also needs several");
    const results: string[] = [];
    const longest = Math.max(first.length, second.length);
    for (let i = 0; i < longest; i += 1) {
      for (const frame of [first[i], second[i]]) {
        if (frame === undefined) continue;
        const done = assembler.push(frame);
        if (done !== null) results.push(done);
      }
    }
    expect(results.sort()).toEqual(
      [
        "first message that needs several frames",
        "second message that also needs several",
      ].sort(),
    );
  });

  it("ignores a frame that is too short to hold a header", () => {
    expect(createAssembler().push("AA==")).toBeNull();
  });

  it("drops a partial message when the same id restarts with a new size", () => {
    const assembler = createAssembler();
    const long = createFramer(20).encode("a".repeat(100));
    assembler.push(long[0] as string);
    expect(assembler.push(createFramer(180).encode("short")[0] as string)).toBe(
      "short",
    );
  });
});
