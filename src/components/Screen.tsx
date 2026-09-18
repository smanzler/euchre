import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/lib/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export const Screen = ({ children, scroll = false }: ScreenProps) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
    {scroll ? (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    ) : (
      <View style={styles.plain}>{children}</View>
    )}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.feltDeep },
  scroll: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  plain: { flex: 1, padding: spacing.lg, gap: spacing.md },
});
