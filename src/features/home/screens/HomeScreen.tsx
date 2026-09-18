import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Panel } from "@/components/Panel";
import { Screen } from "@/components/Screen";
import { tableStore } from "@/features/table/lib/tableStore";
import { profileStore, useDisplayName } from "@/lib/profile";
import { colors, radius, spacing, typography } from "@/lib/theme";

export const HomeScreen = () => {
  const router = useRouter();
  const displayName = useDisplayName();
  const [tableName, setTableName] = useState("Kitchen table");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bleHost = tableStore.driverFor("ble-host");
  const hostBlocked = bleHost.unavailableReason();

  const open = async (kind: "local" | "ble-host"): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await tableStore.host({ kind, tableName, displayName });
      router.push("/lobby");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Euchre</Text>
        <Text style={styles.subtitle}>Four players, twenty four cards, bowers and all.</Text>
      </View>

      <Panel title="You">
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={profileStore.setName}
          placeholder="Your name"
          placeholderTextColor={colors.inkDim}
          maxLength={16}
        />
      </Panel>

      <Panel title="Start a table">
        <TextInput
          style={styles.input}
          value={tableName}
          onChangeText={setTableName}
          placeholder="Table name"
          placeholderTextColor={colors.inkDim}
          maxLength={20}
        />
        <ActionButton
          label="Host over Bluetooth"
          disabled={busy || hostBlocked !== null}
          onPress={() => void open("ble-host")}
        />
        {hostBlocked === null ? null : <Text style={styles.note}>{hostBlocked}</Text>}
        <ActionButton
          label="Pass and play on this device"
          tone="secondary"
          disabled={busy}
          onPress={() => void open("local")}
        />
      </Panel>

      <Panel title="Join a table">
        <ActionButton
          label="Find nearby tables"
          tone="secondary"
          disabled={busy}
          onPress={() => router.push("/join")}
        />
      </Panel>

      {error === null ? null : <Text style={styles.error}>{error}</Text>}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.xl },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  note: { ...typography.body, color: colors.inkDim, fontSize: 13 },
  error: { ...typography.body, color: colors.danger },
});
