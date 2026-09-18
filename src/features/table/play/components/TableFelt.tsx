import { StyleSheet, Text, View } from "react-native";
import { suitSymbol } from "@/features/euchre/lib/cards";
import type { Seat } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { type SeatPosition, positionOf } from "@/features/table/lib/seats";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { CardView } from "./CardView";

type TableFeltProps = {
  view: PlayerView;
  names: Record<Seat, string>;
};

const slotStyles: Record<SeatPosition, object> = {
  bottom: { bottom: spacing.sm, alignSelf: "center" },
  left: { left: spacing.sm, top: "40%" },
  top: { top: spacing.sm, alignSelf: "center" },
  right: { right: spacing.sm, top: "40%" },
};

export const TableFelt = ({ view, names }: TableFeltProps) => {
  const played = new Map(view.trick.map((play) => [play.seat, play.card]));
  return (
    <View style={styles.felt}>
      {([0, 1, 2, 3] as Seat[]).map((seat) => {
        const position = positionOf(seat, view.seat);
        const card = played.get(seat);
        const isOut = view.sittingOut === seat;
        return (
          <View key={seat} style={[styles.slot, slotStyles[position]]}>
            <Text style={[styles.name, view.turn === seat && styles.nameOnTurn]}>
              {names[seat]}
              {view.dealer === seat ? "  (D)" : ""}
            </Text>
            {card !== undefined ? (
              <CardView card={card} size="md" />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  {isOut ? "out" : `${view.handSizes[seat]}`}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      <View style={styles.centre}>
        {view.trump === null ? (
          <Text style={styles.centreLabel}>no trump yet</Text>
        ) : (
          <Text style={styles.centreTrump}>{suitSymbol(view.trump)}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  felt: {
    flex: 1,
    minHeight: 260,
    backgroundColor: colors.felt,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.feltEdge,
    margin: spacing.xs,
  },
  slot: { position: "absolute", alignItems: "center", gap: spacing.xs },
  name: { ...typography.label, color: colors.inkDim },
  nameOnTurn: { color: colors.accent },
  placeholder: {
    width: 48,
    height: 68,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.feltEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { ...typography.label, color: colors.inkDim },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  centreLabel: { ...typography.label, color: colors.inkDim },
  centreTrump: { fontSize: 44, color: colors.accent },
});
