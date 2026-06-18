import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CalendarCheck, Coffee, LockKeyhole, PiggyBank, TrendingUp } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BenefitCard } from "../components/BenefitCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

const benefits = [
  {
    title: "Diagnóstico financiero simple",
    text: "Con rangos aproximados de ingresos, gastos, ahorros y deudas.",
    icon: TrendingUp,
    accent: "blue" as const
  },
  {
    title: "Control de gastos hormiga",
    text: "Identifica pequeños gastos frecuentes sin sentirte juzgado.",
    icon: Coffee,
    accent: "green" as const
  },
  {
    title: "Plan mensual personalizado",
    text: "Recibe acciones claras para avanzar hacia tu meta.",
    icon: CalendarCheck,
    accent: "warm" as const
  }
];

export default function WelcomeScreen() {
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
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <PiggyBank color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <Text style={styles.brandName}>Ruta Financiera</Text>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.title}>
              Organiza tu dinero y construye un plan para tus metas
            </Text>

            <Text style={styles.subtitle}>
              Entiende tus gastos, descubre oportunidades de ahorro y recibe acciones mensuales
              simples para mejorar tus finanzas.
            </Text>

            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View>
                  <Text style={styles.insightLabel}>Primer paso</Text>
                  <Text style={styles.insightTitle}>Tu diagnóstico inicial</Text>
                </View>
                <View style={styles.insightIcon}>
                  <LockKeyhole color={colors.primary} size={18} strokeWidth={2.4} />
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>

              <View style={styles.insightMetrics}>
                <View>
                  <Text style={styles.metricValue}>5-10 min</Text>
                  <Text style={styles.metricLabel}>estimados</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.benefitsSection}>
            {benefits.map((benefit) => (
              <BenefitCard
                key={benefit.title}
                accent={benefit.accent}
                icon={benefit.icon}
                text={benefit.text}
                title={benefit.title}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Crear mi diagnóstico financiero"
              icon={null}
              onPress={() => router.push("/privacy")}
              title="Crear mi diagnóstico"
            />
            <PrimaryButton
              accessibilityLabel="Explorar la demo de Ruta Financiera"
              icon={null}
              onPress={() => router.push("/demo")}
              title="Explorar demo"
              variant="secondary"
            />
          </View>
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
    gap: spacing.lg,
    maxWidth: 520,
    width: "100%"
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  heroCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: 24
  },
  insightCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.md
  },
  insightHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  insightLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  insightTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    marginTop: 2
  },
  insightIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  progressTrack: {
    backgroundColor: "#DCE8F8",
    borderRadius: radius.pill,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%",
    width: "62%"
  },
  insightMetrics: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  metricValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    marginTop: 2
  },
  benefitsSection: {
    gap: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
