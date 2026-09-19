import { StyleSheet, Text, View } from "react-native";
import type { Card, Suit } from "@/features/euchre/lib/cards";
import { sortForHand } from "@/features/euchre/lib/trick";
import { colors, spacing, typography } from "@/lib/theme";
import { CardView } from "./CardView";

type HandRowProps = {
  hand: readonly Card[];
  trump: Suit | null;
  playable: readonly Card[];
  onPlay: ((card: Card) => void) | null;
};

export const HandRow = ({ hand, trump, playable, onPlay }: HandRowProps) => {
  if (hand.length === 0) {
    return <Text style={styles.empty}>You sit this hand out.</Text>;
  }
  return (
    <View style={styles.row}>
      {sortForHand(hand, trump).map((card) => {
        const enabled = onPlay !== null && playable.includes(card);
        return (
          <CardView
            key={card}
            card={card}
            size="md"
            dimmed={onPlay !== null && !enabled}
            raised={enabled}
            onPress={enabled ? () => onPlay(card) : undefined}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: spacing.xs,
    paddingTop: spacing.md,
    minHeight: 104,
  },
  empty: { ...typography.body, color: colors.inkMuted, textAlign: "center", paddingVertical: spacing.xl },
});
