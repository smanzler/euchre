import { StyleSheet, Text, View } from "react-native";
import { TEAMS, type Seat, type Team } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { TrumpBadge } from "./TrumpBadge";

const TRICKS_PER_HAND = 5;

type ScoreboardProps = { view: PlayerView; names: Record<Seat, string> };

/** A team holds the two facing seats. */
const seatsOfTeam = (team: Team): readonly Seat[] => [team as Seat, ((team + 2) % 4) as Seat];

const myTeam = (view: PlayerView): Team => (view.seat % 2) as Team;

const TrickPips = ({ won, mine }: { won: number; mine: boolean }) => (
  <View style={styles.pips}>
    {Array.from({ length: TRICKS_PER_HAND }, (_unused, index) => (
      <View
        key={index}
        style={[styles.pip, index < won && (mine ? styles.pipMine : styles.pipTheirs)]}
      />
    ))}
  </View>
);

const TeamColumn = ({
  view,
  team,
  names,
}: {
  view: PlayerView;
  team: Team;
  names: Record<Seat, string>;
}) => {
  const mine = myTeam(view) === team;
  const points = view.score[team];
  const share = Math.min(1, points / view.rules.pointsToWin);
  return (
    <View style={[styles.team, mine && styles.mine]}>
      <Text numberOfLines={1} style={styles.teamName}>
        {seatsOfTeam(team)
          .map((seat) => names[seat])
          .join(" / ")}
      </Text>
      <Text style={styles.score}>{points}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            mine ? styles.fillMine : styles.fillTheirs,
            { width: `${share * 100}%` },
          ]}
        />
      </View>
      <TrickPips won={view.tricksWon[team]} mine={mine} />
    </View>
  );
};

export const Scoreboard = ({ view, names }: ScoreboardProps) => (
  <View style={styles.bar}>
    <TeamColumn view={view} team={TEAMS[0]} names={names} />
    <View style={styles.middle}>
      <TrumpBadge trump={view.trump} />
      <Text style={styles.target}>to {view.rules.pointsToWin}</Text>
    </View>
    <TeamColumn view={view} team={TEAMS[1]} names={names} />
  </View>
);

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  middle: { alignItems: "center", justifyContent: "center", gap: spacing.xs },
  target: { ...typography.label, color: colors.inkDim, fontSize: 10 },
  team: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  mine: { borderColor: colors.accent },
  teamName: { ...typography.label, color: colors.inkDim, fontSize: 10, letterSpacing: 0.5 },
  score: { fontSize: 28, fontWeight: "800", color: colors.ink, lineHeight: 32 },
  track: {
    alignSelf: "stretch",
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.feltDeep,
    overflow: "hidden",
  },
  fill: { height: 4, borderRadius: radius.pill },
  fillMine: { backgroundColor: colors.accent },
  fillTheirs: { backgroundColor: colors.inkDim },
  pips: { flexDirection: "row", gap: 3, paddingTop: 2 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.feltDeep },
  pipMine: { backgroundColor: colors.good },
  pipTheirs: { backgroundColor: colors.inkMuted },
});
