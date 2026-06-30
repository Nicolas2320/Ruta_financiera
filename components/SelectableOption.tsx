import { CheckCircle2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type SelectableOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableOption({ label, selected, onPress }: SelectableOptionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed
      ]}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
      {selected ? (
        <CheckCircle2 color={colors.primary} size={20} strokeWidth={2.5} />
      ) : (
        <View style={styles.optionDot} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  optionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.primary
  },
  optionDot: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 20,
    width: 20
  }
});
