import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Panel } from "@/components/Panel";
import { Screen } from "@/components/Screen";
import type { Seat } from "@/features/euchre/lib/types";
import { seatNamesOf, useTable } from "@/features/table/hooks/useTable";
import { tableStore } from "@/features/table/lib/tableStore";
import type { PlayerIntent } from "@/features/table/transport/lib/protocol";
import { colors, spacing, typography } from "@/lib/theme";
import { HandRow } from "../components/HandRow";
import { HandoffGate } from "../components/HandoffGate";
import { Scoreboard } from "../components/Scoreboard";
import { TableFelt } from "../components/TableFelt";
import { TableMenu } from "../components/TableMenu";
import { panelFor } from "../lib/phasePanels";

/** The felt and the hand keep their place, so only this band changes with the phase. */
const ACTION_HEIGHT = 148;

export const PlayScreen = () => {
  const router = useRouter();
  const table = useTable();
  const [revealed, setRevealed] = useState<Seat | null>(null);
  const names = useMemo(() => seatNamesOf(table.lobby), [table.lobby]);
  const view = table.view;

  const leave = (): void => {
    void tableStore.leave();
    router.dismissTo("/");
  };

  /** Leaves the table open behind the menu. */
  const toMenu = (): void => router.dismissTo("/");

  const topBar = (
    <View style={styles.topBar}>
      <Text numberOfLines={1} style={styles.tableName}>
        {table.lobby?.tableName ?? "Table"}
      </Text>
      <TableMenu onMenu={toMenu} onLeave={leave} />
    </View>
  );

  if (view === null) {
    return (
      <Screen>
        {topBar}
        <Panel title="Waiting">
          <Text style={styles.note}>Waiting for the host to deal.</Text>
          <ActionButton label="Leave the table" tone="ghost" onPress={leave} />
        </Panel>
      </Screen>
    );
  }

  const sharedDevice = table.controlledSeats.length > 1;
  if (sharedDevice && revealed !== view.seat) {
    return (
      <Screen>
        {topBar}
        <HandoffGate name={names[view.seat]} onReveal={() => setRevealed(view.seat)} />
      </Screen>
    );
  }

  const panel = panelFor(view.phase);
  const canAct =
    table.controlledSeats.includes(view.seat) &&
    (panel.actableOffTurn || view.turn === view.seat);
  const cardIntent = panel.cardIntent;
  const Controls = panel.Controls;

  const status = panel.status(view, names);

  const send = (intent: PlayerIntent): void => {
    tableStore.submit(view.seat, intent);
  };

  return (
    <Screen>
      {topBar}
      <Scoreboard view={view} names={names} />
      <TableFelt view={view} names={names} />

      <View style={styles.action}>
        <ScrollView contentContainerStyle={styles.actionBody}>
          {status === null ? null : <Text style={styles.statusText}>{status}</Text>}
          {table.error === null ? null : (
            <Text style={styles.error} onPress={() => tableStore.clearError()}>
              {table.error}
            </Text>
          )}
          {canAct && Controls !== null ? (
            <Controls view={view} names={names} onIntent={send} />
          ) : null}
          {view.phase === "game-over" ? (
            <View style={styles.endRow}>
              {table.mode === "hosting" ? (
                <ActionButton label="Play again" onPress={() => tableStore.restart()} />
              ) : null}
              <ActionButton label="Leave" tone="secondary" onPress={leave} />
            </View>
          ) : null}
        </ScrollView>
      </View>

      <HandRow
        hand={view.hand}
        trump={view.trump}
        playable={canAct && cardIntent !== null ? panel.playable(view) : []}
        onPlay={canAct && cardIntent !== null ? (card) => send(cardIntent(card)) : null}
        note={view.sittingOut === view.seat ? "You sit this hand out." : null}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tableName: { ...typography.heading, color: colors.ink, flex: 1 },
  action: { height: ACTION_HEIGHT },
  actionBody: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  statusText: { ...typography.heading, color: colors.ink, textAlign: "center" },
  note: { ...typography.body, color: colors.inkMuted },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
  endRow: { flexDirection: "row", gap: spacing.md, justifyContent: "center" },
});
