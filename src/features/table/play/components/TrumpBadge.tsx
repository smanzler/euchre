import { StyleSheet, Text, View } from "react-native";
import { type Suit, colorOf, suitName, suitSymbol } from "@/features/euchre/lib/cards";
import { colors, radius, spacing, typography } from "@/lib/theme";

const SYMBOL_SIZE = 20;

type TrumpBadgeProps = { trump: Suit | null };

/** A pale face with the suit in its own colour, so trump reads as a card. */
export const TrumpBadge = ({ trump }: TrumpBadgeProps) => {
  if (trump === null) {
    return (
      <View style={[styles.face, styles.blank]}>
        <Text style={styles.blankMark}>?</Text>
      </View>
    );
  }
  const ink = colorOf(trump) === "red" ? colors.red : colors.black;
  return (
    <View style={[styles.face, { borderColor: ink }]}>
      <Text style={[styles.symbol, { color: ink }]}>{suitSymbol(trump)}</Text>
      <Text style={[styles.name, { color: ink }]}>{suitName(trump).toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 40,
  },
  symbol: { fontSize: SYMBOL_SIZE, lineHeight: SYMBOL_SIZE * 1.15 },
  blank: { borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  blankMark: { fontSize: SYMBOL_SIZE, color: colors.inkDim, fontWeight: "800" },
  name: { ...typography.label, fontSize: 10 },
});
