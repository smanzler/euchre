import { StyleSheet, Text, View } from "react-native";
import type { Card } from "@/features/euchre/lib/cards";
import { sortForHand } from "@/features/euchre/lib/trick";
import type { Suit } from "@/features/euchre/lib/cards";
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
      {sortForHand(hand, trump).map((card, index) => {
        const enabled = onPlay !== null && playable.includes(card);
        return (
          <View key={card} style={index === 0 ? undefined : styles.overlap}>
            <CardView
              card={card}
              size="lg"
              dimmed={onPlay !== null && !enabled}
              raised={enabled}
              onPress={enabled ? () => onPlay(card) : undefined}
            />
          </View>
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
    paddingTop: spacing.md,
    minHeight: 104,
  },
  overlap: { marginLeft: -14 },
  empty: { ...typography.body, color: colors.inkMuted, textAlign: "center", paddingVertical: spacing.xl },
});
