/** Expo puts `EXPO_PUBLIC_*` values into the bundle at build time. */
export const serverUrl = (): string | null => {
  const url = process.env.EXPO_PUBLIC_SERVER_URL?.trim();
  return url === undefined || url === "" ? null : url.replace(/\/+$/, "");
};
