import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeftRight, CalendarCheck, PiggyBank } from "lucide-react-native";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  formatCOP,
  getIncomeRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const incomePiggy = require("../assets/illustrations/income-piggy.png");
const frequencyMonthly = require("../assets/icons/frequency-monthly.png");
const frequencyBiweekly = require("../assets/icons/frequency-biweekly.png");
const frequencyWeekly = require("../assets/icons/frequency-weekly.png");
const frequencyIrregular = require("../assets/icons/frequency-irregular.png");

const incomeRanges = [
  "Menos de $1.500.000",
  "$1.500.000 – $3.000.000",
  "$3.000.000 – $5.000.000",
  "$5.000.000 – $8.000.000",
  "Más de $8.000.000"
] as const;

const incomeTypes = [
  {
    title: "Fijo",
    subtitle: "Ingresas estable todos los meses",
    icon: CalendarCheck,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Variable",
    subtitle: "Tus ingresos cambian",
    icon: ArrowLeftRight,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Mixto",
    subtitle: "Combinación de fijo y variable",
    icon: PiggyBank,
    color: "#C88416",
    backgroundColor: colors.warningSoft
  }
] as const;

const incomeFrequencies = [
  {
    title: "Mensual",
    image: frequencyMonthly
  },
  {
    title: "Quincenal",
    image: frequencyBiweekly
  },
  {
    title: "Semanal",
    image: frequencyWeekly
  },
  {
    title: "Irregular",
    image: frequencyIrregular
  }
] as const;

const exactIncomeOption = "Ingresar cifra exacta";

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
  const [selectedIncomeType, setSelectedIncomeType] = useState<string | null>(
    onboarding.incomeType
  );
  const [selectedIncomeFrequency, setSelectedIncomeFrequency] = useState<string | null>(
    onboarding.incomeFrequency
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
    setSelectedIncomeType(onboarding.incomeType);
    setSelectedIncomeFrequency(onboarding.incomeFrequency);
    setUsesExactIncome(hasExactFinancialValue(exactValues.monthlyIncome));
    setExactIncomeInput(
      hasExactFinancialValue(exactValues.monthlyIncome)
        ? formatCOP(exactValues.monthlyIncome)
        : ""
    );
  }, [exactValues.monthlyIncome, onboarding, onboardingSyncStatus]);

  const parsedExactIncome = parseCOPInput(exactIncomeInput);

  const canContinue = Boolean(
    (usesExactIncome
      ? parsedExactIncome !== null && parsedExactIncome > 0
      : selectedIncomeRange) &&
      selectedIncomeType &&
      selectedIncomeFrequency
  );

  const handleExactIncomeChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactIncomeInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (
      !selectedIncomeType ||
      !selectedIncomeFrequency ||
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
      {
        incomeRange,
        incomeType: selectedIncomeType,
        incomeFrequency: selectedIncomeFrequency
      },
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
              totalSteps={7}
            />
          ) : null}

          <HeroInfoCard
            badge="Puedes ajustar esta información más adelante."
            image={incomePiggy}
            imageStyle={styles.heroImage}
            text="Puedes elegir un rango para avanzar rápido o ingresar una cifra si ya la tienes clara."
            title="Tus ingresos"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuál es tu rango de ingresos mensuales?</Text>
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
                helper="Usaremos esta cifra desde ahora y también quedará disponible en Mejorar mi plan."
                label="Ingreso promedio mensual"
                onChangeText={handleExactIncomeChange}
                value={exactIncomeInput}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué tipo de ingreso tienes?</Text>
            <View style={styles.typeGrid}>
              {incomeTypes.map((incomeType) => {
                const Icon = incomeType.icon;

                return (
                  <SelectableCard
                    key={incomeType.title}
                    leading={
                      <View
                        style={[
                          styles.typeIcon,
                          { backgroundColor: incomeType.backgroundColor }
                        ]}
                      >
                        <Icon color={incomeType.color} size={25} strokeWidth={2.4} />
                      </View>
                    }
                    onPress={() => setSelectedIncomeType(incomeType.title)}
                    selected={selectedIncomeType === incomeType.title}
                    subtitle={incomeType.subtitle}
                    title={incomeType.title}
                    variant="tile"
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Con qué frecuencia recibes ingresos?</Text>
            <View style={styles.frequencyGrid}>
              {incomeFrequencies.map((frequency) => (
                <SelectableCard
                  key={frequency.title}
                  leading={
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={frequency.image}
                      style={styles.frequencyImage}
                    />
                  }
                  onPress={() => setSelectedIncomeFrequency(frequency.title)}
                  selected={selectedIncomeFrequency === frequency.title}
                  style={styles.frequencyCard}
                  title={frequency.title}
                  variant="center"
                />
              ))}
            </View>
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
  typeGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  typeIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 42
  },
  frequencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  frequencyCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 82
  },
  frequencyImage: {
    height: 34,
    width: 34
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
