import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { TEAMS, type Seat, type Team, seatsOfTeam } from "@/features/euchre/lib/types";
import { seatNamesOf } from "@/features/table/hooks/useTable";
import { SEAT_NAMES, TEAM_LABELS, teamNameOf } from "@/features/table/lib/seats";
import type { LobbySnapshot, PlayerSlot, SeatKind } from "@/features/table/transport/lib/protocol";
import { ActionButton } from "@/components/ActionButton";
import { colors, radius, spacing, typography } from "@/lib/theme";

const KIND_TAGS: Record<SeatKind, string> = {
  host: "host",
  human: "player",
  bot: "bot",
  open: "empty",
};

const MAX_NAME = 16;

type SeatActionsProps = {
  player: PlayerSlot;
  /** The seat waiting for a partner to swap with, or null when none is picked. */
  moving: Seat | null;
  canMove: boolean;
  onAddBot?: (seat: Seat) => void;
  onRemoveBot?: (seat: Seat) => void;
  onPick: () => void;
  onDrop: () => void;
};

const SeatActions = ({
  player,
  moving,
  canMove,
  onAddBot,
  onRemoveBot,
  onPick,
  onDrop,
}: SeatActionsProps) => {
  if (moving === player.seat)
    return <ActionButton label="Cancel" tone="ghost" compact onPress={onDrop} />;
  if (moving !== null)
    return canMove ? (
      <ActionButton label="Swap here" tone="secondary" compact onPress={onDrop} />
    ) : null;
  return (
    <>
      {player.kind === "bot" && onRemoveBot !== undefined ? (
        <ActionButton
          label="Remove"
          tone="ghost"
          compact
          onPress={() => onRemoveBot(player.seat)}
        />
      ) : null}
      {player.kind !== "bot" &&
      player.kind !== "host" &&
      !player.connected &&
      onAddBot !== undefined ? (
        <ActionButton
          label="Add bot"
          tone="secondary"
          compact
          onPress={() => onAddBot(player.seat)}
        />
      ) : null}
      {canMove && player.kind !== "open" ? (
        <ActionButton label="Move" tone="ghost" compact onPress={onPick} />
      ) : null}
    </>
  );
};

type SeatListProps = {
  lobby: LobbySnapshot;
  mySeat: Seat | null;
  /** Host only. Omitted for a client, which cannot change the seating. */
  onAddBot?: (seat: Seat) => void;
  onRemoveBot?: (seat: Seat) => void;
  onRename?: (seat: Seat, name: string) => void;
  onSwap?: (from: Seat, to: Seat) => void;
  /** The seats `onRename` accepts. */
  renamable?: readonly Seat[];
  /** The seats `onSwap` accepts. */
  swappable?: readonly Seat[];
};

export const SeatList = ({
  lobby,
  mySeat,
  onAddBot,
  onRemoveBot,
  onRename,
  onSwap,
  renamable = [],
  swappable = [],
}: SeatListProps) => {
  const [moving, setMoving] = useState<Seat | null>(null);
  const names = seatNamesOf(lobby);

  const drop = (seat: Seat): void => {
    if (moving !== null && moving !== seat) onSwap?.(moving, seat);
    setMoving(null);
  };

  return (
    <View style={styles.teams}>
      {TEAMS.map((team: Team) => (
        <View key={team} style={styles.team}>
          <View style={styles.teamHead}>
            <Text style={styles.teamLabel}>{TEAM_LABELS[team]}</Text>
            <Text numberOfLines={1} style={styles.teamNames}>
              {teamNameOf(team, names)}
            </Text>
          </View>
          {seatsOfTeam(team).map((seat) => {
            const player = lobby.players.find((slot) => slot.seat === seat);
            if (player === undefined) return null;
            return (
              <View
                key={seat}
                style={[styles.row, seat === mySeat && styles.mine, seat === moving && styles.moving]}
              >
                <View style={[styles.dot, player.connected && styles.dotOn]} />
                {onRename !== undefined && renamable.includes(seat) ? (
                  <TextInput
                    style={[styles.name, styles.nameInput]}
                    value={player.name}
                    onChangeText={(next) => onRename(seat, next)}
                    onEndEditing={(event) => {
                      if (event.nativeEvent.text.trim() === "") onRename(seat, SEAT_NAMES[seat]);
                    }}
                    selectTextOnFocus
                    maxLength={MAX_NAME}
                  />
                ) : (
                  <Text style={styles.name}>{player.name}</Text>
                )}
                <Text style={styles.tag}>
                  {[KIND_TAGS[player.kind], seat === mySeat ? "you" : null]
                    .filter((tag) => tag !== null)
                    .join(" · ")}
                </Text>
                <SeatActions
                  player={player}
                  moving={moving}
                  canMove={onSwap !== undefined && swappable.includes(seat)}
                  onAddBot={onAddBot}
                  onRemoveBot={onRemoveBot}
                  onPick={() => setMoving(seat)}
                  onDrop={() => drop(seat)}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  teams: { gap: spacing.lg },
  team: { gap: spacing.sm },
  teamHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  teamLabel: { ...typography.label, color: colors.accent, fontSize: 10 },
  teamNames: { ...typography.label, color: colors.inkDim, fontSize: 10, flex: 1 },
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
  moving: { borderColor: colors.good, borderStyle: "dashed" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.inkDim },
  dotOn: { backgroundColor: colors.good },
  name: { ...typography.body, color: colors.ink, flex: 1 },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 2,
  },
  tag: { ...typography.label, color: colors.inkMuted, fontSize: 10 },
});
