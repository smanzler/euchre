import { useSyncExternalStore } from "react";
import { SEATS, type Seat } from "@euchre/game/rules/types";
import { SEAT_NAMES } from "@euchre/game/host/seats";
import { type TableSnapshot, tableStore } from "../lib/tableStore";
import type { LobbySnapshot } from "@euchre/game/protocol/messages";

export const useTable = (): TableSnapshot =>
  useSyncExternalStore(
    tableStore.subscribe,
    tableStore.getSnapshot,
    tableStore.getSnapshot,
  );

export const seatNamesOf = (
  lobby: LobbySnapshot | null,
): Record<Seat, string> => {
  const names = {} as Record<Seat, string>;
  for (const seat of SEATS) {
    names[seat] =
      lobby?.players.find((player) => player.seat === seat)?.name ??
      SEAT_NAMES[seat];
  }
  return names;
};
