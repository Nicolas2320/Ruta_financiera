import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeftRight, CalendarCheck, PiggyBank } from "lucide-react-native";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

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
          <StepHeader
            currentStep={4}
            onBack={() => router.push("/profile")}
            title="Ingresos"
            totalSteps={8}
          />

          <HeroInfoCard
            badge="Puedes ajustar esta información más adelante."
            image={incomePiggy}
            imageStyle={styles.heroImage}
            text="No necesitamos saber tu salario exacto. Con un rango aproximado podemos darte una primera orientación."
            title="Tus ingresos"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuál es tu rango de ingresos mensuales?</Text>
            <View style={styles.optionList}>
              {incomeRanges.map((incomeRange) => (
                <SelectableCard
                  key={incomeRange}
                  onPress={() => setSelectedIncomeRange(incomeRange)}
                  selected={selectedIncomeRange === incomeRange}
                  title={incomeRange}
                />
              ))}
            </View>
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
              accessibilityLabel="Continuar hacia preguntas de gastos"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver al perfil básico"
              icon={null}
              onPress={() => router.push("/profile")}
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
