import { fromBase64, toBase64, utf8Decode, utf8Encode } from "./bytes";

describe("utf8", () => {
  it("round trips ascii, accents and emoji", () => {
    for (const text of ["", "hello", "café naïve", "♠♥♦♣", "🃏 ok"]) {
      expect(utf8Decode(utf8Encode(text))).toBe(text);
    }
  });

  it("matches the byte length of a known string", () => {
    expect(utf8Encode("♠").length).toBe(3);
  });
});

describe("base64", () => {
  it("round trips every byte value", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_unused, index) => index);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it("pads the way the standard does", () => {
    expect(toBase64(utf8Encode("a"))).toBe("YQ==");
    expect(toBase64(utf8Encode("ab"))).toBe("YWI=");
    expect(toBase64(utf8Encode("abc"))).toBe("YWJj");
  });

  it("decodes what it encodes for every short length", () => {
    for (let length = 0; length < 8; length += 1) {
      const bytes = Uint8Array.from({ length }, (_unused, index) => index * 37);
      expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
    }
  });
});
