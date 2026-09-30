import {
  TABLE_CODE_LENGTH,
  TABLE_CODE_LETTERS,
} from "@euchre/game/protocol/tables";

/** Gives a random code that `taken` does not refuse. */
export const newTableCode = (taken: (code: string) => boolean): string => {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(TABLE_CODE_LENGTH));
    const code = Array.from(
      bytes,
      (byte) => TABLE_CODE_LETTERS[byte % TABLE_CODE_LETTERS.length],
    ).join("");
    if (!taken(code)) return code;
  }
};
