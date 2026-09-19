import type { Seat } from "@/features/euchre/lib/types";

export const SEAT_NAMES: Record<Seat, string> = {
  0: "South",
  1: "West",
  2: "North",
  3: "East",
};

export const TEAM_NAMES = ["South / North", "West / East"] as const;
