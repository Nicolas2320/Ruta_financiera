import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Asset } from "expo-asset";
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
  PieChart,
  ReceiptText,
  ShoppingBag,
  Users
} from "lucide-react-native";
import type { ViewStyle } from "react-native";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { normalizeExpenseCategoryAmounts } from "../types/financial";
import { getMonthlyActionImpactSummary } from "../utils/actionProgressImpact";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";
import {
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  type MonthlyPlanData,
  type MonthlyPlanMetrics
} from "../utils/monthlyPlan";

const expensesCupReceipt = require("../assets/illustrations/expenses-cup-receipt.png");
const expensesCupReceiptUri = Asset.fromModule(expensesCupReceipt).uri;
const webHeroImageStyle = {
  backgroundImage: `url(${expensesCupReceiptUri})`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain"
} as unknown as ViewStyle;

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

type CategorySpendingItem = {
  amount: number | null;
  index: number;
  label: string;
  share: number | null;
};

type OpportunityInsight = {
  impact: string;
  label: string;
  text: string;
};

const defaultCategoryVisual: CategoryVisual = {
  icon: CircleEllipsis,
  color: colors.textSubtle,
  backgroundColor: "#EEF2F7"
};

const categoryVisuals: Record<string, CategoryVisual> = {
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

function getCategoryShareLabel(amount: number | null, totalExpenses: number | null) {
  const share = getCategorySharePercentage(amount, totalExpenses);
  if (share === null) {
    return "-";
  }

  return share > 100 ? "100%+" : `${share}%`;
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

function getCategorySpendingItems(
  categories: string[],
  amounts: Record<string, number>,
  totalExpenses: number | null
): CategorySpendingItem[] {
  return categories
    .map((category, index) => {
      const amount = amounts[category] ?? null;

      return {
        amount,
        index,
        label: category,
        share: getCategorySharePercentage(amount, totalExpenses)
      };
    })
    .sort((leftItem, rightItem) => {
      if (leftItem.amount !== null && rightItem.amount !== null) {
        return rightItem.amount - leftItem.amount;
      }

      if (leftItem.amount !== null) {
        return -1;
      }

      if (rightItem.amount !== null) {
        return 1;
      }

      return leftItem.index - rightItem.index;
    });
}

function getTopKnownCategory(categoryItems: CategorySpendingItem[]) {
  return categoryItems.find((categoryItem) => categoryItem.amount !== null && categoryItem.amount > 0) ?? null;
}

function roundMonthlyImpact(value: number) {
  return Math.max(1000, Math.round(value / 1000) * 1000);
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
    return "Completa ingresos y gastos para ver una lectura rápida.";
  }

  if (metrics.expensePercentage >= 100) {
    return "Tus gastos están por encima de tus ingresos. Conviene revisar una categoría concreta.";
  }

  if (metrics.expensePercentage >= 85) {
    return "Tus gastos están cerca de tus ingresos. Un ajuste pequeño puede darte más margen.";
  }

  if (metrics.expensePercentage >= 70) {
    return "Tus gastos ocupan una parte importante de tus ingresos, pero aún hay espacio para decidir.";
  }

  return "Tus gastos parecen dejar margen para avanzar en tu plan.";
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

function getExpenseSourceText({
  expensesRange,
  source
}: {
  expensesRange: string | null;
  source: string;
}) {
  if (source === "exact") {
    return "Dato mensual ingresado por ti.";
  }

  if (source === "estimated" && expensesRange) {
    return `Basado en tu rango seleccionado: ${expensesRange}.`;
  }

  return "Agrega un rango o un dato manual para estimar mejor tus gastos.";
}

function getCashflowText(metrics: MonthlyPlanMetrics, hasExactMonthlyAmounts: boolean) {
  if (metrics.estimatedMargin === null || metrics.expensePercentage === null) {
    return "Completa ingresos y gastos para calcular esta relación.";
  }

  if (metrics.estimatedMargin < 0) {
    return `Tus gastos superan tus ingresos por ${formatCOP(
      Math.abs(metrics.estimatedMargin)
    )} aprox. Puedes revisar una categoría a la vez.`;
  }

  if (metrics.estimatedMargin === 0) {
    return "Tus ingresos y gastos parecen quedar muy cerca. Un ajuste pequeño puede darte más espacio.";
  }

  return `Margen mensual ${hasExactMonthlyAmounts ? "calculado" : "estimado"}: ${formatCOP(
    metrics.estimatedMargin
  )}.`;
}

function getSmallExpensesValue(metrics: MonthlyPlanMetrics) {
  const { amount } = metrics.snapshot.smallExpenses;
  const source = metrics.snapshot.sourceMap.smallExpenses;

  if (source === "unknown") {
    return "No claro aún";
  }

  if (amount === null) {
    return "No disponible";
  }

  return source === "exact" ? formatCOP(amount) : `${formatCOP(amount)} aprox.`;
}

function getSmallExpensesToIncomePercentage(metrics: MonthlyPlanMetrics) {
  const smallExpenses = metrics.snapshot.smallExpenses.amount;
  const income = metrics.incomeMidpoint;

  if (smallExpenses === null || income === null || income <= 0) {
    return null;
  }

  return Math.round((smallExpenses / income) * 100);
}

function getSmallExpensesShareText(metrics: MonthlyPlanMetrics) {
  const smallExpenses = metrics.snapshot.smallExpenses.amount;

  if (metrics.snapshot.sourceMap.smallExpenses === "unknown") {
    return "Gastos pequeños: monto no claro aún.";
  }

  if (smallExpenses === null) {
    return "Gastos pequeños: sin monto disponible.";
  }

  const expenseShare =
    metrics.expenseMidpoint !== null && metrics.expenseMidpoint > 0
      ? Math.round((smallExpenses / metrics.expenseMidpoint) * 100)
      : null;

  return `Gastos pequeños: ${formatCOP(smallExpenses)}${
    metrics.snapshot.sourceMap.smallExpenses === "exact" ? "" : " aprox."
  }${
    expenseShare !== null ? ` · ${expenseShare}% de tus gastos` : ""
  }`;
}

function getSmallExpensesText(data: MonthlyPlanData, metrics: MonthlyPlanMetrics) {
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

function getOpportunityInsight(
  categoryItems: CategorySpendingItem[],
  metrics: MonthlyPlanMetrics
): OpportunityInsight {
  const topCategory = getTopKnownCategory(categoryItems);

  if (topCategory?.amount) {
    const monthlyImpact = roundMonthlyImpact(topCategory.amount * 0.05);
    const shareText =
      topCategory.share !== null
        ? topCategory.share > 100
          ? "Este monto supera tu gasto mensual estimado; puede valer la pena revisarlo."
          : `Representa ${topCategory.share}% de tu gasto mensual conocido.`
        : "Es tu categoría con mayor monto conocido.";

    return {
      impact: `Un ajuste de ${formatCOP(monthlyImpact)} al mes sumaría ${formatCOP(
        monthlyImpact * 12
      )} al año.`,
      label: `Revisar ${topCategory.label}`,
      text: `${shareText} Puedes decidir qué conservar y qué ajustar.`
    };
  }

  const smallExpenses = metrics.snapshot.smallExpenses.amount;

  if (smallExpenses !== null && smallExpenses > 0) {
    const monthlyImpact = roundMonthlyImpact(smallExpenses * 0.1);

    return {
      impact: `Ajustar ${formatCOP(monthlyImpact)} al mes sumaría ${formatCOP(
        monthlyImpact * 12
      )} al año.`,
      label: "Revisar gastos pequeños",
      text: "Una oportunidad puede estar en consumos repetidos que no siempre se sienten grandes."
    };
  }

  if (metrics.expenseMidpoint !== null && metrics.expenseMidpoint > 0) {
    const monthlyImpact = roundMonthlyImpact(metrics.expenseMidpoint * 0.03);

    return {
      impact: `${formatCOP(monthlyImpact)} al mes equivalen a ${formatCOP(
        monthlyImpact * 12
      )} al año.`,
      label: "Elegir una categoría",
      text: "Puedes ingresar montos en tus categorías para encontrar una oportunidad más concreta."
    };
  }

  return {
    impact: "Cuando tengas un gasto mensual, calcularemos un impacto simple.",
    label: "Completar tus datos",
    text: "Con ingresos, gastos y categorías podremos mostrar una oportunidad útil."
  };
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
  children
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
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

function CategoryAmountRow({
  inputValue,
  label,
  onChangeText,
  totalExpenses
}: {
  inputValue: string;
  label: string;
  onChangeText: (value: string) => void;
  totalExpenses: number | null;
}) {
  const visual = getCategoryVisual(label);
  const Icon = visual.icon;
  const amount = parseCOPInput(inputValue);
  const sharePercentage = getCategorySharePercentage(amount, totalExpenses);

  return (
    <View style={styles.categoryAmountRow}>
      <View style={styles.categoryMainRow}>
        <View style={[styles.categoryIcon, { backgroundColor: visual.backgroundColor }]}>
          <Icon color={visual.color} size={20} strokeWidth={2.4} />
        </View>
        <Text numberOfLines={1} style={styles.categoryLabel}>{label}</Text>
      </View>
      <View style={styles.categoryInputRow}>
        <TextInput
          accessibilityLabel={`Monto mensual en ${label}`}
          inputMode="numeric"
          keyboardType="numeric"
          onChangeText={onChangeText}
          placeholder="$0"
          placeholderTextColor={colors.textSubtle}
          style={styles.categoryAmountInput}
          value={inputValue}
        />
        <Text style={[styles.categoryShareText, { color: visual.color }]}>
          {getCategoryShareLabel(amount, totalExpenses)}
        </Text>
      </View>
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

function HeroIllustration() {
  if (Platform.OS === "web") {
    return <View accessibilityRole="image" style={[styles.heroImage, webHeroImageStyle]} />;
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={expensesCupReceipt}
      style={styles.heroImage}
    />
  );
}

function EmptyState({
  text,
  actionLabel,
  onPress
}: {
  text: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.text}>{text}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
      >
        <Text style={styles.inlineButtonText}>{actionLabel}</Text>
        <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
      </Pressable>
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
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
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
  const expenseCategories = onboarding.expenseCategories;
  const savedCategoryAmounts = useMemo(
    () => normalizeExpenseCategoryAmounts(onboarding.expenseCategoryAmounts, expenseCategories),
    [expenseCategories, onboarding.expenseCategoryAmounts]
  );
  const [categoryAmountInputs, setCategoryAmountInputs] = useState<CategoryAmountInputs>(() =>
    getCategoryAmountInputValues(expenseCategories, savedCategoryAmounts)
  );
  const [categoryAmountFeedback, setCategoryAmountFeedback] = useState<string | null>(null);
  const hasExactMonthlyExpenses = snapshot.sourceMap.monthlyExpenses === "exact";
  const hasExactMonthlyAmounts =
    snapshot.sourceMap.monthlyIncome === "exact" &&
    snapshot.sourceMap.monthlyExpenses === "exact";
  const categoryAmountsFromInputs = useMemo(
    () => getCategoryAmountsFromInputs(expenseCategories, categoryAmountInputs),
    [categoryAmountInputs, expenseCategories]
  );
  const prioritizedExpenseCategories = useMemo(
    () => getPrioritizedCategoryLabels(expenseCategories, savedCategoryAmounts),
    [expenseCategories, savedCategoryAmounts]
  );
  const categorySpendingItems = useMemo(
    () => getCategorySpendingItems(expenseCategories, categoryAmountsFromInputs, metrics.expenseMidpoint),
    [categoryAmountsFromInputs, expenseCategories, metrics.expenseMidpoint]
  );
  const opportunityInsight = useMemo(
    () => getOpportunityInsight(categorySpendingItems, metrics),
    [categorySpendingItems, metrics]
  );
  const hasCategoryAmountChanges = haveCategoryAmountsChanged(
    savedCategoryAmounts,
    categoryAmountsFromInputs
  );
  const expenseBarWidth = metrics.expensePercentage ?? 0;
  const smallExpensesBarWidth = getSmallExpensesToIncomePercentage(metrics) ?? 0;
  const expensesMayExceedIncome =
    metrics.expensePercentage !== null && metrics.expensePercentage >= 100;
  const expensesAreHigh =
    metrics.expensePercentage !== null && metrics.expensePercentage >= 85;
  const navigate = (route: Route) => router.push(route);

  useEffect(() => {
    setCategoryAmountInputs(getCategoryAmountInputValues(expenseCategories, savedCategoryAmounts));
  }, [expenseCategories, savedCategoryAmounts]);

  const updateCategoryAmountInput = (category: string, value: string) => {
    setCategoryAmountFeedback(null);
    setCategoryAmountInputs((currentInputs) => ({
      ...currentInputs,
      [category]: getFormattedCurrencyInput(value)
    }));
  };

  const saveCategoryAmounts = () => {
    updateOnboarding({
      expenseCategoryAmounts: normalizeExpenseCategoryAmounts(
        categoryAmountsFromInputs,
        expenseCategories
      )
    });
    setCategoryAmountFeedback("Montos guardados.");
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Gastos</Text>
              <Text style={styles.subtitle}>
                Entiende cuánto se va al mes y dónde podrías revisar.
              </Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTextGroup}>
              <View style={styles.heroTopRow}>
                <Chip label={getExpenseSourceLabel(snapshot.sourceMap.monthlyExpenses)} tone={hasExactMonthlyExpenses ? "support" : snapshot.sourceMap.monthlyExpenses === "missing" ? "neutral" : "primary"} />
              </View>
              <Text style={styles.heroKicker}>Gasto mensual</Text>
              <Text style={styles.heroAmount}>
                {getAmountLabel(metrics.expenseMidpoint, hasExactMonthlyExpenses)}
              </Text>
              <Text style={styles.heroText}>
                {getExpenseSourceText({
                  expensesRange: onboarding.expensesRange,
                  source: snapshot.sourceMap.monthlyExpenses
                })}
              </Text>
              <Text style={styles.heroInsight}>{getQuickReadText(metrics)}</Text>
            </View>
            <HeroIllustration />
          </View>

          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>Relación gastos vs ingresos</Text>
              <Text
                style={[
                  styles.comparisonValue,
                  expensesMayExceedIncome && styles.comparisonValueWarning
                ]}
              >
                {getPercentageLabel(metrics.expensePercentage, hasExactMonthlyAmounts)}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.expenseFill,
                  expensesAreHigh && styles.expenseFillWarning,
                  { width: toPercentWidth(expenseBarWidth) }
                ]}
              />
              {smallExpensesBarWidth > 0 ? (
                <View
                  style={[
                    styles.smallExpenseFill,
                    { width: toPercentWidth(smallExpensesBarWidth) }
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.comparisonLegend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    styles.legendDotExpenses,
                    expensesAreHigh && styles.legendDotExpensesWarning
                  ]}
                />
                <Text style={[styles.legendText, expensesAreHigh && styles.legendTextWarning]}>
                  Gastos mensuales: {getAmountLabel(metrics.expenseMidpoint, hasExactMonthlyExpenses)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotSmallExpenses]} />
                <Text style={styles.legendText}>{getSmallExpensesShareText(metrics)}</Text>
              </View>
            </View>
            <Text style={styles.helperText}>{getCashflowText(metrics, hasExactMonthlyAmounts)}</Text>
          </View>

          <View style={styles.opportunityCard}>
            <View style={styles.opportunityHeader}>
              <IconBubble
                icon={<LineChart color={colors.support} size={20} strokeWidth={2.4} />}
                size="small"
                tone="support"
              />
              <Text style={styles.sectionTitle}>Tu mayor oportunidad este mes</Text>
            </View>
            <Text style={styles.opportunityLabel}>{opportunityInsight.label}</Text>
            <Text style={styles.text}>{opportunityInsight.text}</Text>
            <View style={styles.impactBlock}>
              <Text style={styles.impactLabel}>Impacto de un ajuste pequeño</Text>
              <Text style={styles.impactText}>{opportunityInsight.impact}</Text>
            </View>
          </View>

          {spendingSignals.length > 0 ? (
            <SectionCard
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
            actionLabel="Ver todas"
            icon={<ReceiptText color={colors.primary} size={20} strokeWidth={2.4} />}
            onActionPress={() => router.push({ pathname: "/expenses", params: { source: "spending" } })}
            title="Categorías principales"
          >
            {expenseCategories.length > 0 ? (
              <View style={styles.categoryAmountSection}>
                <View style={styles.categoryAmountList}>
                  {prioritizedExpenseCategories.map((category) => (
                    <CategoryAmountRow
                      key={category}
                      inputValue={categoryAmountInputs[category] ?? ""}
                      label={category}
                      onChangeText={(value) => updateCategoryAmountInput(category, value)}
                      totalExpenses={metrics.expenseMidpoint}
                    />
                  ))}
                </View>
                <View style={styles.categorySaveRow}>
                  {categoryAmountFeedback ? (
                    <Text style={styles.categoryFeedbackText}>{categoryAmountFeedback}</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      Puedes dejar vacías las categorías que no tengas claras.
                    </Text>
                  )}
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
                      Guardar montos
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <EmptyState
                actionLabel="Agregar categorías"
                onPress={() => router.push({ pathname: "/expenses", params: { source: "spending" } })}
                text="Aún no hay categorías de gasto seleccionadas. Puedes agregarlas sin registrar compras una por una."
              />
            )}
          </SectionCard>

          <SectionCard
            actionLabel="Revisar"
            icon={<Coffee color="#B45309" size={20} strokeWidth={2.4} />}
            onActionPress={() => router.push({ pathname: "/small-expenses", params: { source: "spending" } })}
            title="Gastos pequeños frecuentes"
          >
            <View style={styles.smallExpensesSummary}>
              <Text style={styles.smallExpensesLabel}>Monto mensual</Text>
              <Text style={styles.smallExpensesValue}>{getSmallExpensesValue(metrics)}</Text>
              <Text style={styles.helperText}>
                {data.smallExpensesRange ?? "Sin rango definido."}
              </Text>
            </View>
            <Text style={styles.text}>{getSmallExpensesText(data, metrics)}</Text>
            {data.smallExpenseCategories.length > 0 ? (
              <View style={styles.tagRow}>
                {data.smallExpenseCategories.map((category) => (
                  <Chip key={category} label={category} tone="warning" />
                ))}
              </View>
            ) : null}
          </SectionCard>

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
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingBottom: spacing.xs
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  heroCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    padding: spacing.lg
  },
  heroTextGroup: {
    flexBasis: 260,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
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
  heroImage: {
    height: 132,
    width: 132
  },
  comparisonCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  comparisonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  comparisonTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  comparisonValue: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
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
  smallExpenseFill: {
    backgroundColor: "#F59E0B",
    borderRadius: radius.pill,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0
  },
  comparisonLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    flexBasis: 260,
    flexGrow: 1,
    gap: spacing.xs
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  legendDotExpenses: {
    backgroundColor: colors.primary
  },
  legendDotExpensesWarning: {
    backgroundColor: "#F97316"
  },
  legendDotSmallExpenses: {
    backgroundColor: "#F59E0B"
  },
  legendText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  legendTextWarning: {
    color: "#C2410C",
    fontWeight: typography.weight.black
  },
  opportunityCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  opportunityHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  opportunityLabel: {
    color: colors.support,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  impactBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm
  },
  impactLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  impactText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
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
    gap: spacing.sm
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
    gap: spacing.md,
    minHeight: 142,
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
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  categoryInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  categoryAmountInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    color: colors.text,
    flex: 1,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 0
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
    justifyContent: "space-between"
  },
  categoryFeedbackText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    minWidth: 180
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  emptyState: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  inlineButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42
  },
  inlineButtonText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
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
