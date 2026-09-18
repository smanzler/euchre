import { StyleSheet, Text, View } from "react-native";
import type { LobbySnapshot } from "@/features/table/transport/lib/protocol";
import { colors, radius, spacing, typography } from "@/lib/theme";

type SeatListProps = {
  lobby: LobbySnapshot;
  mySeat: number | null;
};

export const SeatList = ({ lobby, mySeat }: SeatListProps) => (
  <View style={styles.list}>
    {lobby.players.map((player) => (
      <View key={player.seat} style={[styles.row, player.seat === mySeat && styles.mine]}>
        <View style={[styles.dot, player.connected && styles.dotOn]} />
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.tag}>
          {[player.isHost ? "host" : null, player.seat === mySeat ? "you" : null]
            .filter((tag) => tag !== null)
            .join(" · ")}
        </Text>
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
