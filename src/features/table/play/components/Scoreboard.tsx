import { StyleSheet, Text, View } from "react-native";
import { TEAMS, type Team } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { TEAM_NAMES } from "@/features/table/lib/seats";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { TrumpBadge } from "./TrumpBadge";

type ScoreboardProps = { view: PlayerView };

const myTeam = (view: PlayerView): Team => (view.seat % 2) as Team;

export const Scoreboard = ({ view }: ScoreboardProps) => (
  <View style={styles.board}>
    <View style={styles.bar}>
      {TEAMS.map((team) => (
        <View key={team} style={[styles.team, myTeam(view) === team && styles.mine]}>
          <Text style={styles.teamName}>{TEAM_NAMES[team]}</Text>
          <Text style={styles.score}>{view.score[team]}</Text>
          <Text style={styles.tricks}>{view.tricksWon[team]} tricks</Text>
        </View>
      ))}
      <View style={styles.trump}>
        <Text style={styles.teamName}>TRUMP</Text>
        <TrumpBadge trump={view.trump} withName />
      </View>
    </View>
    <Text style={styles.target}>first to {view.rules.pointsToWin}</Text>
  </View>
);

const styles = StyleSheet.create({
  board: { gap: spacing.xs },
  bar: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  target: { ...typography.label, color: colors.inkDim, fontSize: 10, textAlign: "center" },
  team: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center",
  },
  mine: { borderColor: colors.accent },
  trump: {
    width: 96,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center",
  },
  teamName: { ...typography.label, color: colors.inkDim, fontSize: 10 },
  score: { fontSize: 22, fontWeight: "800", color: colors.ink },
  tricks: { ...typography.label, color: colors.inkMuted, fontSize: 10 },
});
