import { StyleSheet, Text, View } from "react-native";
import { suitName, suitSymbol } from "@/features/euchre/lib/cards";
import { TEAMS, type Team } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { TEAM_NAMES } from "@/features/table/lib/seats";
import { colors, radius, spacing, typography } from "@/lib/theme";

type ScoreboardProps = { view: PlayerView };

const myTeam = (view: PlayerView): Team => (view.seat % 2) as Team;

export const Scoreboard = ({ view }: ScoreboardProps) => (
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
      <Text style={styles.score}>{view.trump === null ? "—" : suitSymbol(view.trump)}</Text>
      <Text style={styles.tricks}>
        {view.trump === null ? `to ${view.rules.pointsToWin}` : suitName(view.trump)}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: spacing.sm },
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
    width: 84,
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
