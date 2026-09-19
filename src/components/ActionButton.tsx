import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";

export const BUTTON_TONES = ["primary", "secondary", "ghost", "danger"] as const;
export type ButtonTone = (typeof BUTTON_TONES)[number];

type ToneStyle = { box: ViewStyle; ink: string };

const tones: Record<ButtonTone, ToneStyle> = {
  primary: { box: { backgroundColor: colors.accent }, ink: colors.accentInk },
  secondary: {
    box: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
    ink: colors.ink,
  },
  ghost: { box: { backgroundColor: "transparent" }, ink: colors.inkMuted },
  danger: { box: { backgroundColor: colors.danger }, ink: colors.ink },
};

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  compact?: boolean;
  /** Fills the width of the row it sits in. */
  wide?: boolean;
};

export const ActionButton = ({
  label,
  onPress,
  tone = "primary",
  disabled = false,
  compact = false,
  wide = false,
}: ActionButtonProps) => {
  const style = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        wide && styles.wide,
        style.box,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: style.ink }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  wide: { alignSelf: "stretch" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  label: { ...typography.body, fontWeight: "700" },
});
