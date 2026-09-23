import { type Seat, type Team, seatsOfTeam } from "@/features/euchre/lib/types";

export const SEAT_NAMES: Record<Seat, string> = {
  0: "South",
  1: "West",
  2: "North",
  3: "East",
};

export const TEAM_LABELS = ["Team 1", "Team 2"] as const;

/** The two seats of a team, by the names the table gives them. */
export const teamNameOf = (team: Team, names: Record<Seat, string>): string =>
  seatsOfTeam(team)
    .map((seat) => names[seat])
    .join(" / ");
