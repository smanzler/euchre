import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";

type PanelProps = {
  title?: string;
  children: ReactNode;
};

export const Panel = ({ title, children }: PanelProps) => (
  <View style={styles.panel}>
    {title === undefined ? null : <Text style={styles.title}>{title.toUpperCase()}</Text>}
    {children}
  </View>
);

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.label, color: colors.inkMuted },
});
