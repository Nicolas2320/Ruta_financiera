import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Frown, Meh, Smile } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  formatCOP,
  getExpenseRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const expensesCupReceipt = require("../assets/illustrations/expenses-cup-receipt.png");

const expenseRanges = [
  "Menos de $1.000.000",
  "$1.000.000 – $2.000.000",
  "$2.000.000 – $4.000.000",
  "$4.000.000 – $6.000.000",
  "Más de $6.000.000"
] as const;

const exactExpenseOption = "Ingresar cifra";

function normalizeExpenseRange(expensesRange: string | null) {
  return expenseRanges.includes(expensesRange as (typeof expenseRanges)[number])
    ? expensesRange
    : null;
}

const expenseFeelings = [
  {
    title: "Los tengo bajo control",
    value: "Los tengo bajo control",
    icon: Smile,
    color: colors.support,
    backgroundColor: "#F0FBF4",
    borderColor: "#CDEFE0"
  },
  {
    title: "Gasto más de lo planeado",
    value: "Gasto más de lo planeado",
    icon: Meh,
    color: "#C88416",
    backgroundColor: "#FFF8E8",
    borderColor: "#F5E2B9"
  },
  {
    title: "No sé en qué se me va el dinero",
    value: "No sé en qué se va mi dinero",
    icon: Frown,
    color: "#E5484D",
    backgroundColor: "#FFF0F1",
    borderColor: "#F7D0D4"
  }
] as const;

