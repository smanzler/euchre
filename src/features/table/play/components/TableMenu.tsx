import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { colors, radius, spacing, typography } from "@/lib/theme";

type TableMenuProps = {
  /** Leaves the table open, so the game can be picked up again. */
  onMenu: () => void;
  onLeave: () => void;
};

export const TableMenu = ({ onMenu, onLeave }: TableMenuProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="table menu"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerMark}>☰</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>TABLE</Text>
            <ActionButton label="Back to the game" wide onPress={() => setOpen(false)} />
            <ActionButton
              label="Go to the menu"
              tone="secondary"
              wide
              onPress={() => {
                setOpen(false);
                onMenu();
              }}
            />
            <Text style={styles.note}>The table keeps playing. Come back to it from the menu.</Text>
            <ActionButton
              label="Leave the table"
              tone="danger"
              wide
              onPress={() => {
                setOpen(false);
                onLeave();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  triggerMark: { fontSize: 18, color: colors.ink, lineHeight: 22 },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.label, color: colors.inkMuted },
  note: { ...typography.body, color: colors.inkDim, fontSize: 13, textAlign: "center" },
});
