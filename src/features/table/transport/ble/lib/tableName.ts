import { utf8Encode } from "../../lib/bytes";
import { MAX_TABLE_NAME_BYTES } from "./constants";

const ELLIPSIS = "…";

const byteLength = (text: string): number => utf8Encode(text).length;

/**
 * Fits the name into MAX_TABLE_NAME_BYTES of UTF-8. A cut name ends in an
 * ellipsis so that joining players can see the cut.
 */
export const trimTableName = (name: string): string => {
  const trimmed = name.trim();
  if (byteLength(trimmed) <= MAX_TABLE_NAME_BYTES) return trimmed;
  const budget = MAX_TABLE_NAME_BYTES - byteLength(ELLIPSIS);
  let kept = "";
  let used = 0;
  for (const character of trimmed) {
    const size = byteLength(character);
    if (used + size > budget) break;
    kept += character;
    used += size;
  }
  return kept.trimEnd() + ELLIPSIS;
};
