import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/lib/theme";

const SIZE = 20;

/** The button that marks who deals, as it sits on a real table. */
export const DealerChip = () => (
  <View accessibilityLabel="dealer" style={styles.chip}>
    <Text style={styles.letter}>D</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accentInk,
    lineHeight: 13,
  },
});
