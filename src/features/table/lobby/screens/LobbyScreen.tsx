import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Panel } from "@/components/Panel";
import { Screen } from "@/components/Screen";
import { useTable } from "@/features/table/hooks/useTable";
import { tableStore } from "@/features/table/lib/tableStore";
import { colors, spacing, typography } from "@/lib/theme";
import { SeatList } from "../components/SeatList";

const STATUS_TEXT = {
  idle: "Not connected",
  starting: "Starting…",
  ready: "Ready",
  stopped: "Closed",
  error: "Something went wrong",
} as const;

export const LobbyScreen = () => {
  const router = useRouter();
  const table = useTable();

  useEffect(() => {
    if (table.started) router.replace("/play");
  }, [table.started, router]);

  const leave = (): void => {
    void tableStore.leave();
    router.dismissTo("/");
  };

  if (table.mode === "idle") {
    return (
      <Screen>
        <Panel title="No table">
          <Text style={styles.note}>This table is closed.</Text>
          <ActionButton label="Back" tone="secondary" onPress={() => router.dismissTo("/")} />
        </Panel>
      </Screen>
    );
  }

  const lobby = table.lobby;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{lobby?.tableName ?? "Table"}</Text>
        <Text style={styles.subtitle}>
          {STATUS_TEXT[table.status]}
          {table.statusDetail === null ? "" : ` — ${table.statusDetail}`}
        </Text>
      </View>

      <Panel title="Seats">
        {lobby === null ? (
          <Text style={styles.note}>Waiting for the host…</Text>
        ) : (
          <SeatList lobby={lobby} mySeat={table.seat} />
        )}
      </Panel>

      {table.mode === "hosting" ? (
        <Panel title="Start">
          <Text style={styles.note}>
            {table.canStart
              ? "Every seat is taken. Deal them in."
              : "Waiting for the other players to join."}
          </Text>
          <ActionButton
            label="Start the game"
            disabled={!table.canStart}
            onPress={() => tableStore.start()}
          />
        </Panel>
      ) : (
        <Panel title="Waiting">
          <Text style={styles.note}>The host starts the game when the table is full.</Text>
        </Panel>
      )}

      {table.error === null ? null : <Text style={styles.error}>{table.error}</Text>}
      <ActionButton label="Leave the table" tone="ghost" onPress={leave} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted },
  note: { ...typography.body, color: colors.inkMuted },
  error: { ...typography.body, color: colors.danger },
});
