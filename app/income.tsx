import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PiggyBank, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { SelectableOption } from "../components/SelectableOption";
import { StepIndicator } from "../components/StepIndicator";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const incomeRanges = [
  "Menos de $1.500.000",
  "$1.500.000 – $3.000.000",
  "$3.000.000 – $5.000.000",
  "$5.000.000 – $8.000.000",
  "Más de $8.000.000"
] as const;

const incomeTypes = ["Fijo", "Variable", "Mixto"] as const;
const incomeFrequencies = ["Mensual", "Quincenal", "Semanal", "Irregular"] as const;

export default function IncomeScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedIncomeRange, setSelectedIncomeRange] = useState<string | null>(
    onboarding.incomeRange
  );
  const [selectedIncomeType, setSelectedIncomeType] = useState<string | null>(
    onboarding.incomeType
  );
  const [selectedIncomeFrequency, setSelectedIncomeFrequency] = useState<string | null>(
    onboarding.incomeFrequency
  );

  const canContinue = Boolean(
    selectedIncomeRange && selectedIncomeType && selectedIncomeFrequency
  );

  const handleContinue = () => {
    if (!selectedIncomeRange || !selectedIncomeType || !selectedIncomeFrequency) {
      return;
    }

    updateOnboarding({
      incomeRange: selectedIncomeRange,
      incomeType: selectedIncomeType,
      incomeFrequency: selectedIncomeFrequency
    });
    router.push("/expenses");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <StepIndicator currentStep={4} label="Ingresos" totalSteps={8} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <PiggyBank color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tus ingresos</Text>

            <Text style={styles.subtitle}>
              No necesitamos saber tu salario exacto. Con un rango aproximado podemos darte una
              primera orientación.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes ajustar esta información más adelante.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuál es tu rango de ingresos mensuales?</Text>
            <View style={styles.optionsList}>
              {incomeRanges.map((incomeRange) => (
                <SelectableOption
                  key={incomeRange}
                  label={incomeRange}
                  onPress={() => setSelectedIncomeRange(incomeRange)}
                  selected={selectedIncomeRange === incomeRange}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué tipo de ingreso tienes?</Text>
            <View style={styles.optionsList}>
              {incomeTypes.map((incomeType) => (
                <SelectableOption
                  key={incomeType}
                  label={incomeType}
                  onPress={() => setSelectedIncomeType(incomeType)}
                  selected={selectedIncomeType === incomeType}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Con qué frecuencia recibes ingresos?</Text>
            <View style={styles.optionsList}>
              {incomeFrequencies.map((incomeFrequency) => (
                <SelectableOption
                  key={incomeFrequency}
                  label={incomeFrequency}
                  onPress={() => setSelectedIncomeFrequency(incomeFrequency)}
                  selected={selectedIncomeFrequency === incomeFrequency}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia preguntas de gastos"
              disabled={!canContinue}
              icon={null}
              onPress={handleContinue}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver al perfil básico"
              icon={null}
              onPress={() => router.push("/profile")}
              title="Volver"
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
    gap: spacing.md,
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: 24
  },
  trustMessage: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  supportText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 20
  },
  questionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24
  },
  optionsList: {
    gap: spacing.sm
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
