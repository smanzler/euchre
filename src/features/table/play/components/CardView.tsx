import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Card, colorOf, rankLabel, rankOf, suitOf, suitSymbol } from "@/features/euchre/lib/cards";
import { colors, radius } from "@/lib/theme";

export const CARD_SIZES = ["sm", "md", "lg"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

const sizes: Record<CardSize, { width: number; height: number; rank: number; pip: number }> = {
  sm: { width: 34, height: 48, rank: 12, pip: 14 },
  md: { width: 48, height: 68, rank: 16, pip: 22 },
  lg: { width: 62, height: 88, rank: 20, pip: 30 },
};

type CardViewProps = {
  card: Card;
  size?: CardSize;
  faceDown?: boolean;
  dimmed?: boolean;
  raised?: boolean;
  onPress?: () => void;
};

export const CardView = ({
  card,
  size = "md",
  faceDown = false,
  dimmed = false,
  raised = false,
  onPress,
}: CardViewProps) => {
  const box = sizes[size];
  const suit = suitOf(card);
  const ink = colorOf(suit) === "red" ? colors.red : colors.black;
  const label = `${rankLabel(rankOf(card))} of ${suit}`;

  const body = faceDown ? (
    <View style={[styles.face, styles.back, { width: box.width, height: box.height }]}>
      <View style={styles.backPattern} />
    </View>
  ) : (
    <View style={[styles.face, { width: box.width, height: box.height }]}>
      <Text style={[styles.rank, { fontSize: box.rank, color: ink }]}>
        {rankLabel(rankOf(card))}
      </Text>
      <Text style={[styles.pip, { fontSize: box.pip, color: ink }]}>{suitSymbol(suit)}</Text>
    </View>
  );

  const shell = (
    <View style={[dimmed && styles.dimmed, raised && styles.raised]}>{body}</View>
  );

  if (onPress === undefined) return shell;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {shell}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardEdge,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: "space-between",
  },
  back: { backgroundColor: colors.cardBack, borderColor: colors.feltDeep, padding: 4 },
  backPattern: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  rank: { fontWeight: "800" },
  pip: { textAlign: "right", lineHeight: undefined },
  dimmed: { opacity: 0.4 },
  raised: { transform: [{ translateY: -12 }] },
});
