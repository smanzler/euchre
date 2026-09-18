import { StyleSheet, Text, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { colors, spacing, typography } from "@/lib/theme";

type HandoffGateProps = {
  name: string;
  onReveal: () => void;
};

export const HandoffGate = ({ name, onReveal }: HandoffGateProps) => (
  <View style={styles.gate}>
    <Text style={styles.label}>PASS THE DEVICE TO</Text>
    <Text style={styles.name}>{name}</Text>
    <ActionButton label={`I am ${name}`} onPress={onReveal} />
  </View>
);

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  label: { ...typography.label, color: colors.inkMuted },
  name: { ...typography.title, color: colors.accent },
});
