import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type CategoryChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
};

export function CategoryChip({
  label,
  selected,
  onPress,
  icon: Icon,
  color,
  backgroundColor,
  style
}: CategoryChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
        style
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor }]}>
        <Icon color={color} size={20} strokeWidth={2.5} />
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {selected ? (
        <View style={styles.check}>
          <Check color={colors.surface} size={12} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#DDE8F7",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 82,
    minWidth: 86,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm
  },
  selected: {
    backgroundColor: "#F7FAFF",
    borderColor: colors.primary,
    borderWidth: 2
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }]
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 38
  },
  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  labelSelected: {
    color: colors.primary
  },
  check: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 18
  }
});
