import type { ImageSourcePropType, ImageStyle, StyleProp } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

type HeroInfoCardProps = {
  image: ImageSourcePropType;
  title: string;
  text: string;
  badge: string;
  imageStyle?: StyleProp<ImageStyle>;
};

export function HeroInfoCard({ image, title, text, badge, imageStyle }: HeroInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={image}
          style={[styles.image, imageStyle]}
        />

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>

      <View style={styles.badge}>
        <ShieldCheck color={colors.support} size={17} strokeWidth={2.5} />
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  image: {
    height: 116,
    width: 118
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderRadius: 13,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  badgeText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  }
});
