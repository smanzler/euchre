import { StyleSheet, Text, View } from "react-native";
import { type Suit, suitSymbol } from "@/features/euchre/lib/cards";
import { colors, radius, spacing, typography } from "@/lib/theme";

type MakerTagProps = {
  trump: Suit;
  alone: boolean;
};

/** Marks the seat that named trump, and whether it is playing the hand alone. */
export const MakerTag = ({ trump, alone }: MakerTagProps) => (
  <View style={[styles.tag, alone && styles.alone]}>
    <Text style={[styles.text, alone && styles.aloneText]}>
      {alone ? "ALONE" : "CALLED"} {suitSymbol(trump)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  tag: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  alone: { backgroundColor: colors.danger },
  text: { ...typography.label, fontSize: 9, color: colors.accentInk },
  aloneText: { color: colors.ink },
});
