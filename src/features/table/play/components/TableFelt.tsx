import { StyleSheet, Text, View } from "react-native";
import type { Seat } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { FlipCard } from "./FlipCard";
import { SeatSpot } from "./SeatSpot";

/** How far a settled trick travels toward the seat that took it. */
const GATHER_DISTANCE = 64;

/** Screen direction of each seat, clockwise from the device's own seat. */
const SEAT_DIRECTIONS: readonly { x: number; y: number }[] = [
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: 1, y: 0 },
];

type TableFeltProps = {
  view: PlayerView;
  names: Record<Seat, string>;
};

/** The upcard sits on the felt while it can still be taken or turned down. */
const FeltCentre = ({
  view,
  names,
  settledBy,
}: {
  view: PlayerView;
  names: Record<Seat, string>;
  settledBy: string | null;
}) => {
  if (settledBy !== null) return <Text style={styles.centreLabel}>{settledBy} took it</Text>;
  if (view.upcard !== null) {
    const turnedDown = view.phase === "bidding-call";
    return (
      <View style={styles.upcard}>
        <FlipCard card={view.upcard} size="md" dimmed={turnedDown} flipKey={view.handNumber} />
        <Text style={styles.centreLabel}>{turnedDown ? "turned down" : "turned up"}</Text>
      </View>
    );
  }
  if (view.trump === null) return <Text style={styles.centreLabel}>no trump yet</Text>;
  if (view.maker === null) return null;
  return (
    <Text style={styles.centreLabel}>
      {names[view.maker]} called it{view.aloneSeat === null ? "" : ", alone"}
    </Text>
  );
};

export const TableFelt = ({ view, names }: TableFeltProps) => {
  // The trick clears the moment it is won, so keep the last one on the felt.
  const settled = view.trick.length === 0 ? view.lastTrick : null;
  const plays = settled === null ? view.trick : settled.plays;
  const played = new Map(plays.map((play) => [play.seat, play.card]));

  const toWinner =
    settled === null
      ? { x: 0, y: 0 }
      : (SEAT_DIRECTIONS[(settled.winner - view.seat + 4) % 4] as { x: number; y: number });

  const spotAt = (clockwise: number) => {
    const seat = ((view.seat + clockwise) % 4) as Seat;
    return (
      <SeatSpot
        name={names[seat]}
        cardsHeld={view.handSizes[seat]}
        played={played.get(seat) ?? null}
        onTurn={settled === null && view.turn === seat}
        wonTrick={settled !== null && settled.winner === seat}
        sittingOut={view.sittingOut === seat}
        isDealer={view.dealer === seat}
        called={
          view.maker === seat && view.trump !== null
            ? { trump: view.trump, alone: view.aloneSeat === seat }
            : null
        }
        gatherX={toWinner.x * GATHER_DISTANCE}
        gatherY={toWinner.y * GATHER_DISTANCE}
        hideBacks={seat === view.seat}
      />
    );
  };

  return (
    <View style={styles.felt}>
      <View style={styles.band}>{spotAt(2)}</View>
      <View style={styles.middle}>
        {spotAt(1)}
        <View style={styles.centre}>
          <FeltCentre
            view={view}
            names={names}
            settledBy={settled === null ? null : names[settled.winner]}
          />
        </View>
        {spotAt(3)}
      </View>
      <View style={styles.band}>{spotAt(0)}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  felt: {
    flex: 1,
    minHeight: 320,
    backgroundColor: colors.felt,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.feltEdge,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: "space-between",
  },
  band: { alignItems: "center" },
  middle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  upcard: { alignItems: "center", gap: spacing.xs },
  centreLabel: { ...typography.label, color: colors.inkMuted, textAlign: "center" },
});
