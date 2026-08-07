import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Apple,
  Bot,
  BusFront,
  Cable,
  CalendarCheck,
  ChevronRight,
  CircleEllipsis,
  Coffee,
  CreditCard,
  Flag,
  Gamepad2,
  GraduationCap,
  HandHeart,
  Home,
  House,
  LineChart,
  PencilLine,
  PieChart,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Users
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { FinancialEducationModal } from "../components/FinancialEducationModal";
import { FinancialEducationStory } from "../components/FinancialEducationStory";
import { CategoryChip } from "../components/ui/CategoryChip";
import {
  SpendingSectionContent,
  SpendingSectionTabs
} from "../components/SpendingSectionTabs";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  normalizeExpenseCategoryAmounts,
  normalizeFinancialGuidanceMode
} from "../types/financial";
import { getMonthlyActionImpactSummary } from "../utils/actionProgressImpact";
import {
  getRecurringExpenseCategories,
  isDebtExpenseCategory,
  syncDebtExpenseCategory
} from "../utils/debtCalculations";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";
import {
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  type MonthlyPlanData,
  type MonthlyPlanMetrics
} from "../utils/monthlyPlan";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];
type Tone = "primary" | "support" | "warning" | "purple" | "neutral" | "danger";

type CategoryVisual = {
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
};

type CategoryAmountInputs = Record<string, string>;

const defaultCategoryVisual: CategoryVisual = {
  icon: CircleEllipsis,
  color: colors.textSubtle,
  backgroundColor: "#EEF2F7"
};

