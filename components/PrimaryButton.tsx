import type { ComponentType } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type ButtonVariant = "danger" | "primary" | "secondary";
type ButtonSize = "compact" | "default";

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
  iconPosition?: "inline" | "right";
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  accessibilityLabel,
  variant = "primary",
  icon: Icon = ArrowRight,
  iconPosition = "inline",
  size = "default",
  style,
  disabled = false
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const hasTrailingIcon = Boolean(Icon && iconPosition === "right");
  const contentColor = disabled
    ? colors.textSubtle
    : isPrimary
      ? colors.surface
      : isDanger
        ? colors.danger
        : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === "compact" && styles.compact,
        isPrimary && styles.primary,
        variant === "secondary" && styles.secondary,
        isDanger && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <View style={[styles.content, hasTrailingIcon && styles.contentWithTrailingIcon]}>
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            variant === "secondary" && styles.secondaryText,
            isDanger && styles.dangerText,
            hasTrailingIcon && styles.trailingText,
            disabled && styles.disabledText
          ]}
        >
          {title}
        </Text>
        {Icon ? (
          <View style={hasTrailingIcon && styles.trailingIcon}>
            <Icon color={contentColor} size={20} strokeWidth={2.4} />
          </View>
        ) : null}
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
  compact: {
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabledBorder,
    opacity: 0.86
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
  contentWithTrailingIcon: {
    alignSelf: "stretch",
    position: "relative"
  },
  trailingIcon: {
    position: "absolute",
    right: 0
  },
  text: {
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  } satisfies TextStyle,
  trailingText: {
    paddingHorizontal: spacing.xl
  },
  primaryText: {
    color: colors.surface
  },
  secondaryText: {
    color: colors.primary
  },
  dangerText: {
    color: colors.danger
  },
  disabledText: {
    color: colors.textSubtle
  }
});
