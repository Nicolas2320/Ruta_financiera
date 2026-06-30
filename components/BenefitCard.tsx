import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type BenefitCardProps = {
  title: string;
  text: string;
  icon: ComponentType<IconProps>;
  accent?: "blue" | "green" | "warm";
};

const accentStyles = {
  blue: {
    background: colors.primarySoft,
    foreground: colors.primary
  },
  green: {
    background: colors.supportSoft,
    foreground: colors.support
  },
  warm: {
    background: colors.warningSoft,
    foreground: "#B7791F"
  }
};

export function BenefitCard({ title, text, icon: Icon, accent = "blue" }: BenefitCardProps) {
  const accentStyle = accentStyles[accent];

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: accentStyle.background }]}>
        <Icon color={accentStyle.foreground} size={22} strokeWidth={2.3} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.option
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  }
});
