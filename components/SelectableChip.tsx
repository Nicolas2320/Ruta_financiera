import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableChip({ label, selected, onPress }: SelectableChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed
      ]}
    >
      {selected ? <Check color={colors.primary} size={15} strokeWidth={2.7} /> : null}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  chipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }]
  },
  text: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  textSelected: {
    color: colors.primary
  }
});
