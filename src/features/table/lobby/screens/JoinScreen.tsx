import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Panel } from "@/components/Panel";
import { Screen } from "@/components/Screen";
import { tableStore } from "@/features/table/lib/tableStore";
import type { FoundTable } from "@/features/table/transport/ble/lib/discovery";
import { scanForTables } from "@/features/table/transport/ble/lib/discovery";
import { useDisplayName } from "@/lib/profile";
import { colors, radius, spacing, typography } from "@/lib/theme";

export const JoinScreen = () => {
  const router = useRouter();
  const displayName = useDisplayName();
  const [tables, setTables] = useState<FoundTable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const blocked = tableStore.driverFor("ble-client").unavailableReason();

  useEffect(() => {
    if (blocked !== null) return;
    const stop = scanForTables({
      onFound: (table) =>
        setTables((current) =>
          current.some((known) => known.id === table.id) ? current : [...current, table],
        ),
      onError: setError,
    });
    return stop;
  }, [blocked]);

  const join = useCallback(
    async (table: FoundTable): Promise<void> => {
      setJoining(table.id);
      setError(null);
      try {
        await tableStore.join({ deviceId: table.id, displayName });
        router.replace("/lobby");
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setJoining(null);
      }
    },
    [displayName, router],
  );

  return (
    <Screen scroll>
      <Text style={styles.title}>Nearby tables</Text>
      <Panel title="Bluetooth">
        {blocked !== null ? (
          <Text style={styles.note}>{blocked}</Text>
        ) : tables.length === 0 ? (
          <View style={styles.searching}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.note}>Looking for a host nearby…</Text>
          </View>
        ) : (
          tables.map((table) => (
            <Pressable
              key={table.id}
              accessibilityRole="button"
              disabled={joining !== null}
              onPress={() => void join(table)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.name}>{table.name}</Text>
              <Text style={styles.tag}>{joining === table.id ? "joining…" : "tap to join"}</Text>
            </Pressable>
          ))
        )}
      </Panel>
      {error === null ? null : <Text style={styles.error}>{error}</Text>}
      <ActionButton label="Back" tone="ghost" onPress={() => router.back()} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.ink, paddingTop: spacing.md },
  note: { ...typography.body, color: colors.inkMuted },
  searching: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  name: { ...typography.body, color: colors.ink },
  tag: { ...typography.label, color: colors.inkMuted, fontSize: 10 },
  error: { ...typography.body, color: colors.danger },
});
