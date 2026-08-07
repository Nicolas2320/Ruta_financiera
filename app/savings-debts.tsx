import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import type { OnboardingData } from "../types/financial";
import {
  formatCOP,
  getDebtMonthlyPaymentRangeForAmount,
  getSavingsRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const financialFoundation = require("../assets/illustrations/financial-foundation.png");

const savingsRanges = [
  "No tengo ahorros",
  "Menos de $500.000",
  "$500.000 – $2.000.000",
  "$2.000.000 – $5.000.000",
  "$5.000.000 – $10.000.000",
  "Más de $10.000.000",
  "Prefiero no responder"
] as const;

const exactSavingsOption = "Ingresar cifra";

const debtMonthlyPaymentRanges = [
  "Menos de $250.000",
  "$250.000 – $500.000",
  "$500.000 – $1.000.000",
  "$1.000.000 – $2.000.000",
  "Más de $2.000.000"
] as const;

const exactDebtPaymentOption = "Ingresar cifra";

function normalizeDebtMonthlyPaymentRange(range: string | null) {
  return debtMonthlyPaymentRanges.includes(
    range as (typeof debtMonthlyPaymentRanges)[number]
  )
    ? range
    : null;
}

function inferHasDebts(onboarding: OnboardingData) {
  if (typeof onboarding.hasDebts === "boolean") {
    return onboarding.hasDebts;
  }

  if (
    onboarding.debts.length > 0 ||
    onboarding.debtMonthlyPaymentRange ||
    (onboarding.debtSituation && onboarding.debtSituation !== "No tengo deudas")
  ) {
    return true;
  }

  if (
    onboarding.debtSituation === "No tengo deudas" ||
    onboarding.debtPaymentShare === "No pago deudas"
  ) {
    return false;
  }

  return null;
}

export default function SavingsDebtsScreen() {
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
  const [selectedSavingsRange, setSelectedSavingsRange] = useState<string | null>(
    onboarding.savingsRange
  );
  const [selectedHasDebts, setSelectedHasDebts] = useState<boolean | null>(
    inferHasDebts(onboarding)
  );
  const [selectedDebtPaymentRange, setSelectedDebtPaymentRange] = useState<string | null>(
    normalizeDebtMonthlyPaymentRange(onboarding.debtMonthlyPaymentRange)
  );
  const [usesExactSavings, setUsesExactSavings] = useState(
    hasExactFinancialValue(exactValues.currentSavings)
  );
  const [exactSavingsInput, setExactSavingsInput] = useState(
    hasExactFinancialValue(exactValues.currentSavings)
      ? formatCOP(exactValues.currentSavings)
      : ""
  );
  const [usesExactDebtPayment, setUsesExactDebtPayment] = useState(
    inferHasDebts(onboarding) === true &&
      hasExactFinancialValue(exactValues.monthlyDebtPayments) &&
      exactValues.monthlyDebtPayments > 0
  );
  const [exactDebtPaymentInput, setExactDebtPaymentInput] = useState(
    hasExactFinancialValue(exactValues.monthlyDebtPayments) &&
      exactValues.monthlyDebtPayments > 0
      ? formatCOP(exactValues.monthlyDebtPayments)
      : ""
  );
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    setSelectedSavingsRange(onboarding.savingsRange);
    setSelectedHasDebts(inferHasDebts(onboarding));
    setSelectedDebtPaymentRange(
      normalizeDebtMonthlyPaymentRange(onboarding.debtMonthlyPaymentRange)
    );
    setUsesExactSavings(hasExactFinancialValue(exactValues.currentSavings));
    setExactSavingsInput(
      hasExactFinancialValue(exactValues.currentSavings)
        ? formatCOP(exactValues.currentSavings)
        : ""
    );
    setUsesExactDebtPayment(
      inferHasDebts(onboarding) === true &&
        hasExactFinancialValue(exactValues.monthlyDebtPayments) &&
        exactValues.monthlyDebtPayments > 0
    );
    setExactDebtPaymentInput(
      hasExactFinancialValue(exactValues.monthlyDebtPayments) &&
        exactValues.monthlyDebtPayments > 0
        ? formatCOP(exactValues.monthlyDebtPayments)
        : ""
    );
  }, [exactValues.currentSavings, exactValues.monthlyDebtPayments, onboarding, onboardingSyncStatus]);

  const parsedExactSavings = parseCOPInput(exactSavingsInput);
  const parsedExactDebtPayment = parseCOPInput(exactDebtPaymentInput);

  const canContinue = Boolean(
    (usesExactSavings ? parsedExactSavings !== null : selectedSavingsRange) &&
      selectedHasDebts !== null &&
      (!selectedHasDebts ||
        (usesExactDebtPayment
          ? parsedExactDebtPayment !== null && parsedExactDebtPayment > 0
          : selectedDebtPaymentRange))
  );

  const handleDebtPresenceSelect = (hasDebts: boolean) => {
    setSelectedHasDebts(hasDebts);

    if (!hasDebts) {
      setSelectedDebtPaymentRange(null);
      setUsesExactDebtPayment(false);
      setExactDebtPaymentInput("");
    }
  };

  const handleExactSavingsChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactSavingsInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleExactDebtPaymentChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactDebtPaymentInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (
      (usesExactSavings ? parsedExactSavings === null : !selectedSavingsRange) ||
      selectedHasDebts === null ||
      (selectedHasDebts &&
        (usesExactDebtPayment
          ? parsedExactDebtPayment === null || parsedExactDebtPayment <= 0
          : !selectedDebtPaymentRange))
    ) {
      return;
    }

    const nextExactValues = { ...exactValues };
    const savingsRange = usesExactSavings
      ? getSavingsRangeForAmount(parsedExactSavings as number)
      : selectedSavingsRange;

    if (usesExactSavings && parsedExactSavings !== null) {
      nextExactValues.currentSavings = parsedExactSavings;
    } else {
      delete nextExactValues.currentSavings;
    }

    const debtMonthlyPaymentRange = !selectedHasDebts
      ? null
      : usesExactDebtPayment && parsedExactDebtPayment !== null
        ? getDebtMonthlyPaymentRangeForAmount(parsedExactDebtPayment)
        : selectedDebtPaymentRange;

    if (selectedHasDebts && usesExactDebtPayment && parsedExactDebtPayment !== null) {
      nextExactValues.monthlyDebtPayments = parsedExactDebtPayment;
    } else {
      delete nextExactValues.monthlyDebtPayments;
    }

    const saved = await saveOnboardingAndExactValues(
      {
        savingsRange,
        hasDebts: selectedHasDebts,
        debtMonthlyPaymentRange,
        debtSituation: selectedHasDebts ? "Tengo deudas" : "No tengo deudas",
        debtPaymentShare: selectedHasDebts ? null : "No pago deudas"
      },
      nextExactValues
    );

    if (!saved) {
      return;
    }

    router.push(isProfileEditMode ? { pathname: "/summary", params: { mode: "edit" } } : "/goals");
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
              title="Editar ahorros y deudas"
            />
          ) : null}
          {!isProfileEditMode ? (
            <StepHeader
              currentStep={5}
              nextAccessibilityLabel="Continuar hacia meta financiera"
              nextDisabled={!canContinue}
              onBack={() => router.replace("/expenses")}
              onNext={handleContinue}
              title="Ahorros y deudas"
              totalSteps={6}
            />
          ) : null}

          <HeroInfoCard
            badge="Puedes elegir un rango si prefieres no dar una cifra exacta."
            image={financialFoundation}
            imageStyle={styles.heroImage}
            text="Con tus ahorros y lo que pagas al mes en deudas podemos estimar tu margen y tu respaldo actual."
            title="Ahorros y deudas"
          />

          <SectionCard
            helper="Piensa en todo lo que tienes disponible para ti o tu familia."
            title="¿Cuánto tienes ahorrado actualmente?"
          >
            <View style={styles.moneyGrid}>
              {savingsRanges.map((range) => (
                <SelectableCard
                  key={range}
                  onPress={() => {
                    setUsesExactSavings(false);
                    setSelectedSavingsRange(range);
                  }}
                  selected={!usesExactSavings && selectedSavingsRange === range}
                  style={styles.moneyOption}
                  title={range}
                />
              ))}
              <SelectableCard
                onPress={() => setUsesExactSavings(true)}
                selected={usesExactSavings}
                style={styles.moneyOption}
                title={exactSavingsOption}
              />
            </View>
            {usesExactSavings ? (
              <ExactAmountField
                accessibilityLabel="Ahorro disponible actualmente"
                onChangeText={handleExactSavingsChange}
                value={exactSavingsInput}
              />
            ) : null}
          </SectionCard>

          <SectionCard
            helper="Incluye tarjetas de crédito, préstamos y compras financiadas que todavía debes."
            title="¿Actualmente tienes deudas o préstamos por pagar?"
          >
            <View style={styles.moneyGrid}>
              <SelectableCard
                onPress={() => handleDebtPresenceSelect(false)}
                selected={selectedHasDebts === false}
                style={styles.moneyOption}
                title="No tengo deudas"
              />
              <SelectableCard
                onPress={() => handleDebtPresenceSelect(true)}
                selected={selectedHasDebts === true}
                style={styles.moneyOption}
                title="Sí, tengo deudas"
              />
            </View>
          </SectionCard>

          {selectedHasDebts ? (
            <SectionCard
              helper="Suma únicamente las cuotas que pagas cada mes, no el saldo total que todavía debes."
              title="En total, ¿cuánto pagas al mes por esas deudas?"
            >
              <View style={styles.moneyGrid}>
                {debtMonthlyPaymentRanges.map((range) => (
                  <SelectableCard
                    key={range}
                    onPress={() => {
                      setUsesExactDebtPayment(false);
                      setSelectedDebtPaymentRange(range);
                    }}
                    selected={!usesExactDebtPayment && selectedDebtPaymentRange === range}
                    style={styles.moneyOption}
                    title={range}
                  />
                ))}
                <SelectableCard
                  onPress={() => setUsesExactDebtPayment(true)}
                  selected={usesExactDebtPayment}
                  style={styles.moneyOption}
                  title={exactDebtPaymentOption}
                />
              </View>
              {usesExactDebtPayment ? (
                <ExactAmountField
                  accessibilityLabel="Pago mensual total de deudas"
                  onChangeText={handleExactDebtPaymentChange}
                  value={exactDebtPaymentInput}
                />
              ) : null}
            </SectionCard>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={isProfileEditMode ? "Guardar cambios de ahorros y deudas" : "Continuar hacia meta financiera"}
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

function SectionCard({
  title,
  helper,
  children
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionIntro}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionHelper}>{helper}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
    height: 132,
    width: 142
  },
  sectionCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  sectionIntro: {
    gap: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  sectionHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption
  },
  sectionBody: {
    flex: 1
  },
  moneyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  moneyOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 50
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
