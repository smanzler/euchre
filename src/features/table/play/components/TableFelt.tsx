import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CompletedTrick, Seat } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { CardView } from "./CardView";
import { SeatSpot } from "./SeatSpot";
import type { Point, TrickSweep } from "./TrickCard";

type Anchors = Partial<Record<Seat, Point>>;

/** Null until every card of the trick knows where it is, and where it must go. */
const sweepsFor = (settled: CompletedTrick, anchors: Anchors): Map<Seat, TrickSweep> | null => {
  const pile = anchors[settled.winner];
  if (pile === undefined) return null;
  const sweeps = new Map<Seat, TrickSweep>();
  settled.plays.forEach((play, order) => {
    const from = anchors[play.seat];
    if (from === undefined) return;
    sweeps.set(play.seat, {
      toX: pile.x - from.x,
      toY: pile.y - from.y,
      order,
      count: settled.plays.length,
    });
  });
  return sweeps.size === settled.plays.length ? sweeps : null;
};

type TableFeltProps = {
  view: PlayerView;
  names: Record<Seat, string>;
};

const FeltCentre = ({
  view,
  names,
  settledBy,
}: {
  view: PlayerView;
  names: Record<Seat, string>;
  settledBy: string | null;
}) => {
  if (settledBy !== null) return <Text style={styles.trickWinner}>{settledBy} took it</Text>;
  // A dimmed upcard is the suit the table turned down and may not name.
  if (view.upcard !== null) {
    return <CardView card={view.upcard} size="md" dimmed={view.phase === "bidding-call"} />;
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
  const [anchors, setAnchors] = useState<Anchors>({});

  const setAnchor = useCallback((seat: Seat, point: Point): void => {
    setAnchors((current) => {
      const held = current[seat];
      const same =
        held !== undefined && Math.abs(held.x - point.x) < 1 && Math.abs(held.y - point.y) < 1;
      return same ? current : { ...current, [seat]: point };
    });
  }, []);

  // The trick clears the moment it is won, so keep the last one on the felt.
  const settled = view.trick.length === 0 ? view.lastTrick : null;
  const plays = settled === null ? view.trick : settled.plays;
  const played = new Map(plays.map((play) => [play.seat, play.card]));
  const sweeps = settled === null ? null : sweepsFor(settled, anchors);

  const spotAt = (clockwise: Seat) => {
    const seat = ((view.seat + clockwise) % 4) as Seat;
    return (
      <SeatSpot
        name={names[seat]}
        cardsHeld={view.handSizes[seat]}
        played={played.get(seat) ?? null}
        sweep={sweeps?.get(seat) ?? null}
        onCardAnchor={(point) => setAnchor(seat, point)}
        onTurn={settled === null && view.turn === seat}
        wonTrick={settled !== null && settled.winner === seat}
        sittingOut={view.sittingOut === seat}
        isDealer={view.dealer === seat}
        called={
          view.maker === seat && view.trump !== null
            ? { trump: view.trump, alone: view.aloneSeat === seat }
            : null
        }
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
    backgroundColor: colors.felt,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.feltEdge,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: "space-between",
  },
  // A card sweeps over the middle of the felt, so keep the ends above it.
  band: { alignItems: "center", zIndex: 1 },
  middle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  centreLabel: { ...typography.label, color: colors.inkMuted, textAlign: "center" },
  trickWinner: { ...typography.body, fontWeight: "800", color: colors.good, textAlign: "center" },
});
