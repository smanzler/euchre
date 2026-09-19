import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Card, Suit } from "@/features/euchre/lib/cards";
import { sortForHand } from "@/features/euchre/lib/trick";
import { colors, spacing, typography } from "@/lib/theme";
import { CardView, cardBoxOfWidth } from "./CardView";

const GAP = spacing.xs;

/** The Screen component pads both sides. */
const SIDE_PADDING = spacing.lg * 2;

/** Past this a five card hand looks stretched rather than generous. */
const MAX_CARD_WIDTH = 78;

/** How far a playable card lifts out of the row. */
const RAISE = 12;

type HandRowProps = {
  hand: readonly Card[];
  trump: Suit | null;
  playable: readonly Card[];
  onPlay: ((card: Card) => void) | null;
};

export const HandRow = ({ hand, trump, playable, onPlay }: HandRowProps) => {
  const { width } = useWindowDimensions();
  if (hand.length === 0) {
    return <Text style={styles.empty}>You sit this hand out.</Text>;
  }
  const spare = width - SIDE_PADDING - GAP * (hand.length - 1);
  const box = cardBoxOfWidth(Math.min(MAX_CARD_WIDTH, Math.floor(spare / hand.length)));
  return (
    <View style={[styles.row, { minHeight: box.height + RAISE }]}>
      {sortForHand(hand, trump).map((card) => {
        const enabled = onPlay !== null && playable.includes(card);
        return (
          <CardView
            key={card}
            card={card}
            box={box}
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
    gap: GAP,
    paddingTop: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
