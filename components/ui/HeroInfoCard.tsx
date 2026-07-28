import type { ImageSourcePropType, ImageStyle, StyleProp } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, shadows, spacing, typography } from "../../constants/theme";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

type HeroInfoCardProps = {
  image: ImageSourcePropType;
  title: string;
  text: string;
  badge: string;
  imageStyle?: StyleProp<ImageStyle>;
};

export function HeroInfoCard({ image, title, text, badge, imageStyle }: HeroInfoCardProps) {
  const { isPhone, isSmallPhone } = useResponsiveLayout();

  return (
    <View style={styles.card}>
      <View style={[styles.topRow, isSmallPhone && styles.topRowSmallPhone]}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={image}
          style={[
            styles.image,
            imageStyle,
            isPhone && styles.imagePhone,
            isSmallPhone && styles.imageSmallPhone
          ]}
        />

        <View style={styles.copy}>
          <Text style={[styles.title, isPhone && styles.titlePhone]}>{title}</Text>
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
  imagePhone: {
    height: 96,
    width: 96
  },
  imageSmallPhone: {
    alignSelf: "center",
    height: 104,
    width: 104
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
  titlePhone: {
    fontSize: typography.sectionTitle,
    lineHeight: typography.lineHeight.sectionTitle
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
  },
  topRowSmallPhone: {
    alignItems: "stretch",
    flexDirection: "column"
  }
});
