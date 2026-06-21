import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type SelectableCardVariant = "row" | "tile" | "center";

type SelectableCardProps = {
  title: string;
  selected: boolean;
  onPress: () => void;
  subtitle?: string;
  leading?: ReactNode;
  variant?: SelectableCardVariant;
  controlPosition?: "corner" | "middleRight";
  controlSize?: "default" | "large";
  showControl?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function SelectableCard({
  title,
  subtitle,
  selected,
  onPress,
  leading,
  variant = "row",
  controlPosition = "corner",
  controlSize = "default",
  showControl = true,
  style,
  titleStyle
}: SelectableCardProps) {
  const isTile = variant === "tile";
  const isCenter = variant === "center";
  const isLargeControl = controlSize === "large";

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isTile && styles.tile,
        isCenter && styles.center,
        selected && styles.selected,
        pressed && styles.pressed,
        style
      ]}
    >
      {leading ? <View style={[styles.leading, isCenter && styles.centerLeading]}>{leading}</View> : null}

      <View style={[styles.copy, (isTile || isCenter) && styles.tileCopy]}>
        <Text
          style={[
            styles.title,
            (isTile || isCenter) && styles.tileTitle,
            selected && styles.selectedText,
            titleStyle
          ]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {showControl ? (
        <View
          style={[
            styles.controlShell,
            (isTile || isCenter) && styles.floatingControlShell,
            controlPosition === "middleRight" && styles.middleRightControlShell
          ]}
        >
          <View
            style={[
              styles.control,
              isLargeControl && styles.controlLarge,
              selected && styles.controlSelected
            ]}
          >
            {selected ? (
              <Check
                color={colors.surface}
                size={isLargeControl ? 25 : 15}
                strokeWidth={3}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 47,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  tile: {
    alignItems: "center",
    flex: 1,
    flexDirection: "column",
    minHeight: 112,
    padding: spacing.sm
  },
  center: {
    alignItems: "center",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 74,
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
    transform: [{ scale: 0.99 }]
  },
  leading: {
    alignItems: "center",
    justifyContent: "center"
  },
  centerLeading: {
    marginBottom: spacing.xs
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  tileCopy: {
    alignItems: "center",
    flex: 0,
    width: "100%"
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  tileTitle: {
    textAlign: "center"
  },
  selectedText: {
    color: colors.primary
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  controlShell: {
    alignItems: "center",
    justifyContent: "center"
  },
  control: {
    alignItems: "center",
    borderColor: "#C8D6EA",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 21,
    justifyContent: "center",
    width: 21
  },
  controlLarge: {
    borderWidth: 2,
    height: 36,
    width: 36
  },
  controlSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  floatingControlShell: {
    position: "absolute",
    right: 12,
    top: 12
  },
  middleRightControlShell: {
    bottom: 0,
    right: 5,
    top: 0,
    width: 40
  }
});
