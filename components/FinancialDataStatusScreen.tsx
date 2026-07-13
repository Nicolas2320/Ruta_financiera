import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AlertCircle } from "lucide-react-native";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";

export function FinancialDataStatusScreen({
  mode = "loading",
  text,
  title
}: {
  mode?: "loading" | "error";
  text: string;
  title: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View accessibilityLiveRegion="polite" style={styles.centeredState}>
        <View style={styles.card}>
          {mode === "loading" ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View style={styles.errorIcon}>
              <AlertCircle color={colors.primaryDark} size={28} strokeWidth={2.4} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  centeredState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  card: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 460,
    padding: spacing.lg,
    width: "100%"
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  title: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    textAlign: "center"
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
  }
});
