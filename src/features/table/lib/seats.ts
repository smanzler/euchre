import type { Seat } from "@/features/euchre/lib/types";

export const SEAT_NAMES: Record<Seat, string> = {
  0: "South",
  1: "West",
  2: "North",
  3: "East",
};

export const TEAM_NAMES = ["South / North", "West / East"] as const;

/** Where a seat sits on screen when `me` is at the bottom. */
export const SEAT_POSITIONS = ["bottom", "left", "top", "right"] as const;
export type SeatPosition = (typeof SEAT_POSITIONS)[number];

export const positionOf = (seat: Seat, me: Seat): SeatPosition =>
  SEAT_POSITIONS[(seat - me + 4) % 4] as SeatPosition;