const categoryVisuals: Record<string, CategoryVisual> = {
  arriendo: {
    icon: House,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  vivienda: {
    icon: House,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  alimentacion: {
    icon: Apple,
    color: "#2F9E57",
    backgroundColor: colors.supportSoft
  },
  transporte: {
    icon: BusFront,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  "servicios publicos": {
    icon: Cable,
    color: "#1C7ED6",
    backgroundColor: "#E5F2FF"
  },
  "celular o plan de datos": {
    icon: Smartphone,
    color: "#0F766E",
    backgroundColor: "#E6FFFB"
  },
  deudas: {
    icon: CreditCard,
    color: "#2563EB",
    backgroundColor: "#EAF1FF"
  },
  educacion: {
    icon: GraduationCap,
    color: "#2563EB",
    backgroundColor: "#EAF1FF"
  },
  salud: {
    icon: HandHeart,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  familia: {
    icon: Users,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  entretenimiento: {
    icon: Gamepad2,
    color: "#F59E0B",
    backgroundColor: colors.warningSoft
  },
  suscripciones: {
    icon: CalendarCheck,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  compras: {
    icon: ShoppingBag,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  otros: defaultCategoryVisual
};

const selectableExpenseCategories = [
  "Arriendo",
  "Alimentación",
  "Transporte",
  "Servicios públicos",
  "Celular o plan de datos",
  "Educación",
  "Salud",
  "Familia",
  "Entretenimiento",
  "Suscripciones",
  "Compras",
  "Otros"
] as const;

function normalizeLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getToneColors(tone: Tone) {
  if (tone === "support") {
    return {
      background: colors.supportSoft,
      border: "#B9E9CD",
      text: colors.support
    };
  }

  if (tone === "warning") {
    return {
      background: colors.warningSoft,
      border: "#FED7AA",
      text: "#B45309"
    };
  }

  if (tone === "purple") {
    return {
      background: "#F1E8FF",
      border: "#D8C7FF",
      text: "#6D28D9"
    };
  }

  if (tone === "danger") {
    return {
      background: "#FFF0F1",
      border: "#F7D0D4",
      text: "#C2410C"
    };
  }

  if (tone === "neutral") {
    return {
      background: "#EEF2F7",
      border: colors.border,
      text: colors.textSubtle
    };
  }

  return {
    background: colors.primarySoft,
    border: "#CFE0FF",
    text: colors.primary
  };
}

function getCategoryVisual(label: string) {
  return categoryVisuals[normalizeLabel(label)] ?? defaultCategoryVisual;
}

function getCategoryAmountInputValues(
  categories: string[],
  amounts: Record<string, number>
): CategoryAmountInputs {
  return categories.reduce<CategoryAmountInputs>((inputValues, category) => {
    const amount = amounts[category];

    inputValues[category] = typeof amount === "number" ? formatCOP(amount) : "";
    return inputValues;
  }, {});
}

function getFormattedCurrencyInput(value: string) {
  const parsedValue = parseCOPInput(value);
  return parsedValue === null ? "" : formatCOP(parsedValue);
}

function getCategoryAmountsFromInputs(
  categories: string[],
  inputValues: CategoryAmountInputs
) {
  return categories.reduce<Record<string, number>>((amounts, category) => {
    const amount = parseCOPInput(inputValues[category] ?? "");

    if (amount !== null) {
      amounts[category] = amount;
    }

    return amounts;
  }, {});
}

function getCategorySharePercentage(amount: number | null, totalExpenses: number | null) {
  if (amount === null || totalExpenses === null || totalExpenses <= 0) {
    return null;
  }

  return Math.round((amount / totalExpenses) * 100);
}

function getCategoryShareLabel(
  amount: number | null,
  totalExpenses: number | null,
  isExactMonthlyExpense: boolean,
  totalExpensesLabel: string
) {
  const share = getCategorySharePercentage(amount, totalExpenses);

  if (amount === null) {
    return "Sin monto";
  }

  if (share === null) {
    return `Agrega ${totalExpensesLabel.toLowerCase()}`;
  }

  if (share > 100) {
    return `Supera ${totalExpensesLabel.toLowerCase()}`;
  }

  return `${share}% de ${totalExpensesLabel.toLowerCase()} ${
    isExactMonthlyExpense ? "ingresados" : "estimados"
  }`;
}

function getCategoryAmountsTotal(amounts: Record<string, number>) {
  return Object.values(amounts).reduce((total, amount) => total + Math.max(0, amount), 0);
}

function getCategoryCoverageText({
  categorizedAmount,
  isExactMonthlyExpense,
  totalExpenses,
  totalExpensesLabel
}: {
  categorizedAmount: number;
  isExactMonthlyExpense: boolean;
  totalExpenses: number | null;
  totalExpensesLabel: string;
}) {
  const normalizedExpensesLabel = totalExpensesLabel.toLowerCase();

  if (totalExpenses === null || totalExpenses <= 0) {
    return `Agrega tus ${normalizedExpensesLabel} para comparar las categorías contra el total.`;
  }

  if (categorizedAmount > totalExpenses) {
    return `La suma de categorías supera tus ${normalizedExpensesLabel}. Revisa los montos o actualiza esa cifra.`;
  }

  if (categorizedAmount === 0) {
    return "Ingresa montos aproximados para encontrar que categoria revisar primero.";
  }

  const unclassifiedAmount = totalExpenses - categorizedAmount;
  if (unclassifiedAmount > 0) {
    return `Quedan ${formatCOP(unclassifiedAmount)} sin clasificar de ${normalizedExpensesLabel} ${
      isExactMonthlyExpense ? "ingresados" : "estimados"
    }.`;
  }

  return `Tus categorías cubren los ${normalizedExpensesLabel} registrados.`;
}

function getPrioritizedCategoryLabels(categories: string[], amounts: Record<string, number>) {
  return [...categories].sort((leftCategory, rightCategory) => {
    const leftAmount = amounts[leftCategory] ?? null;
    const rightAmount = amounts[rightCategory] ?? null;

    if (leftAmount !== null && rightAmount !== null) {
      return rightAmount - leftAmount;
    }

    if (leftAmount !== null) {
      return -1;
    }

    if (rightAmount !== null) {
      return 1;
    }

    return categories.indexOf(leftCategory) - categories.indexOf(rightCategory);
  });
}

function haveCategoryAmountsChanged(
  currentAmounts: Record<string, number>,
  nextAmounts: Record<string, number>
) {
  const currentKeys = Object.keys(currentAmounts);
  const nextKeys = Object.keys(nextAmounts);

  if (currentKeys.length !== nextKeys.length) {
    return true;
  }

  return nextKeys.some((key) => currentAmounts[key] !== nextAmounts[key]);
}

function getAmountLabel(value: number | null, isExact = false) {
  if (value === null) {
    return "No disponible";
  }

  return isExact ? formatCOP(value) : `${formatCOP(value)} aprox.`;
}

function getPercentageLabel(value: number | null, isMorePrecise = false) {
  if (value === null) {
    return "No disponible";
  }

  return isMorePrecise ? `${value}%` : `${value}% aprox.`;
}

function getQuickReadText(metrics: MonthlyPlanMetrics) {
  if (metrics.expensePercentage === null) {
    return "Completa ingresos y gastos para ver una lectura rápida de tus salidas mensuales.";
  }

  if (metrics.expensePercentage >= 100) {
    return "Tus salidas están por encima de tus ingresos. Conviene revisar un rubro concreto.";
  }

  if (metrics.expensePercentage >= 85) {
    return "Tus salidas están cerca de tus ingresos. Un ajuste pequeño puede darte más margen.";
  }

  if (metrics.expensePercentage >= 70) {
    return "Tus salidas ocupan una parte importante de tus ingresos, pero aún hay espacio para decidir.";
  }

  return "Tus salidas parecen dejar margen para avanzar en tu plan.";
}

function getExpenseSourceLabel(source: string) {
  if (source === "exact") {
    return "Dato manual";
  }

  if (source === "estimated") {
    return "Estimado";
  }

  return "Por completar";
}

function getSmallExpensesValue(metrics: MonthlyPlanMetrics) {
  const { amount } = metrics.snapshot.smallExpenses;
  const source = metrics.snapshot.sourceMap.smallExpenses;

  if (metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses && amount === null) {
    return "Incluidos en el total mensual";
  }

  if (source === "reported_none") {
    return "No identificados";
  }

  if (source === "unknown") {
    return "No claro aún";
  }

  if (amount === null) {
    return "No disponible";
  }

  return source === "exact" ? formatCOP(amount) : `${formatCOP(amount)} aprox.`;
}

function getSmallExpensesComparisonValue(metrics: MonthlyPlanMetrics) {
  const smallExpenses = metrics.snapshot.smallExpenses.amount;

  if (metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses) {
    return smallExpenses === null
      ? "Incluidos en gastos mensuales"
      : `${formatCOP(smallExpenses)} dentro del total`;
  }

  if (metrics.snapshot.sourceMap.smallExpenses === "reported_none") {
    return "No identificados";
  }

  if (metrics.snapshot.sourceMap.smallExpenses === "unknown") {
    return "Monto no claro aún";
  }

  if (smallExpenses === null) {
    return "Sin monto disponible";
  }

  const expenseShare =
    metrics.expenseMidpoint !== null && metrics.expenseMidpoint > 0
      ? Math.round((smallExpenses / metrics.expenseMidpoint) * 100)
      : null;

  return `${formatCOP(smallExpenses)}${
    metrics.snapshot.sourceMap.smallExpenses === "exact" ? "" : " aprox."
  }${
    expenseShare !== null ? ` (${expenseShare}% de tus gastos)` : ""
  }`;
}

function getDebtPaymentsComparisonValue(metrics: MonthlyPlanMetrics) {
  const amount = metrics.snapshot.cashflow.monthlyDebtPayments;

  if (metrics.snapshot.debt.source === "none" && amount === 0) {
    return "Sin pagos registrados";
  }

  return `${formatCOP(amount)}${metrics.snapshot.debt.isPaymentEstimated ? " aprox." : ""}`;
}

function getCashflowMetricLabel(isCashflowExact: boolean) {
  return `Margen mensual ${isCashflowExact ? "calculado" : "estimado"}`;
}

function getCashflowMetricValue(metrics: MonthlyPlanMetrics) {
  if (metrics.estimatedMargin === null || metrics.expensePercentage === null) {
    return "Por calcular";
  }

  if (metrics.estimatedMargin < 0) {
    return `-${formatCOP(Math.abs(metrics.estimatedMargin))}`;
  }

  return formatCOP(metrics.estimatedMargin);
}

function getSmallExpensesText(data: MonthlyPlanData, metrics: MonthlyPlanMetrics) {
  if (
    metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses &&
    metrics.snapshot.smallExpenses.amount === null
  ) {
    return "Ya están considerados en tu gasto mensual. Puedes detallarlos más adelante si quieres analizarlos por separado.";
  }

  if (data.hasSmallExpenses === "No") {
    return "No marcaste gastos pequeños frecuentes. Puedes volver a revisarlo si aparecen consumos repetidos.";
  }

  if (metrics.snapshot.sourceMap.smallExpenses === "unknown") {
    return "Aún no hay una cifra clara. Puedes observarlos antes de ajustar algo.";
  }

  if (metrics.snapshot.smallExpenses.amount !== null) {
    return metrics.snapshot.smallExpenses.recommendation;
  }

  return "Puedes completar esta parte para entender si hay consumos pequeños que valga la pena mirar.";
}

function IconBubble({
  icon,
  tone = "primary",
  size = "medium"
}: {
  icon: ReactNode;
  tone?: Tone;
  size?: "small" | "medium" | "large";
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.iconBubble,
        size === "small" && styles.iconBubbleSmall,
        size === "large" && styles.iconBubbleLarge,
        { backgroundColor: toneColors.background }
      ]}
    >
      {icon}
    </View>
  );
}

function Chip({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <Text style={[styles.chipText, { color: toneColors.text }]}>{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  actionLabel,
  onActionPress,
  children,
  compact = false
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.sectionCard, compact && styles.cardPhone]}>
      <View style={styles.sectionHeader}>
        <IconBubble icon={icon} size="small" />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
          >
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function CategorySummaryMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View style={[styles.categorySummaryMetric, { borderColor: toneColors.border }]}>
      <Text style={styles.categorySummaryMetricLabel}>{label}</Text>
      <Text style={[styles.categorySummaryMetricValue, { color: toneColors.text }]}>{value}</Text>
    </View>
  );
}

function ComparisonMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.comparisonMetric,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <View style={styles.comparisonMetricHeader}>
        <View style={[styles.comparisonMetricDot, { backgroundColor: toneColors.text }]} />
        <Text style={styles.comparisonMetricLabel}>{label}</Text>
      </View>
      <Text style={styles.comparisonMetricValue}>{value}</Text>
    </View>
  );
}

function CategoryCoverageSummary({
  categorizedAmount,
  isExactMonthlyExpense,
  totalExpenses,
  totalExpensesLabel
}: {
  categorizedAmount: number;
  isExactMonthlyExpense: boolean;
  totalExpenses: number | null;
  totalExpensesLabel: string;
}) {
  const hasTotalExpenses = totalExpenses !== null && totalExpenses > 0;
  const unclassifiedAmount = hasTotalExpenses ? Math.max(totalExpenses - categorizedAmount, 0) : null;
  const excessAmount = hasTotalExpenses ? Math.max(categorizedAmount - totalExpenses, 0) : 0;
  const coverageText = getCategoryCoverageText({
    categorizedAmount,
    isExactMonthlyExpense,
    totalExpenses,
    totalExpensesLabel
  });

  return (
    <View style={[styles.categorySummaryCard, excessAmount > 0 && styles.categorySummaryCardWarning]}>
      <View style={styles.categorySummaryHeader}>
        <Text style={styles.categorySummaryTitle}>Montos por categoria</Text>
      </View>
      <View style={styles.categorySummaryGrid}>
        <CategorySummaryMetric
          label="Categorizado"
          tone={categorizedAmount > 0 ? "support" : "neutral"}
          value={categorizedAmount > 0 ? formatCOP(categorizedAmount) : "$0"}
        />
        <CategorySummaryMetric
          label={`${totalExpensesLabel} ${
            isExactMonthlyExpense ? "ingresados" : "estimados"
          }`}
          tone={hasTotalExpenses ? "primary" : "neutral"}
          value={hasTotalExpenses && totalExpenses !== null ? formatCOP(totalExpenses) : "Sin total"}
        />
        <CategorySummaryMetric
          label={excessAmount > 0 ? "Exceso" : "Sin clasificar"}
          tone={excessAmount > 0 ? "warning" : "neutral"}
          value={
            excessAmount > 0
              ? formatCOP(excessAmount)
              : unclassifiedAmount !== null
                ? formatCOP(unclassifiedAmount)
                : "Por calcular"
          }
        />
      </View>
      <Text style={[styles.categorySummaryText, excessAmount > 0 && styles.categorySummaryWarningText]}>
        {coverageText}
      </Text>
    </View>
  );
}

function CategoryAmountRow({
  isExactMonthlyExpense,
  inputValue,
  label,
  locked,
  onChangeText,
  onManagePress,
  totalExpenses,
  totalExpensesLabel
}: {
  isExactMonthlyExpense: boolean;
  inputValue: string;
  label: string;
  locked?: boolean;
  onChangeText: (value: string) => void;
  onManagePress?: () => void;
  totalExpenses: number | null;
  totalExpensesLabel: string;
}) {
  const visual = getCategoryVisual(label);
  const Icon = visual.icon;
  const amount = parseCOPInput(inputValue);
  const sharePercentage = getCategorySharePercentage(amount, totalExpenses);
  const shareIsOverTotal = sharePercentage !== null && sharePercentage > 100;

  return (
    <View style={styles.categoryAmountRow}>
      <View style={styles.categoryMainRow}>
        <View style={[styles.categoryIcon, { backgroundColor: visual.backgroundColor }]}>
          <Icon color={visual.color} size={20} strokeWidth={2.4} />
        </View>
        <Text numberOfLines={2} style={styles.categoryLabel}>{label}</Text>
      </View>
      <View style={styles.categoryInputRow}>
        <Text style={styles.categoryInputLabel}>Monto mensual</Text>
        {locked && onManagePress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onManagePress}
            style={({ pressed }) => [styles.categoryManagedButton, pressed && styles.pressed]}
          >
            <View style={styles.categoryManagedTextGroup}>
              <Text style={styles.categoryManagedAmount}>{inputValue || "$0"}</Text>
              <Text style={styles.categoryManagedHelper}>Gestionar en Deudas</Text>
            </View>
            <ChevronRight color={colors.primary} size={18} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={styles.categoryInputShell}>
            <TextInput
              accessibilityLabel={`Monto mensual en ${label}`}
              inputMode="numeric"
              keyboardType="numeric"
              onChangeText={onChangeText}
              placeholder="Ingresa monto"
              placeholderTextColor={colors.textSubtle}
              style={styles.categoryAmountInput}
              value={inputValue}
            />
            <PencilLine color={colors.textSubtle} size={16} strokeWidth={2.4} />
          </View>
        )}
      </View>
      <Text style={[styles.categoryShareText, { color: shareIsOverTotal ? "#C2410C" : visual.color }]}>
        {getCategoryShareLabel(
          amount,
          totalExpenses,
          isExactMonthlyExpense,
          totalExpensesLabel
        )}
      </Text>
      <View style={styles.categoryShareTrack}>
        {sharePercentage !== null ? (
          <View
            style={[
              styles.categoryShareFill,
              { backgroundColor: visual.color, width: toPercentWidth(sharePercentage) }
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

function BottomNavItem({
  title,
  route,
  icon: Icon,
  active,
  onNavigate
}: {
  title: string;
  route: Route;
  icon: ComponentType<IconProps>;
  active?: boolean;
  onNavigate: (route: Route) => void;
}) {
  const color = active ? colors.primary : colors.textSubtle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onNavigate(route)}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
    >
      {active ? <View style={styles.navActiveLine} /> : null}
      <Icon color={color} size={23} strokeWidth={2.4} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{title}</Text>
    </Pressable>
  );
}

export default function SpendingScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const guidanceMode = normalizeFinancialGuidanceMode(
    onboarding.financialGuidanceMode
  );
  const { completedActions } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const snapshot = metrics.snapshot;
  const impactSummary = useMemo(
    () =>
      getMonthlyActionImpactSummary(completedActions, {
        periodKey: getMonthlyPlanPeriodKey()
      }),
    [completedActions]
  );
  const spendingSignals = [
    ...impactSummary.limitCommitments.filter(
      (item) => item.target === "cashflow" || item.target === "small_expenses"
    ),
    ...impactSummary.insightSignals.filter(
      (item) => item.target === "cashflow" || item.target === "small_expenses"
    )
  ];
  const expenseCategories = useMemo(
    () => getRecurringExpenseCategories(onboarding.expenseCategories),
    [onboarding.expenseCategories]
  );
  const savedCategoryAmounts = useMemo(
    () =>
      normalizeExpenseCategoryAmounts(
        onboarding.expenseCategoryAmounts,
        expenseCategories
      ),
    [expenseCategories, onboarding.expenseCategoryAmounts]
  );
  const [categoryAmountInputs, setCategoryAmountInputs] = useState<CategoryAmountInputs>(() =>
    getCategoryAmountInputValues(expenseCategories, savedCategoryAmounts)
  );
  const [categoryAmountFeedback, setCategoryAmountFeedback] = useState<string | null>(null);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>(
    expenseCategories
  );
  const hasExactMonthlyExpenses = snapshot.sourceMap.monthlyExpenses === "exact";
  const isCashflowExact =
    snapshot.sourceMap.monthlyIncome === "exact" &&
    snapshot.sourceMap.monthlyExpenses === "exact" &&
    (snapshot.cashflow.monthlyExpensesIncludesSmallExpenses ||
      snapshot.sourceMap.smallExpenses === "exact" ||
      snapshot.sourceMap.smallExpenses === "reported_none") &&
    !snapshot.debt.isPaymentEstimated;
  const monthlyExpensesLabel = snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
    ? "Gastos mensuales"
    : "Gastos principales";
  const categoryAmountsFromInputs = useMemo(
    () => getCategoryAmountsFromInputs(expenseCategories, categoryAmountInputs),
    [categoryAmountInputs, expenseCategories]
  );
  const categorizedAmountTotal = useMemo(
    () => getCategoryAmountsTotal(categoryAmountsFromInputs),
    [categoryAmountsFromInputs]
  );
  const prioritizedExpenseCategories = useMemo(
    () => getPrioritizedCategoryLabels(expenseCategories, savedCategoryAmounts),
    [expenseCategories, savedCategoryAmounts]
  );
  const hasCategoryAmountChanges = haveCategoryAmountsChanged(
    savedCategoryAmounts,
    categoryAmountsFromInputs
  );
  const expenseBarWidth = metrics.expensePercentage ?? 0;
  const expensesMayExceedIncome =
    metrics.expensePercentage !== null && metrics.expensePercentage >= 100;
  const expensesAreHigh =
    metrics.expensePercentage !== null && metrics.expensePercentage >= 85;
  const cashflowTone: Tone =
    metrics.estimatedMargin === null ? "neutral" : metrics.estimatedMargin <= 0 ? "warning" : "support";
  const hasPositiveMargin = metrics.estimatedMargin !== null && metrics.estimatedMargin > 0;
  const hasNoMargin = metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0;
  const navigate = (route: Route) => router.push(route);

  useEffect(() => {
    setCategoryAmountInputs(getCategoryAmountInputValues(expenseCategories, savedCategoryAmounts));
  }, [expenseCategories, savedCategoryAmounts]);

  useEffect(() => {
    if (!isEditingCategories) {
      setSelectedExpenseCategories(expenseCategories);
    }
  }, [expenseCategories, isEditingCategories]);

  const toggleExpenseCategory = (category: string) => {
    setSelectedExpenseCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const cancelCategoryEditing = () => {
    setSelectedExpenseCategories(expenseCategories);
    setIsEditingCategories(false);
  };

  const saveExpenseCategories = () => {
    if (selectedExpenseCategories.length === 0) {
      return;
    }

    const syncedExpenseData = syncDebtExpenseCategory({
      debts: onboarding.debts,
      expenseCategories: selectedExpenseCategories,
      expenseCategoryAmounts: onboarding.expenseCategoryAmounts,
      preserveExistingReference: true
    });

    updateOnboarding(syncedExpenseData);
    setCategoryAmountFeedback(null);
    setIsEditingCategories(false);
  };

  const updateCategoryAmountInput = (category: string, value: string) => {
    setCategoryAmountFeedback(null);
    setCategoryAmountInputs((currentInputs) => ({
      ...currentInputs,
      [category]: getFormattedCurrencyInput(value)
    }));
  };

  const saveCategoryAmounts = () => {
    const legacyDebtCategoryAmounts = Object.entries(
      onboarding.expenseCategoryAmounts ?? {}
    ).reduce<Record<string, number>>((amounts, [category, amount]) => {
      if (isDebtExpenseCategory(category)) {
        amounts[category] = amount;
      }

      return amounts;
    }, {});

    updateOnboarding({
      expenseCategories,
      expenseCategoryAmounts: {
        ...legacyDebtCategoryAmounts,
        ...normalizeExpenseCategoryAmounts(categoryAmountsFromInputs, expenseCategories)
      }
    });
    setCategoryAmountFeedback("saved");
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
          <View style={[styles.headerCard, isPhone && styles.cardPhone]}>
            <View style={styles.headerIcon}>
              <ReceiptText color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>Tus gastos</Text>
            </View>
          </View>

          <SpendingSectionTabs activeTab="spending" />

          <SpendingSectionContent activeTab="spending">
          <View style={[styles.heroCard, isPhone && styles.cardPhone]}>
            <View style={styles.heroTextGroup}>
              <View style={styles.heroTopRow}>
                <Chip label={getExpenseSourceLabel(snapshot.sourceMap.monthlyExpenses)} tone={hasExactMonthlyExpenses ? "support" : snapshot.sourceMap.monthlyExpenses === "missing" ? "neutral" : "primary"} />
              </View>
              <Text style={styles.heroKicker}>{monthlyExpensesLabel}</Text>
              <Text style={styles.heroAmount}>
                {getAmountLabel(metrics.expenseMidpoint, hasExactMonthlyExpenses)}
              </Text>
              <Text style={styles.heroInsight}>{getQuickReadText(metrics)}</Text>
            </View>
          </View>

          <View style={[styles.comparisonCard, isPhone && styles.cardPhone]}>
            <View style={styles.comparisonHeader}>
              <View style={styles.comparisonTitleGroup}>
                <IconBubble
                  icon={<PieChart color={expensesAreHigh ? "#C2410C" : colors.primary} size={20} strokeWidth={2.4} />}
                  size="small"
                  tone={expensesAreHigh ? "warning" : "primary"}
                />
                <Text style={styles.comparisonTitle}>Relación salidas vs ingresos</Text>
                <FinancialEducationModal
                  accessibilityLabel="Explicar la relación entre salidas e ingresos"
                  guidanceMode={guidanceMode}
                  icon={<PieChart color={colors.primary} size={23} strokeWidth={2.4} />}
                  title="Cómo leer tus salidas frente a tus ingresos"
                >
                  <FinancialEducationStory
                    calculationItems={[
                      {
                        label: monthlyExpensesLabel,
                        value:
                          metrics.expenseMidpoint !== null
                            ? formatCOP(metrics.expenseMidpoint)
                            : "Por calcular"
                      },
                      {
                        label: "Gastos pequeños",
                        operator: snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
                          ? undefined
                          : "+",
                        value: getSmallExpensesComparisonValue(metrics)
                      },
                      {
                        label: "Cuotas de deuda",
                        operator: "+",
                        value: getDebtPaymentsComparisonValue(metrics)
                      },
                      {
                        label: "Salidas mensuales",
                        operator: "=",
                        value:
                          snapshot.cashflow.totalMonthlyOutflow !== null
                            ? formatCOP(snapshot.cashflow.totalMonthlyOutflow)
                            : "Por calcular"
                      },
                      {
                        label: "Ingresos mensuales",
                        operator: "÷",
                        value:
                          metrics.incomeMidpoint !== null
                            ? formatCOP(metrics.incomeMidpoint)
                            : "Por calcular"
                      },
                      {
                        emphasis: true,
                        label: "Relación",
                        operator: "=",
                        value: getPercentageLabel(
                          metrics.expensePercentage,
                          isCashflowExact
                        )
                      }
                    ]}
                    calculationTitle="Cómo obtenemos el porcentaje"
                    definition={
                      snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
                        ? "Esta relación usa tus gastos mensuales —que ya incluyen los gastos pequeños— y suma las cuotas de deuda."
                        : "Esta relación suma gastos principales, gastos pequeños y cuotas de deuda para mostrar qué parte de tus ingresos ya está comprometida."
                    }
                    guidanceMode={guidanceMode}
                    plainLanguage={
                      metrics.expensePercentage !== null
                        ? `De cada $100 que ingresan, aproximadamente $${Math.round(
                            metrics.expensePercentage
                          )} se destinan a salidas mensuales.`
                        : snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
                          ? "Necesitamos ingresos y gastos mensuales para calcular esta relación."
                          : "Necesitamos ingresos, gastos principales y gastos pequeños para calcular esta relación."
                    }
                    plainLanguageBadge={
                      metrics.expensePercentage !== null
                        ? `$${Math.round(metrics.expensePercentage)}`
                        : "—"
                    }
                    resultDescription={getQuickReadText(metrics)}
                    resultLabel="Parte del ingreso usada en salidas"
                    resultValue={getPercentageLabel(
                      metrics.expensePercentage,
                      isCashflowExact
                    )}
                    tone={
                      expensesMayExceedIncome
                        ? "critical"
                        : expensesAreHigh
                          ? "warning"
                          : metrics.expensePercentage !== null
                            ? "positive"
                            : "neutral"
                    }
                  />
                </FinancialEducationModal>
              </View>
              <View
                style={[
                  styles.comparisonPercentBadge,
                  expensesMayExceedIncome && styles.comparisonPercentBadgeWarning
                ]}
              >
                <Text
                  style={[
                    styles.comparisonValue,
                    expensesMayExceedIncome && styles.comparisonValueWarning
                  ]}
                >
                  {getPercentageLabel(metrics.expensePercentage, isCashflowExact)}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.progressTrack,
                hasPositiveMargin && styles.progressTrackMargin,
                hasNoMargin && styles.progressTrackWarning
              ]}
            >
              <View
                style={[
                  styles.expenseFill,
                  expensesAreHigh && styles.expenseFillWarning,
                  { width: toPercentWidth(expenseBarWidth) }
                ]}
              />
            </View>
            <View style={styles.comparisonMetrics}>
              <ComparisonMetric
                label={monthlyExpensesLabel}
                tone={expensesAreHigh ? "warning" : "primary"}
                value={getAmountLabel(metrics.expenseMidpoint, hasExactMonthlyExpenses)}
              />
              <ComparisonMetric
                label="Gastos pequeños"
                tone="warning"
                value={getSmallExpensesComparisonValue(metrics)}
              />
              <ComparisonMetric
                label="Cuotas de deuda"
                tone="neutral"
                value={getDebtPaymentsComparisonValue(metrics)}
              />
              <ComparisonMetric
                label={getCashflowMetricLabel(isCashflowExact)}
                tone={cashflowTone}
                value={getCashflowMetricValue(metrics)}
              />
            </View>
          </View>

          {spendingSignals.length > 0 ? (
            <SectionCard
              compact={isPhone}
              icon={<CalendarCheck color={colors.primary} size={20} strokeWidth={2.4} />}
              title="Señales del plan mensual"
              subtitle="No reducen tus gastos automáticamente; sirven para revisar el mes."
            >
              <View style={styles.planSignalsList}>
                {spendingSignals.slice(0, 3).map((signal) => (
                  <View key={signal.progressId} style={styles.planSignalRow}>
                    <Chip
                      label={signal.kind === "limit_commitment" ? "Compromiso" : "Observación"}
                      tone={signal.kind === "limit_commitment" ? "warning" : "primary"}
                    />
                    <View style={styles.planSignalCopy}>
                      <Text style={styles.planSignalTitle}>{signal.label}</Text>
                      <Text style={styles.planSignalText}>
                        {signal.amount !== null
                          ? `${formatCOP(signal.amount)} registrados como referencia.`
                          : signal.detail ?? "Registro cualitativo para orientar el próximo ajuste."}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.helperText}>
                Cuando confirmes si un límite funcionó, podremos convertirlo en ahorro observado.
              </Text>
            </SectionCard>
          ) : null}

          <SectionCard
            compact={isPhone}
            actionLabel={
              expenseCategories.length > 0
                ? isEditingCategories
                  ? "Cancelar"
                  : "Administrar"
                : undefined
            }
            icon={<ReceiptText color={colors.primary} size={20} strokeWidth={2.4} />}
            onActionPress={
              isEditingCategories
                ? cancelCategoryEditing
                : () => setIsEditingCategories(true)
            }
            subtitle={
              expenseCategories.length === 0
                ? "Elige las categorías que forman parte de un mes habitual."
                : undefined
            }
            title="Categorías principales"
          >
            {expenseCategories.length === 0 || isEditingCategories ? (
              <View style={styles.categorySelectionSection}>
                <Text style={styles.text}>
                  Esto nos ayudará a organizar tus gastos cuando quieras detallarlos. No necesitas
                  ingresar montos ahora.
                </Text>
                <View style={styles.categorySelectionGrid}>
                  {selectableExpenseCategories.map((category) => {
                    const visual = getCategoryVisual(category);

                    return (
                      <CategoryChip
                        key={category}
                        backgroundColor={visual.backgroundColor}
                        color={visual.color}
                        icon={visual.icon}
                        label={category}
                        onPress={() => toggleExpenseCategory(category)}
                        selected={selectedExpenseCategories.includes(category)}
                        style={styles.categorySelectionChip}
                      />
                    );
                  })}
                </View>
                <View style={styles.categorySaveRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: selectedExpenseCategories.length === 0 }}
                    disabled={selectedExpenseCategories.length === 0}
                    onPress={saveExpenseCategories}
                    style={({ pressed }) => [
                      styles.categorySaveButton,
                      selectedExpenseCategories.length === 0 && styles.categorySaveButtonDisabled,
                      pressed && selectedExpenseCategories.length > 0 && styles.pressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.categorySaveButtonText,
                        selectedExpenseCategories.length === 0 &&
                          styles.categorySaveButtonTextDisabled
                      ]}
                    >
                      Guardar categorías
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.categoryAmountSection}>
                <CategoryCoverageSummary
                  categorizedAmount={categorizedAmountTotal}
                  isExactMonthlyExpense={hasExactMonthlyExpenses}
                  totalExpenses={metrics.expenseMidpoint}
                  totalExpensesLabel={monthlyExpensesLabel}
                />
                <View style={styles.categoryAmountList}>
                  {prioritizedExpenseCategories.map((category) => (
                    <CategoryAmountRow
                      key={category}
                      isExactMonthlyExpense={hasExactMonthlyExpenses}
                      inputValue={categoryAmountInputs[category] ?? ""}
                      label={category}
                      locked={isDebtExpenseCategory(category)}
                      onManagePress={() => router.push("/debts")}
                      onChangeText={(value) => updateCategoryAmountInput(category, value)}
                      totalExpenses={metrics.expenseMidpoint}
                      totalExpensesLabel={monthlyExpensesLabel}
                    />
                  ))}
                </View>
                <View style={styles.categorySaveRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !hasCategoryAmountChanges }}
                    disabled={!hasCategoryAmountChanges}
                    onPress={saveCategoryAmounts}
                    style={({ pressed }) => [
                      styles.categorySaveButton,
                      !hasCategoryAmountChanges && styles.categorySaveButtonDisabled,
                      pressed && hasCategoryAmountChanges && styles.pressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.categorySaveButtonText,
                        !hasCategoryAmountChanges && styles.categorySaveButtonTextDisabled
                      ]}
                    >
                      {categoryAmountFeedback ? "Guardado" : "Guardar montos"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </SectionCard>

          <SectionCard
            compact={isPhone}
            actionLabel="Revisar"
            icon={<Coffee color="#B45309" size={20} strokeWidth={2.4} />}
            onActionPress={() => router.push({ pathname: "/small-expenses", params: { source: "spending" } })}
            title="Gastos pequeños frecuentes"
          >
            <View style={styles.smallExpensesSummary}>
              <Text style={styles.smallExpensesLabel}>Monto mensual</Text>
              <Text style={styles.smallExpensesValue}>{getSmallExpensesValue(metrics)}</Text>
              <Text style={styles.helperText}>
                {data.hasSmallExpenses === "No"
                  ? "No usamos este rubro para estimar aportes."
                  : data.smallExpensesRange ?? "Sin rango definido."}
              </Text>
            </View>
            <Text style={styles.text}>{getSmallExpensesText(data, metrics)}</Text>
          </SectionCard>

          </SpendingSectionContent>
        </View>
      </ScrollView>

      <BottomNavigation activeRoute="/spending" />
      <View style={styles.hidden}>
        <BottomNavItem icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
        <BottomNavItem active icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
        <BottomNavItem icon={Flag} onNavigate={navigate} route="/goals-overview" title="Metas" />
        <BottomNavItem icon={LineChart} onNavigate={navigate} route="/simulation" title="Simulación" />
        <BottomNavItem icon={Bot} onNavigate={navigate} route="/assistant" title="Asistente" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 760,
    width: "100%"
  },
  headerCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  titlePhone: {
    fontSize: typography.heroTitle,
    lineHeight: typography.lineHeight.heroTitle
  },
  heroCard: {
    ...shadows.card,
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  heroTextGroup: {
    gap: spacing.xs,
    minWidth: 0,
    width: "100%"
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  heroKicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xs
  },
  heroAmount: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  heroText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  heroInsight: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs
  },
  comparisonCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  comparisonHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  comparisonTitleGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 220
  },
  comparisonTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  comparisonPercentBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBD3FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  comparisonPercentBadgeWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  comparisonValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  comparisonValueWarning: {
    color: "#C2410C"
  },
  progressTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden",
    position: "relative"
  },
  progressTrackMargin: {
    backgroundColor: colors.support
  },
  progressTrackWarning: {
    backgroundColor: "#FED7AA"
  },
  expenseFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0
  },
  expenseFillWarning: {
    backgroundColor: "#F97316"
  },
  comparisonMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  comparisonMetric: {
    backgroundColor: "#F8FBFF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 190,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 74,
    padding: spacing.sm
  },
  comparisonMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  comparisonMetricDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  comparisonMetricLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  comparisonMetricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  planSignalsList: {
    gap: spacing.sm
  },
  planSignalRow: {
    alignItems: "flex-start",
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md
  },
  planSignalCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 190
  },
  planSignalTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  planSignalText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  sectionCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  cardPhone: {
    padding: spacing.md
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  sectionAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42
  },
  sectionActionText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categoryAmountSection: {
    gap: spacing.md
  },
  categorySelectionSection: {
    gap: spacing.md
  },
  categorySelectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categorySelectionChip: {
    flexBasis: 150
  },
  categorySummaryCard: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  categorySummaryCardWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  categorySummaryHeader: {
    gap: spacing.xs
  },
  categorySummaryTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categorySummaryText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  categorySummaryWarningText: {
    color: "#92400E"
  },
  categorySummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categorySummaryMetric: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: 2,
    minHeight: 64,
    padding: spacing.sm
  },
  categorySummaryMetricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  categorySummaryMetricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categoryAmountList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categoryAmountRow: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 210,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 136,
    padding: spacing.md
  },
  categoryMainRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0
  },
  categoryIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  categoryLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categoryTextGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  categoryHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  categoryShareBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  categoryShareText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  categoryInputRow: {
    gap: spacing.xs
  },
  categoryInputLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  categoryInputShell: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38
  },
  categoryAmountInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    minHeight: 34,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  categoryManagedButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  categoryManagedTextGroup: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  categoryManagedAmount: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categoryManagedHelper: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  categoryShareTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 8,
    overflow: "hidden"
  },
  categoryShareFill: {
    borderRadius: radius.pill,
    height: "100%"
  },
  categorySaveRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start"
  },
  categorySaveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center"
  },
  categorySaveButtonDisabled: {
    backgroundColor: "#E2E8F0"
  },
  categorySaveButtonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categorySaveButtonTextDisabled: {
    color: colors.textSubtle
  },
  smallExpensesSummary: {
    gap: spacing.xs
  },
  smallExpensesLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  smallExpensesValue: {
    color: "#B45309",
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  iconBubbleSmall: {
    height: 38,
    width: 38
  },
  iconBubbleLarge: {
    height: 92,
    width: 92
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipText: {
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  hidden: {
    display: "none"
  },
  bottomNav: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 760,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    width: "100%"
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minHeight: 68,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    position: "relative"
  },
  navActiveLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    position: "absolute",
    top: -spacing.xs,
    width: "100%"
  },
  navText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  navTextActive: {
    color: colors.primary
  }
});
