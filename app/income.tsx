import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  formatCOP,
  getIncomeRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const incomePiggy = require("../assets/illustrations/income-piggy.png");

const incomeRanges = [
  "Menos de $1.500.000",
  "$1.500.000 – $3.000.000",
  "$3.000.000 – $5.000.000",
  "$5.000.000 – $8.000.000",
  "Más de $8.000.000"
] as const;

const exactIncomeOption = "Ingresar cifra";

export default function IncomeScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ source?: string }>();
  const {
    exactValues,
    onboarding,
    onboardingSyncStatus,
    saveOnboardingAndExactValues
  } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isProfileEditMode = source === "profile";
  const [selectedIncomeRange, setSelectedIncomeRange] = useState<string | null>(
    onboarding.incomeRange
  );
  const [usesExactIncome, setUsesExactIncome] = useState(
    hasExactFinancialValue(exactValues.monthlyIncome)
  );
  const [exactIncomeInput, setExactIncomeInput] = useState(
    hasExactFinancialValue(exactValues.monthlyIncome)
      ? formatCOP(exactValues.monthlyIncome)
      : ""
  );
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    setSelectedIncomeRange(onboarding.incomeRange);
    setUsesExactIncome(hasExactFinancialValue(exactValues.monthlyIncome));
    setExactIncomeInput(
      hasExactFinancialValue(exactValues.monthlyIncome)
        ? formatCOP(exactValues.monthlyIncome)
        : ""
    );
  }, [exactValues.monthlyIncome, onboarding, onboardingSyncStatus]);

  const parsedExactIncome = parseCOPInput(exactIncomeInput);

  const canContinue = Boolean(
    usesExactIncome
      ? parsedExactIncome !== null && parsedExactIncome > 0
      : selectedIncomeRange
  );

  const handleExactIncomeChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactIncomeInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (
      (usesExactIncome
        ? parsedExactIncome === null || parsedExactIncome <= 0
        : !selectedIncomeRange)
    ) {
      return;
    }

    const nextExactValues = { ...exactValues };
    const incomeRange = usesExactIncome
      ? getIncomeRangeForAmount(parsedExactIncome as number)
      : selectedIncomeRange;

    if (usesExactIncome && parsedExactIncome !== null) {
      nextExactValues.monthlyIncome = parsedExactIncome;
    } else {
      delete nextExactValues.monthlyIncome;
    }

    const saved = await saveOnboardingAndExactValues(
      { incomeRange },
      nextExactValues
    );

    if (!saved) {
      return;
    }

    router.push(isProfileEditMode ? { pathname: "/summary", params: { mode: "edit" } } : "/expenses");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {isProfileEditMode ? (
            <ContextHeader
              onBack={() => router.push({ pathname: "/summary", params: { mode: "edit" } })}
              subtitle="Volveras al perfil financiero."
              title="Editar ingresos"
            />
          ) : null}
          {!isProfileEditMode ? (
            <StepHeader
              currentStep={3}
              nextAccessibilityLabel="Continuar hacia preguntas de gastos"
              nextDisabled={!canContinue}
              onBack={() => router.replace("/profile")}
              onNext={handleContinue}
              title="Ingresos"
              totalSteps={6}
            />
          ) : null}

          <HeroInfoCard
            badge="No incluyas préstamos ni ingresos excepcionales."
            image={incomePiggy}
            imageStyle={styles.heroImage}
            text="Si tus ingresos cambian, usa un promedio mensual. Puedes elegir un rango o ingresar una cifra."
            title="Tus ingresos"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              En un mes normal, ¿cuánto dinero recibes aproximadamente?
            </Text>
            <View style={styles.optionList}>
              {incomeRanges.map((incomeRange) => (
                <SelectableCard
                  key={incomeRange}
                  onPress={() => {
                    setUsesExactIncome(false);
                    setSelectedIncomeRange(incomeRange);
                  }}
                  selected={!usesExactIncome && selectedIncomeRange === incomeRange}
                  title={incomeRange}
                />
              ))}
              <SelectableCard
                onPress={() => setUsesExactIncome(true)}
                selected={usesExactIncome}
                title={exactIncomeOption}
              />
            </View>
            {usesExactIncome ? (
              <ExactAmountField
                accessibilityLabel="Ingreso promedio mensual"
                onChangeText={handleExactIncomeChange}
                value={exactIncomeInput}
              />
            ) : null}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={isProfileEditMode ? "Guardar cambios de ingresos" : "Continuar hacia preguntas de gastos"}
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isProfileEditMode ? "Guardar cambios" : "Continuar"}
            />
            <PrimaryButton
              accessibilityLabel="Volver a la pantalla anterior"
              icon={null}
              onPress={() => router.back()}
              style={styles.secondaryButton}
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
    backgroundColor: "#F3F7FC",
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  heroImage: {
    height: 126,
    width: 126
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  questionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  optionList: {
    gap: spacing.xs
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  primaryButton: {
    borderRadius: 17,
    minHeight: 56
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: "#CFE0FF",
    borderRadius: 17,
    minHeight: 54
  }
});
