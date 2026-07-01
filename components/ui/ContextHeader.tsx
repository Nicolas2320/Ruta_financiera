import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type ContextHeaderProps = {
  onBack: () => void;
  subtitle?: string;
  title: string;
};

export function ContextHeader({ onBack, subtitle, title }: ContextHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <ChevronLeft color={colors.text} size={21} strokeWidth={2.5} />
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  }
});
