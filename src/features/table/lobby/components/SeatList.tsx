import { StyleSheet, Text, View } from "react-native";
import type { Seat } from "@/features/euchre/lib/types";
import type { LobbySnapshot, SeatKind } from "@/features/table/transport/lib/protocol";
import { ActionButton } from "@/components/ActionButton";
import { colors, radius, spacing, typography } from "@/lib/theme";

const KIND_TAGS: Record<SeatKind, string> = {
  host: "host",
  human: "player",
  bot: "bot",
  open: "empty",
};

type SeatListProps = {
  lobby: LobbySnapshot;
  mySeat: Seat | null;
  /** Host only. Omitted for a client, which cannot change the seating. */
  onAddBot?: (seat: Seat) => void;
  onRemoveBot?: (seat: Seat) => void;
};

export const SeatList = ({ lobby, mySeat, onAddBot, onRemoveBot }: SeatListProps) => (
  <View style={styles.list}>
    {lobby.players.map((player) => (
      <View key={player.seat} style={[styles.row, player.seat === mySeat && styles.mine]}>
        <View style={[styles.dot, player.connected && styles.dotOn]} />
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.tag}>
          {[KIND_TAGS[player.kind], player.seat === mySeat ? "you" : null]
            .filter((tag) => tag !== null)
            .join(" · ")}
        </Text>
        {player.kind === "bot" && onRemoveBot !== undefined ? (
          <ActionButton
            label="Remove"
            tone="ghost"
            compact
            onPress={() => onRemoveBot(player.seat)}
          />
        ) : null}
        {player.kind !== "bot" && player.kind !== "host" && !player.connected && onAddBot !== undefined ? (
          <ActionButton
            label="Add bot"
            tone="secondary"
            compact
            onPress={() => onAddBot(player.seat)}
          />
        ) : null}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mine: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.inkDim },
  dotOn: { backgroundColor: colors.good },
  name: { ...typography.body, color: colors.ink, flex: 1 },
  tag: { ...typography.label, color: colors.inkMuted, fontSize: 10 },
});
