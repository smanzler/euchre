import { StyleSheet, Text, View } from "react-native";
import type { Card } from "@/features/euchre/lib/cards";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { CardView } from "./CardView";

/** Enough of a card back to read the count without taking a seat's width. */
const BACK_OVERLAP = -22;

type SeatSpotProps = {
  name: string;
  cardsHeld: number;
  played: Card | null;
  onTurn: boolean;
  wonTrick: boolean;
  sittingOut: boolean;
  /** The seat the device belongs to holds its cards in the hand row. */
  hideBacks?: boolean;
};

export const SeatSpot = ({
  name,
  cardsHeld,
  played,
  onTurn,
  wonTrick,
  sittingOut,
  hideBacks = false,
}: SeatSpotProps) => (
  <View style={styles.spot}>
    <Text style={[styles.name, onTurn && styles.onTurn, wonTrick && styles.winner]}>{name}</Text>
    {played !== null ? (
      <CardView card={played} size="lg" dimmed={!wonTrick && sittingOut} />
    ) : sittingOut ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>out</Text>
      </View>
    ) : hideBacks ? (
      <View style={styles.empty} />
    ) : (
      <View style={styles.backs}>
        {Array.from({ length: cardsHeld }, (_unused, index) => (
          <View key={index} style={index === 0 ? undefined : styles.overlap}>
            <CardView card="9C" size="sm" faceDown />
          </View>
        ))}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  spot: { alignItems: "center", gap: spacing.xs, minHeight: 112 },
  name: { ...typography.label, color: colors.inkDim },
  onTurn: { color: colors.accent },
  winner: { color: colors.good },
  backs: { flexDirection: "row", height: 48, alignItems: "center" },
  overlap: { marginLeft: BACK_OVERLAP },
  empty: {
    width: 48,
    height: 68,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.feltEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { ...typography.label, color: colors.inkDim },
});
