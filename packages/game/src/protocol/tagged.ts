/** Checks only the tag. Use it for messages from a trusted host. */
export const parseTagged = <T extends { t: string }>(
  text: string,
  tags: readonly string[],
): T | null => {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const tag = (value as { t?: unknown }).t;
    return typeof tag === "string" && tags.includes(tag) ? (value as T) : null;
  } catch {
    return null;
  }
};
