import { Pressable, StyleSheet, Text } from "react-native";
import { type Suit, colorOf, suitName, suitSymbol } from "@/features/euchre/lib/cards";
import { colors, radius } from "@/lib/theme";

const SIZE = 60;

type SuitButtonProps = {
  suit: Suit;
  onPress: () => void;
};

/** Names a suit with the mark alone, the way it reads on a card. */
export const SuitButton = ({ suit, onPress }: SuitButtonProps) => {
  const ink = colorOf(suit) === "red" ? colors.red : colors.black;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suitName(suit)}
      onPress={onPress}
      style={({ pressed }) => [styles.face, pressed && styles.pressed]}
    >
      <Text style={[styles.symbol, { color: ink }]}>{suitSymbol(suit)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  face: {
    width: SIZE,
    height: SIZE,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.cardEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7, borderColor: colors.accent },
  symbol: { fontSize: 32, lineHeight: 38 },
});
