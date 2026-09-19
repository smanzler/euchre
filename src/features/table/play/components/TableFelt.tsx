import { StyleSheet, Text, View } from "react-native";
import { suitSymbol } from "@/features/euchre/lib/cards";
import { SEATS, type Seat } from "@/features/euchre/lib/types";
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

/** The upcard sits on the felt while it can still be taken or turned down. */
const FeltCentre = ({
  view,
  settledBy,
}: {
  view: PlayerView;
  settledBy: string | null;
}) => {
  if (settledBy !== null) return <Text style={styles.centreLabel}>{settledBy} took it</Text>;
  if (view.upcard !== null) {
    const turnedDown = view.phase === "bidding-call";
    return (
      <View style={styles.upcard}>
        <CardView card={view.upcard} size="md" dimmed={turnedDown} />
        <Text style={styles.centreLabel}>{turnedDown ? "turned down" : "turned up"}</Text>
      </View>
    );
  }
  if (view.trump === null) return <Text style={styles.centreLabel}>no trump yet</Text>;
  return <Text style={styles.centreTrump}>{suitSymbol(view.trump)}</Text>;
};

export const TableFelt = ({ view, names }: TableFeltProps) => {
  // The trick clears the moment it is won, so keep the last one on the felt.
  const settled = view.trick.length === 0 ? view.lastTrick : null;
  const plays = settled === null ? view.trick : settled.plays;
  const played = new Map(plays.map((play) => [play.seat, play.card]));

  return (
    <View style={styles.felt}>
      {SEATS.map((seat) => {
        const position = positionOf(seat, view.seat);
        const card = played.get(seat);
        const isOut = view.sittingOut === seat;
        const tookIt = settled !== null && settled.winner === seat;
        return (
          <View key={seat} style={[styles.slot, slotStyles[position]]}>
            <Text
              style={[
                styles.name,
                settled === null && view.turn === seat && styles.nameOnTurn,
                tookIt && styles.nameWinner,
              ]}
            >
              {names[seat]}
              {view.dealer === seat ? "  (D)" : ""}
            </Text>
            {card !== undefined ? (
              <CardView card={card} size="md" dimmed={settled !== null && !tookIt} />
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
        <FeltCentre view={view} settledBy={settled === null ? null : names[settled.winner]} />
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
  nameWinner: { color: colors.good },
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
  upcard: { alignItems: "center", gap: spacing.xs },
  centreLabel: { ...typography.label, color: colors.inkMuted },
  centreTrump: { fontSize: 44, color: colors.accent },
});
