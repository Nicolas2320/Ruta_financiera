import type { ComponentType } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { colors, radius, spacing } from "../constants/theme";

type ButtonVariant = "primary" | "secondary";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: ButtonVariant;
  icon?: ComponentType<IconProps> | null;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  accessibilityLabel,
  variant = "primary",
  icon: Icon = ArrowRight,
  style
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  const contentColor = isPrimary ? colors.surface : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>
          {title}
        </Text>
        {Icon ? <Icon color={contentColor} size={18} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center"
  },
  text: {
    fontSize: 16,
    fontWeight: "700"
  } satisfies TextStyle,
  primaryText: {
    color: colors.surface
  },
  secondaryText: {
    color: colors.primary
  }
});
