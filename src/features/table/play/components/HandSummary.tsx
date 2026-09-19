import { StyleSheet, Text, View } from "react-native";
import { suitSymbol } from "@/features/euchre/lib/cards";
import { type HandResult, type Seat, seatsOfTeam } from "@/features/euchre/lib/types";
import { colors, radius, spacing, typography } from "@/lib/theme";

const TRICKS_PER_HAND = 5;

type HandSummaryProps = {
  result: HandResult;
  names: Record<Seat, string>;
};

const headlineOf = (result: HandResult): string => {
  if (result.euchred) return "EUCHRED";
  if (result.points === 4) return "ALONE, ALL FIVE";
  if (result.points === 2) return "A MARCH";
  return "MAKERS MADE IT";
};

/** How a hand ended, for the table to read before the next deal. */
export const HandSummary = ({ result, names }: HandSummaryProps) => (
  <View style={[styles.card, result.euchred && styles.euchred]}>
    <Text style={[styles.headline, result.euchred && styles.headlineEuchred]}>
      {headlineOf(result)}
    </Text>
    <Text style={styles.call}>
      {names[result.maker]} called {suitSymbol(result.trump)}
      {result.alone ? " alone" : ""}
    </Text>
    <View style={styles.pips}>
      {Array.from({ length: TRICKS_PER_HAND }, (_unused, index) => (
        <View key={index} style={[styles.pip, index < result.makerTricks && styles.pipWon]} />
      ))}
    </View>
    <Text style={styles.points}>
      {seatsOfTeam(result.scoringTeam)
        .map((seat) => names[seat])
        .join(" / ")}{" "}
      +{result.points}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "stretch",
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.good,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  euchred: { borderColor: colors.danger },
  headline: { ...typography.label, color: colors.good },
  headlineEuchred: { color: colors.danger },
  call: { ...typography.body, color: colors.ink },
  pips: { flexDirection: "row", gap: 3, paddingVertical: 2 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.feltDeep },
  pipWon: { backgroundColor: colors.accent },
  points: { ...typography.label, color: colors.inkMuted, fontSize: 10 },
});
