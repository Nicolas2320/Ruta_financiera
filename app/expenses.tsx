import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Apple,
  BusFront,
  Cable,
  CalendarCheck,
  CircleEllipsis,
  Frown,
  Gamepad2,
  GraduationCap,
  HandHeart,
  House,
  Meh,
  ShoppingBag,
  Smile,
  Users
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { CategoryChip } from "../components/ui/CategoryChip";
import { ContextHeader } from "../components/ui/ContextHeader";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  getRecurringExpenseCategories,
  syncDebtExpenseCategory
} from "../utils/debtCalculations";
import {
  formatCOP,
  getExpenseRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const expensesCupReceipt = require("../assets/illustrations/expenses-cup-receipt.png");

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

const expenseRanges = [
  "Menos de $1.000.000",
  "$1.000.000 – $2.000.000",
  "$2.000.000 – $4.000.000",
  "$4.000.000 – $6.000.000",
  "Más de $6.000.000"
] as const;

const exactExpenseOption = "Ingresar cifra exacta";

function normalizeExpenseRange(expensesRange: string | null) {
  return expenseRanges.includes(expensesRange as (typeof expenseRanges)[number])
    ? expensesRange
    : null;
}

const expenseCategories: Array<{
  label: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
}> = [
  {
    label: "Arriendo",
    icon: House,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  {
    label: "Alimentación",
    icon: Apple,
    color: "#2F9E57",
    backgroundColor: "#E8F8EF"
  },
  {
    label: "Transporte",
    icon: BusFront,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    label: "Servicios públicos",
    icon: Cable,
    color: "#1C7ED6",
    backgroundColor: "#E5F2FF"
  },
  {
    label: "Educación",
    icon: GraduationCap,
    color: "#2563EB",
    backgroundColor: "#EAF1FF"
  },
  {
    label: "Salud",
    icon: HandHeart,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  {
    label: "Familia",
    icon: Users,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  {
    label: "Entretenimiento",
    icon: Gamepad2,
    color: "#F59E0B",
    backgroundColor: "#FFF5E7"
  },
  {
    label: "Suscripciones",
    icon: CalendarCheck,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    label: "Compras",
    icon: ShoppingBag,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  {
    label: "Otros",
    icon: CircleEllipsis,
    color: "#64748B",
    backgroundColor: "#EEF2F7"
  }
];

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
  const { isPhone, screenPadding } = useResponsiveLayout();
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    getRecurringExpenseCategories(onboarding.expenseCategories)
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
    setSelectedCategories(getRecurringExpenseCategories(onboarding.expenseCategories));
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
      : selectedExpenseRange) &&
      selectedCategories.length > 0 &&
      selectedExpenseFeeling
  );
  const showSideBySide = !isPhone;

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const handleExactExpensesChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactExpensesInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (
      selectedCategories.length === 0 ||
      !selectedExpenseFeeling ||
      (usesExactExpenses
        ? parsedExactExpenses === null || parsedExactExpenses <= 0
        : !selectedExpenseRange)
    ) {
      return;
    }

    const syncedExpenseData = syncDebtExpenseCategory({
      debts: onboarding.debts,
      expenseCategories: selectedCategories,
      expenseCategoryAmounts: onboarding.expenseCategoryAmounts,
      preserveExistingReference: true
    });

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
        ...syncedExpenseData,
        expensesFeeling: selectedExpenseFeeling
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
          : "/small-expenses"
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
            nextAccessibilityLabel="Continuar hacia gastos hormiga"
            nextDisabled={!canContinue}
            onBack={() => router.replace("/income")}
            onNext={handleContinue}
            title="Gastos"
            totalSteps={7}
          />
          ) : null}

          <HeroInfoCard
            badge="Podrás ajustar tus gastos más adelante."
            image={expensesCupReceipt}
            imageStyle={styles.heroImage}
            text="Puedes elegir un rango o ingresar una cifra. Aquí contamos tus gastos habituales, sin sumar deudas ni gastos pequeños."
            title="Tus gastos mensuales"
          />

          <View style={[styles.midsection, showSideBySide && styles.midsectionRow]}>
            <View style={[styles.card, showSideBySide && styles.rangePanel]}>
              <Text style={styles.questionTitle}>¿Cuál es tu rango de gastos mensuales?</Text>
              <Text style={styles.helperText}>
                Incluye vivienda, alimentación, transporte, servicios y otros gastos principales.
                Las cuotas de deuda y los gastos pequeños se calculan aparte.
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
                  helper="No incluyas cuotas de préstamos, tarjetas ni consumos pequeños frecuentes."
                  label="Gastos principales al mes"
                  onChangeText={handleExactExpensesChange}
                  value={exactExpensesInput}
                />
              ) : null}
            </View>

            <View style={[styles.card, showSideBySide && styles.categoryPanel]}>
              <Text style={styles.questionTitle}>¿Cuáles son tus gastos principales?</Text>
              <Text style={styles.helperText}>
                Elige gastos habituales que no tengan un saldo pendiente. Los préstamos y
                créditos se registran en Deudas.
              </Text>
              <View style={styles.categoryGrid}>
                {expenseCategories.map((category) => (
                  <CategoryChip
                    key={category.label}
                    backgroundColor={category.backgroundColor}
                    color={category.color}
                    icon={category.icon}
                    label={category.label}
                    onPress={() => toggleCategory(category.label)}
                    selected={selectedCategories.includes(category.label)}
                  />
                ))}
              </View>
            </View>
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
                isEditMode ? "Guardar cambios de gastos" : "Continuar hacia gastos hormiga"
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
  midsection: {
    gap: spacing.md
  },
  midsectionRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm
  },
  rangePanel: {
    flex: 0.82,
    paddingHorizontal: spacing.sm
  },
  categoryPanel: {
    flex: 1.22,
    paddingHorizontal: spacing.sm
  },
  compactList: {
    gap: spacing.xs
  },
  compactOption: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
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
