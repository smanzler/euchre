import { StyleSheet, Text, View } from "react-native";
import { type Suit, colorOf, suitName, suitSymbol } from "@/features/euchre/lib/cards";
import { colors, radius, spacing, typography } from "@/lib/theme";

export const TRUMP_BADGE_SIZES = ["chip", "emblem"] as const;
export type TrumpBadgeSize = (typeof TRUMP_BADGE_SIZES)[number];

const symbolSize: Record<TrumpBadgeSize, number> = { chip: 20, emblem: 52 };

type TrumpBadgeProps = {
  trump: Suit | null;
  size?: TrumpBadgeSize;
  /** Adds the suit name under the symbol. */
  withName?: boolean;
};

/** A pale face with the suit in its own colour, so trump reads as a card. */
export const TrumpBadge = ({ trump, size = "chip", withName = false }: TrumpBadgeProps) => {
  if (trump === null) {
    return (
      <View style={[styles.face, styles[size], styles.blank]}>
        <Text style={styles.blankMark}>?</Text>
      </View>
    );
  }
  const ink = colorOf(trump) === "red" ? colors.red : colors.black;
  return (
    <View style={[styles.face, styles[size], { borderColor: ink }]}>
      <Text style={{ fontSize: symbolSize[size], color: ink, lineHeight: symbolSize[size] * 1.15 }}>
        {suitSymbol(trump)}
      </Text>
      {withName ? (
        <Text style={[styles.name, { color: ink }]}>{suitName(trump).toUpperCase()}</Text>
      ) : null}
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
  },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 40 },
  emblem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  blank: { borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  blankMark: { fontSize: 20, color: colors.inkDim, fontWeight: "800" },
  name: { ...typography.label, fontSize: 10 },
});
