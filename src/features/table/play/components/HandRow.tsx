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

/** A card keeps the width of a full hand, so the row never resizes as it empties. */
const HAND_SLOTS = 5;

type HandRowProps = {
  hand: readonly Card[];
  trump: Suit | null;
  playable: readonly Card[];
  onPlay: ((card: Card) => void) | null;
  /** Shown in place of the cards when the hand is empty. */
  note?: string | null;
};

export const HandRow = ({ hand, trump, playable, onPlay, note = null }: HandRowProps) => {
  const { width } = useWindowDimensions();
  const spare = width - SIDE_PADDING - GAP * (HAND_SLOTS - 1);
  const box = cardBoxOfWidth(Math.min(MAX_CARD_WIDTH, Math.floor(spare / HAND_SLOTS)));
  return (
    <View style={[styles.row, { height: box.height + RAISE }]}>
      {hand.length === 0
        ? note === null
          ? null
          : <Text style={styles.empty}>{note}</Text>
        : sortForHand(hand, trump).map((card) => {
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
  },
  empty: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: "center",
    alignSelf: "center",
  },
});
