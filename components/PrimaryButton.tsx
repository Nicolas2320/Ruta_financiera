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
  iconPosition?: "inline" | "right";
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
  style,
  disabled = false
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  const hasTrailingIcon = Boolean(Icon && iconPosition === "right");
  const contentColor = disabled ? colors.textSubtle : isPrimary ? colors.surface : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <View style={[styles.content, hasTrailingIcon && styles.contentWithTrailingIcon]}>
        <Text
          style={[
            styles.text,
            isPrimary ? styles.primaryText : styles.secondaryText,
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
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  disabled: {
    backgroundColor: "#E2E8F0",
    borderColor: colors.border,
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
    fontSize: 16,
    fontWeight: "700"
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
  disabledText: {
    color: colors.textSubtle
  }
});
