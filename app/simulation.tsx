import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LineChart } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

export default function SimulationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <LineChart color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Simulación próximamente</Text>

            <Text style={styles.text}>
              Aquí compararemos escenarios de ahorro e inversión educativa según tu meta.
            </Text>
          </View>

          <PrimaryButton
            accessibilityLabel="Volver al diagnóstico financiero"
            icon={null}
            onPress={() => router.push("/diagnosis")}
            title="Volver al diagnóstico"
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    maxWidth: 520,
    width: "100%"
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 36
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: 24
  }
});
