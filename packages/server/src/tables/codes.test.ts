import { TABLE_CODE_LETTERS } from "@euchre/game/protocol/tables";
import { describe, expect, it } from "vitest";
import { newTableCode } from "./codes";

describe("newTableCode", () => {
  it("gives four letters from the code alphabet", () => {
    const code = newTableCode(() => false);
    expect(code).toHaveLength(4);
    for (const letter of code) expect(TABLE_CODE_LETTERS).toContain(letter);
  });

  it("skips a code that is taken", () => {
    const first = newTableCode(() => false);
    let calls = 0;
    const code = newTableCode(() => {
      calls += 1;
      return calls === 1;
    });
    expect(calls).toBe(2);
    expect(code).toHaveLength(first.length);
  });
});