export default function ExpensesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const { screenPadding } = useResponsiveLayout();
  const {
    exactValues,
    onboarding,
    onboardingSyncStatus,
    saveOnboardingAndExactValues
  } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isSpendingEditMode = source === "spending";
  const isProfileEditMode = source === "profile";
  const isEditMode = isSpendingEditMode || isProfileEditMode;
  const [selectedExpenseRange, setSelectedExpenseRange] = useState<string | null>(
    normalizeExpenseRange(onboarding.expensesRange)
  );
  const [selectedExpenseFeeling, setSelectedExpenseFeeling] = useState<string | null>(
    onboarding.expensesFeeling
  );
  const [usesExactExpenses, setUsesExactExpenses] = useState(
    hasExactFinancialValue(exactValues.monthlyExpenses)
  );
  const [exactExpensesInput, setExactExpensesInput] = useState(
    hasExactFinancialValue(exactValues.monthlyExpenses)
      ? formatCOP(exactValues.monthlyExpenses)
      : ""
  );
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    setSelectedExpenseRange(normalizeExpenseRange(onboarding.expensesRange));
    setSelectedExpenseFeeling(onboarding.expensesFeeling);
    setUsesExactExpenses(hasExactFinancialValue(exactValues.monthlyExpenses));
    setExactExpensesInput(
      hasExactFinancialValue(exactValues.monthlyExpenses)
        ? formatCOP(exactValues.monthlyExpenses)
        : ""
    );
  }, [exactValues.monthlyExpenses, onboarding, onboardingSyncStatus]);

  const parsedExactExpenses = parseCOPInput(exactExpensesInput);

  const canContinue = Boolean(
    (usesExactExpenses
      ? parsedExactExpenses !== null && parsedExactExpenses > 0
      : selectedExpenseRange) && selectedExpenseFeeling
  );

  const handleExactExpensesChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactExpensesInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (
      !selectedExpenseFeeling ||
      (usesExactExpenses
        ? parsedExactExpenses === null || parsedExactExpenses <= 0
        : !selectedExpenseRange)
    ) {
      return;
    }

    const nextExactValues = { ...exactValues };
    const expensesRange = usesExactExpenses
      ? getExpenseRangeForAmount(parsedExactExpenses as number)
      : selectedExpenseRange;

    if (usesExactExpenses && parsedExactExpenses !== null) {
      nextExactValues.monthlyExpenses = parsedExactExpenses;
    } else {
      delete nextExactValues.monthlyExpenses;
    }

    const saved = await saveOnboardingAndExactValues(
      {
        expensesRange,
        expensesFeeling: selectedExpenseFeeling,
        monthlyExpensesIncludesSmallExpenses: true
      },
      nextExactValues
    );

    if (!saved) {
      return;
    }

    router.push(
      isSpendingEditMode
        ? "/spending"
          : isProfileEditMode
          ? { pathname: "/summary", params: { mode: "edit" } }
          : "/savings-debts"
    );
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
          {isEditMode ? (
            <ContextHeader
              onBack={() =>
                router.push(
                  isSpendingEditMode
                    ? "/spending"
                    : { pathname: "/summary", params: { mode: "edit" } }
                )
              }
              subtitle={isSpendingEditMode ? "Volveras a Gastos." : "Volveras al perfil financiero."}
              title="Editar gastos"
            />
          ) : null}
          {!isEditMode ? (
          <StepHeader
            currentStep={4}
            nextAccessibilityLabel="Continuar hacia ahorros y deudas"
            nextDisabled={!canContinue}
            onBack={() => router.replace("/income")}
            onNext={handleContinue}
            title="Gastos"
            totalSteps={6}
          />
          ) : null}

          <HeroInfoCard
            badge="Puedes elegir un rango o ingresar una cifra."
            image={expensesCupReceipt}
            imageStyle={styles.heroImage}
            text="Incluye todos tus gastos habituales, también las compras pequeñas que se repiten. No incluyas cuotas de deudas o préstamos."
            title="Tus gastos mensuales"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>En un mes normal, ¿cuánto gastas aproximadamente?</Text>
            <Text style={styles.helperText}>
              Piensa en todo lo que gastas durante el mes. No sumes cuotas de deudas o préstamos;
              las revisaremos por separado.
            </Text>
            <View style={styles.compactList}>
              {expenseRanges.map((expenseRange) => (
                <SelectableCard
                  key={expenseRange}
                  onPress={() => {
                    setUsesExactExpenses(false);
                    setSelectedExpenseRange(expenseRange);
                  }}
                  selected={!usesExactExpenses && selectedExpenseRange === expenseRange}
                  style={styles.compactOption}
                  title={expenseRange}
                />
              ))}
              <SelectableCard
                onPress={() => setUsesExactExpenses(true)}
                selected={usesExactExpenses}
                style={styles.compactOption}
                title={exactExpenseOption}
              />
            </View>
            {usesExactExpenses ? (
              <ExactAmountField
                accessibilityLabel="Gastos mensuales"
                onChangeText={handleExactExpensesChange}
                value={exactExpensesInput}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cómo sientes tus gastos actualmente?</Text>
            <View style={styles.feelingGrid}>
              {expenseFeelings.map((feeling) => (
                <FeelingCard
                  key={feeling.value}
                  feeling={feeling}
                  onPress={() => setSelectedExpenseFeeling(feeling.value)}
                  selected={selectedExpenseFeeling === feeling.value}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                isEditMode ? "Guardar cambios de gastos" : "Continuar hacia ahorros y deudas"
              }
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isEditMode ? "Guardar cambios" : "Continuar"}
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

function FeelingCard({
  feeling,
  selected,
  onPress
}: {
  feeling: (typeof expenseFeelings)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = feeling.icon;

  return (
    <Pressable
      accessibilityLabel={feeling.title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.feelingCard,
        {
          backgroundColor: feeling.backgroundColor,
          borderColor: selected ? colors.primary : feeling.borderColor
        },
        selected && styles.feelingCardSelected
      ]}
    >
      <Icon color={feeling.color} size={46} strokeWidth={2.4} />
      <Text style={[styles.feelingText, selected && styles.feelingTextSelected]}>
        {feeling.title}
      </Text>
    </Pressable>
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
    gap: spacing.sm,
    padding: spacing.md
  },
  questionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  helperText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginTop: -spacing.xs
  },
  compactList: {
    gap: spacing.xs
  },
  compactOption: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  feelingGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  feelingCard: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    minHeight: 150,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  feelingCardSelected: {
    borderWidth: 2
  },
  feelingText: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option,
    textAlign: "center"
  },
  feelingTextSelected: {
    color: colors.primary
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
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
