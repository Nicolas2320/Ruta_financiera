import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowDownCircle,
  Bot,
  CalendarCheck,
  ChevronRight,
  Coffee,
  CreditCard,
  Flag,
  Home,
  LineChart,
  PieChart,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  UserRound
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { FinancialDataStatusScreen } from "../components/FinancialDataStatusScreen";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { getDebtRatioLabel } from "../utils/debtCalculations";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import {
  getGoalPlanFromOnboarding,
  isEmergencyGoal,
  type GoalAllocation
} from "../utils/goalPlanning";
import { formatTargetMonth } from "../utils/monthYear";
import {
  getEffectiveMonthlyPlanProgress,
  removeStoredGoalContributionActionsForPeriod
} from "../utils/monthlyPlanProgress";
import {
  getActiveMonthlyPlanProgressKey,
  getMonthlyActions,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  getMonthlyPlanPriorityKey,
  getMonthlyPlanProgressKey,
  isMonthlyActionCompleted,
  type MonthlyGoalContext
} from "../utils/monthlyPlan";
import {
  getPlanPreferenceGoalBudget,
  getPlanPreferenceGoalPlanOptions,
  getPlanPreferencePreferredGoalId,
  resolvePlanPreference
} from "../utils/planPreference";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Tone = "primary" | "support" | "warning" | "purple" | "neutral" | "danger";

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getDefinedLabel(value: string | null | undefined, fallback = "No definido") {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value;
}

function getAmountLabel(value: number | null, isExact = false) {
  if (value === null) {
    return "No disponible";
  }

  return isExact ? formatCOP(value) : `${formatCOP(value)} aprox.`;
}

function getMarginLabel(value: number | null, isMorePrecise = false) {
  if (value === null) {
    return "No disponible";
  }

  if (value <= 0) {
    return isMorePrecise ? formatSignedCOP(value) : `${formatSignedCOP(value)} aprox.`;
  }

  return isMorePrecise ? formatCOP(value) : `${formatCOP(value)} aprox.`;
}

function getExpensePercentageLabel(value: number | null, isMorePrecise = false) {
  if (value === null) {
    return "No disponible";
  }

  return isMorePrecise ? `${value}%` : `${value}% aprox.`;
}

function getRoundedMonthsLabel(value: number) {
  return value < 10 ? value.toFixed(1).replace(".0", "") : Math.round(value).toString();
}

function getImprovePlanDashboardText(count: number) {
  if (count === 0) {
    return "Agrega 4 datos opcionales para calcular mejor tu margen mensual, fondo de emergencia y avance hacia tu meta.";
  }

  if (count < 4) {
    return "Ya estamos usando algunos datos más claros en tus cálculos.";
  }

  return null;
}

function getImprovePlanActionLabel(count: number) {
  if (count === 0) {
    return "Mejorar mi plan";
  }

  if (count < 4) {
    return "Completar o editar";
  }

  return "Editar datos";
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

function getEmergencyTone(status: string): Tone {
  if (status === "none" || status === "starter") {
    return "warning";
  }

  if (status === "building" || status === "solid" || status === "strong") {
    return "support";
  }

  return "neutral";
}

function getGoalTone(status: string): Tone {
  if (status === "completed_or_ready" || status === "near" || status === "reachable") {
    return "support";
  }

  if (status === "needs_margin" || status === "needs_target" || status === "long_term") {
    return "warning";
  }

  return "primary";
}

function getDashboardDebtTone(level: string): Tone {
  if (level === "none" || level === "low") {
    return "support";
  }

  if (level === "high") {
    return "danger";
  }

  return "warning";
}

function getDashboardDebtText({
  count,
  level,
  monthlyPaymentTotal,
  reportedPaymentKind,
  source
}: {
  count: number;
  level: string;
  monthlyPaymentTotal: number;
  reportedPaymentKind: "exact" | "range" | "share" | null;
  source: string;
}) {
  if (count > 0) {
    return `Tienes ${count} ${count === 1 ? "deuda registrada" : "deudas registradas"}. Usamos estas cuotas para evaluar si una nueva obligación cabe en tu mes.`;
  }

  if (source === "category" && monthlyPaymentTotal > 0) {
    return `Usamos ${formatCOP(monthlyPaymentTotal)} que registraste en gastos como Deudas. Puedes registrar el detalle para mejorar el cálculo.`;
  }

  if (source === "reported") {
    if (reportedPaymentKind === "exact") {
      return "Usamos el pago mensual que informaste. Puedes registrar cada deuda si luego quieres hacerles seguimiento por separado.";
    }

    return monthlyPaymentTotal > 0
      ? reportedPaymentKind === "range"
        ? "Esta es una referencia estimada desde el rango que reportaste. Registra cuotas solo si quieres reemplazarla por datos más precisos."
        : "Esta es una referencia estimada desde la proporción de ingresos que reportaste anteriormente."
      : "Conservamos tu respuesta anterior; falta una referencia de ingresos para estimar el monto mensual.";
  }

  if (level === "none") {
    return "No tienes deudas detalladas registradas. Puedes agregarlas si quieres evaluar una nueva cuota.";
  }

  return monthlyPaymentTotal > 0
    ? "Ya tenemos una referencia de tus pagos de deuda."
    : "Agrega tus cuotas para que el diagnóstico y el evaluador sean más claros.";
}

function isCompletedGoalAllocation(allocation: GoalAllocation) {
  return allocation.viability === "completed" || allocation.goal.status === "completed";
}

function getGoalProgressPercentage(allocation: GoalAllocation | null) {
  if (!allocation) {
    return null;
  }

  if (isCompletedGoalAllocation(allocation)) {
    return 100;
  }

  return allocation.progressPercentage !== null
    ? Math.round(allocation.progressPercentage)
    : null;
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

function IconBubble({
  icon,
  tone = "primary",
  size = "medium"
}: {
  icon: ReactNode;
  tone?: Tone;
  size?: "small" | "medium";
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.iconBubble,
        size === "small" && styles.iconBubbleSmall,
        { backgroundColor: toneColors.background }
      ]}
    >
      {icon}
    </View>
  );
}

function CircleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Abrir configuración"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
    >
      <UserRound color={colors.primary} size={27} strokeWidth={2.4} />
    </Pressable>
  );
}

function MonthlyPlanCard({
  actionCount,
  completed,
  completedCount,
  nextActionTitle,
  onRegisterProgress,
  primaryGoalTitle,
  progressPercentage,
  compact = false
}: {
  actionCount: number;
  completed: boolean;
  completedCount: number;
  nextActionTitle?: string | null;
  onRegisterProgress: () => void;
  primaryGoalTitle?: string | null;
  progressPercentage: number;
  compact?: boolean;
}) {
  return (
    <View style={[styles.monthlyPlanCard, compact && styles.cardPhone]}>
      <View style={styles.monthlyPlanHeading}>
        <View style={styles.monthlyPlanHeadingIcon}>
          <CalendarCheck color={colors.primary} size={22} strokeWidth={2.4} />
        </View>
        <View style={styles.monthlyPlanHeadingCopy}>
          <Text style={styles.monthlyPlanTitle}>Resumen de este mes</Text>
          <Text style={styles.monthlyPlanSubtitle}>
            Revisa el avance de tus acciones y la meta que tiene prioridad.
          </Text>
        </View>
      </View>
      <View style={styles.monthlyPlanBody}>
        <View style={styles.monthlyPlanProgressBlock}>
          <View style={styles.monthlyPlanMetricHeader}>
            <Text style={styles.monthlyPlanMetricLabel}>
              {completed
                ? "Plan completado"
                : `${completedCount} de ${actionCount} acciones completadas`}
            </Text>
            <Text style={styles.monthlyPlanMetricValue}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                completed && styles.progressFillComplete,
                { width: toPercentWidth(progressPercentage) }
              ]}
            />
          </View>
        </View>

        {primaryGoalTitle ? (
          <View style={styles.primaryGoalCard}>
            <View style={styles.primaryGoalIcon}>
              <Flag color={colors.primary} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.primaryGoalCopy}>
              <Text style={styles.primaryGoalLabel}>Meta principal</Text>
              <Text style={styles.primaryGoalTitle}>{primaryGoalTitle}</Text>
            </View>
          </View>
        ) : null}

        {nextActionTitle ? (
          <View style={styles.nextActionCard}>
            <View style={styles.nextActionCopy}>
              <Text style={styles.nextActionLabel}>Siguiente acción</Text>
              <Text style={styles.nextActionTitle}>{nextActionTitle}</Text>
            </View>
            <ChevronRight color="#B45309" size={21} strokeWidth={2.5} />
          </View>
        ) : null}

        <View style={styles.monthlyPlanActions}>
          <Pressable
            accessibilityLabel="Registrar acción del plan mensual"
            accessibilityRole="button"
            onPress={onRegisterProgress}
            style={({ pressed }) => [styles.improveButton, pressed && styles.pressed]}
          >
            <Text style={styles.improveButtonText}>Registrar acción</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
  disabled = false,
  compact = false
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      accessibilityState={{ disabled }}
      pointerEvents={disabled ? "none" : "auto"}
      style={[
        styles.panelCard,
        compact && styles.cardPhone,
        disabled && styles.panelCardDisabled
      ]}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "primary"
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <IconBubble icon={icon} size="small" tone={tone} />
      <View style={styles.metricTextGroup}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: toneColors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ImprovePlanSummaryCard({
  count,
  state,
  onPress,
  disabled = false
}: {
  count: number;
  state: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const isComplete = count === 4;
  const tone: Tone = disabled
    ? "neutral"
    : count === 0
      ? "neutral"
      : isComplete
        ? "support"
        : "primary";
  const improveText = getImprovePlanDashboardText(count);

  return (
    <View style={styles.improveSummary}>
      <View style={styles.improveHeader}>
        <IconBubble
          icon={<LineChart color={getToneColors(tone).text} size={23} strokeWidth={2.4} />}
          size="small"
          tone={tone}
        />
        <Chip label={disabled ? "Inactivo" : state} tone={tone} />
      </View>

      {improveText ? <Text style={styles.improveText}>{improveText}</Text> : null}

      <View style={styles.precisionProgressBlock}>
        <View style={styles.comparisonHeader}>
          <Text style={styles.precisionProgressText}>{count} de 4 datos agregados</Text>
          <Text style={styles.precisionProgressValue}>{Math.round((count / 4) * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              isComplete && styles.progressFillComplete,
              { width: toPercentWidth((count / 4) * 100) }
            ]}
          />
        </View>
      </View>

      <Pressable
        accessibilityState={{ disabled }}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.improveButton,
          disabled && styles.improveButtonDisabled,
          pressed && styles.pressed
        ]}
      >
        <Text style={[styles.improveButtonText, disabled && styles.improveButtonTextDisabled]}>
          {getImprovePlanActionLabel(count)}
        </Text>
        {!disabled ? <ChevronRight color={colors.surface} size={20} strokeWidth={2.5} /> : null}
      </Pressable>
    </View>
  );
}

function RowCard({
  icon,
  title,
  value,
  text,
  tone = "primary",
  actionLabel,
  onPress,
  children,
  compact = false
}: {
  icon: ReactNode;
  title: string;
  value: string;
  text: string;
  tone?: Tone;
  actionLabel?: string;
  onPress?: () => void;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.rowCard, compact && styles.rowCardPhone]}>
      <IconBubble icon={icon} size="medium" tone={tone} />
      <View style={styles.rowCardBody}>
        <Text style={styles.rowCardTitle}>{title}</Text>
        <View style={styles.rowCardValueLine}>
          <Text style={[styles.rowCardValue, { color: getToneColors(tone).text }]}>{value}</Text>
          {children}
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
      {actionLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.rowCardAction, pressed && styles.pressed]}
        >
          <Text style={styles.rowCardActionText}>{actionLabel}</Text>
          <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
        </Pressable>
      ) : (
        compact ? null : <ChevronRight color={colors.textSubtle} size={24} strokeWidth={2.2} />
      )}
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

export default function DashboardScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const { isAuthReady, session } = useAuth();
  const { exactValues, hasCompletedOnboarding, onboarding, onboardingSyncStatus } =
    useOnboarding();
  const { completedActions } = usePlan();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!session) {
      router.replace({
        pathname: "/auth",
        params: {
          mode: "sign-in",
          returnTo: "/dashboard"
        }
      });
      return;
    }

    if (onboardingSyncStatus === "loading") {
      return;
    }

    if (!hasCompletedOnboarding) {
      router.replace("/privacy");
    }
  }, [hasCompletedOnboarding, isAuthReady, onboardingSyncStatus, router, session]);

  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const snapshot = metrics.snapshot;
  const periodKey = getMonthlyPlanPeriodKey();
  const planPreference = useMemo(
    () => resolvePlanPreference({ exactValues, onboarding }),
    [exactValues, onboarding]
  );
  const preferredGoalId = getPlanPreferencePreferredGoalId({
    onboarding,
    preference: planPreference
  });
  const preferredPlanPriorityKey =
    planPreference.hasExplicitPreference && planPreference.isApplicable
      ? planPreference.priorityKey
      : null;
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(
      onboarding,
      getPlanPreferenceGoalBudget({
        fallbackMonthlyBudget: snapshot.cashflow.suggestedMonthlyContribution,
        preference: planPreference,
        preferredGoalId
      }),
      exactValues,
      getPlanPreferenceGoalPlanOptions(planPreference, preferredGoalId)
    ),
    [exactValues, onboarding, planPreference, preferredGoalId, snapshot.cashflow.suggestedMonthlyContribution]
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.id === preferredGoalId) ??
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const activeGoalAllocations = goalPlan.allocations.filter(
    (allocation) =>
      allocation.goal.status !== "completed" && allocation.goal.status !== "paused"
  );
  const primaryGoalTitle =
    primaryGoalAllocation?.goal.title ?? snapshot.goal.name ?? data.financialGoal;
  const monthlyGoalContext = useMemo<MonthlyGoalContext>(
    () => ({
      activeGoalCount: activeGoalAllocations.length,
      title: primaryGoalTitle,
      monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
      monthlyContributionTotal: goalPlan.monthlyContributionTotal,
      estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null,
      hasRegisteredContribution: activeGoalAllocations.some(
        (allocation) => allocation.currentAmount > 0
      )
    }),
    [
      activeGoalAllocations,
      goalPlan.monthlyContributionTotal,
      primaryGoalAllocation?.estimatedMonthsToGoal,
      primaryGoalAllocation?.monthlyContribution,
      primaryGoalTitle
    ]
  );
  const suggestedActions = useMemo(
    () => getMonthlyActions(data, metrics, preferredPlanPriorityKey ?? undefined, monthlyGoalContext),
    [data, metrics, monthlyGoalContext, preferredPlanPriorityKey]
  );
  const suggestedPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, suggestedActions, preferredPlanPriorityKey ?? undefined),
    [metrics, preferredPlanPriorityKey, suggestedActions]
  );
  const completedActionsForPlanSelection = useMemo(
    () => removeStoredGoalContributionActionsForPeriod(completedActions, periodKey),
    [completedActions, periodKey]
  );
  const activePlanProgressKey = useMemo(
    () => getActiveMonthlyPlanProgressKey(completedActionsForPlanSelection, suggestedPlanProgressKey),
    [completedActionsForPlanSelection, suggestedPlanProgressKey]
  );
  const activePlanPriorityKey =
    preferredPlanPriorityKey ?? getMonthlyPlanPriorityKey(activePlanProgressKey);
  const actions = useMemo(
    () => getMonthlyActions(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const planProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, actions, activePlanPriorityKey ?? undefined),
    [activePlanPriorityKey, actions, metrics]
  );
  const monthlyPlanProgress = useMemo(
    () =>
      getEffectiveMonthlyPlanProgress({
        actions,
        completedActions: completedActionsForPlanSelection,
        debts: data.debts,
        goalAllocations: goalPlan.allocations,
        periodKey,
        planProgressKey,
        simulationPlanPreference: onboarding.simulationPlanPreference
      }),
    [
      actions,
      completedActionsForPlanSelection,
      data.debts,
      goalPlan.allocations,
      onboarding.simulationPlanPreference,
      periodKey,
      planProgressKey
    ]
  );
  const { completedCount, effectiveCompletedActions } = monthlyPlanProgress;
  const actionCount = actions.length;
  const progressPercentage = actionCount > 0 ? Math.round((completedCount / actionCount) * 100) : 0;
  const nextActionTitle =
    actions.find(
      (action) =>
        !isMonthlyActionCompleted({
          actionId: action.id,
          completedActions: effectiveCompletedActions,
          planProgressKey
        })
    )?.title ?? null;
  const precisionStatus = snapshot.precision;
  const exactMonthlyIncome =
    snapshot.sourceMap.monthlyIncome === "exact" ? snapshot.cashflow.monthlyIncome : null;
  const exactMonthlyExpenses =
    snapshot.sourceMap.monthlyExpenses === "exact" ? snapshot.cashflow.monthlyExpenses : null;
  const currentSavingsIsExact = snapshot.sourceMap.currentSavings === "exact";
  const hasExactCashflowAmounts =
    snapshot.sourceMap.monthlyIncome === "exact" &&
    snapshot.sourceMap.monthlyExpenses === "exact" &&
    (snapshot.cashflow.monthlyExpensesIncludesSmallExpenses ||
      snapshot.sourceMap.smallExpenses === "exact" ||
      snapshot.sourceMap.smallExpenses === "reported_none") &&
    !snapshot.debt.isPaymentEstimated;
  const emergencyTone = getEmergencyTone(snapshot.emergencyFund.status);
  const emergencyStatus = {
    state: snapshot.emergencyFund.label,
    text:
      snapshot.emergencyFund.coverageMonths !== null
        ? `Con estos datos, tu ahorro cubre cerca de ${getRoundedMonthsLabel(snapshot.emergencyFund.coverageMonths)} meses de gastos mensuales registrados.`
        : snapshot.emergencyFund.label,
    tone: emergencyTone
  };
  const hasEmergencyFundGoal = data.goals.some(isEmergencyGoal);
  const totalGoalsCount = goalPlan.allocations.length;
  const completedGoalsCount = goalPlan.allocations.filter(isCompletedGoalAllocation).length;
  const activeGoalsCount = Math.max(totalGoalsCount - completedGoalsCount, 0);
  const goalProgressValues = goalPlan.allocations
    .map(getGoalProgressPercentage)
    .filter((value): value is number => value !== null);
  const aggregateGoalProgressPercentage =
    goalProgressValues.length > 0
      ? Math.round(goalProgressValues.reduce((total, value) => total + value, 0) / goalProgressValues.length)
      : null;
  const primaryGoalProgressPercentage = getGoalProgressPercentage(primaryGoalAllocation);
  const goalProgressPercentage =
    totalGoalsCount > 1 ? aggregateGoalProgressPercentage : primaryGoalProgressPercentage;
  const goalStatus =
    primaryGoalAllocation && isCompletedGoalAllocation(primaryGoalAllocation)
      ? "Meta completada"
      : snapshot.goal.label;
  const expenseBarWidth =
    metrics.expensePercentage !== null ? Math.min(metrics.expensePercentage, 100) : 0;
  const expensesMayExceedIncome =
    metrics.expensePercentage !== null && metrics.expensePercentage > 100;
  const primaryGoalTargetAmount = primaryGoalAllocation?.targetAmount ?? snapshot.goal.targetAmount;
  const primaryGoalTargetMonth = primaryGoalAllocation?.goal.targetMonth
    ? formatTargetMonth(primaryGoalAllocation.goal.targetMonth)
    : "No definido";
  const goalDetailText =
    primaryGoalAllocation && isCompletedGoalAllocation(primaryGoalAllocation)
      ? primaryGoalTargetAmount !== null
        ? `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Meta completada.`
        : "Meta completada."
      : primaryGoalTargetAmount !== null
      ? primaryGoalProgressPercentage !== null
        ? `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Base actual frente a tu objetivo: ${primaryGoalProgressPercentage}% aprox.`
        : `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Mes objetivo: ${primaryGoalTargetMonth}.`
      : `Mes objetivo: ${primaryGoalTargetMonth}. Cifra aproximada: ${getDefinedLabel(data.goalAmountRange, "No definida")}.`;
  const activeGoalsLabel = `${activeGoalsCount} ${activeGoalsCount === 1 ? "activa" : "activas"}`;
  const completedGoalsLabel = `${completedGoalsCount} ${completedGoalsCount === 1 ? "completada" : "completadas"}`;
  const goalsValue =
    totalGoalsCount > 1
      ? completedGoalsCount > 0
        ? activeGoalsCount > 0
          ? `${activeGoalsLabel}, ${completedGoalsLabel}`
          : `${completedGoalsCount} metas completadas`
        : `${totalGoalsCount} metas activas`
      : `Meta: ${getDefinedLabel(primaryGoalTitle ?? data.financialGoal, "No definida")}`;
  const completedGoalsDetail =
    completedGoalsCount > 0
      ? ` ${completedGoalsCount} de ${totalGoalsCount} metas completadas.`
      : "";
  const goalsDetailText =
    totalGoalsCount > 1
      ? `Aporte mensual asignado: ${getAmountLabel(goalPlan.monthlyContributionTotal)} de una referencia de ${getAmountLabel(goalPlan.monthlyGoalBudget)}. Principal: ${getDefinedLabel(primaryGoalTitle, "No definida")}.${completedGoalsDetail}`
      : goalDetailText;
  const goalStatusTone =
    primaryGoalAllocation && isCompletedGoalAllocation(primaryGoalAllocation)
      ? "support"
      : getGoalTone(snapshot.goal.status);
  const goalProgressLabel =
    goalProgressPercentage !== null
      ? `${totalGoalsCount > 1 ? "Avance general" : "Avance"} ${goalProgressPercentage}%`
      : null;
  const completedGoalsChipLabel =
    completedGoalsCount > 0 && totalGoalsCount > 1
      ? `${completedGoalsCount} de ${totalGoalsCount} completadas`
      : null;
  const smallExpensesValue =
    snapshot.cashflow.monthlyExpensesIncludesSmallExpenses &&
    snapshot.smallExpenses.amount === null
      ? "Incluidos en el gasto mensual"
      : snapshot.sourceMap.smallExpenses === "reported_none"
      ? "No identificados"
      : snapshot.smallExpenses.amount !== null
      ? snapshot.sourceMap.smallExpenses === "exact"
        ? formatCOP(snapshot.smallExpenses.amount)
        : `${formatCOP(snapshot.smallExpenses.amount)} aprox.`
      : snapshot.sourceMap.smallExpenses === "unknown"
        ? "Por estimar"
        : `Rango: ${getDefinedLabel(data.smallExpensesRange)}`;
  const smallExpensesText =
    snapshot.cashflow.monthlyExpensesIncludesSmallExpenses &&
    snapshot.smallExpenses.amount === null
      ? "Ya están considerados en el total mensual. Detallarlos después es opcional y no los sumará dos veces."
      : snapshot.smallExpenses.recommendation;
  const hasSmallExpensesDetail =
    data.hasSmallExpenses !== null ||
    data.smallExpensesRange !== null ||
    snapshot.smallExpenses.amount !== null;
  const dashboardDebtTone = getDashboardDebtTone(snapshot.debt.level);
  const dashboardDebtValue =
    snapshot.debt.monthlyPaymentTotal > 0
      ? snapshot.debt.source === "reported"
        ? `${snapshot.debt.isPaymentEstimated ? "Estimado" : "Cuotas"}: ${formatCOP(snapshot.debt.monthlyPaymentTotal)}`
        : snapshot.debt.source === "category"
        ? `Referencia: ${formatCOP(snapshot.debt.monthlyPaymentTotal)}`
        : `Cuotas: ${formatCOP(snapshot.debt.monthlyPaymentTotal)}`
      : snapshot.debt.label;
  const dashboardDebtText = getDashboardDebtText({
    count: snapshot.debt.registeredDebtCount,
    level: snapshot.debt.level,
    monthlyPaymentTotal: snapshot.debt.monthlyPaymentTotal,
    reportedPaymentKind: snapshot.debt.reportedPaymentKind,
    source: snapshot.debt.source
  });
  const firstName = onboarding.firstName.trim();
  const greetingTitle = firstName ? `Bienvenido ${firstName}!` : "Bienvenido!";
  const navigate = (route: Route) => router.push(route);
  const openEmergencySavings = () => {
    if (hasEmergencyFundGoal) {
      router.push("/goals-overview");
      return;
    }

    router.push({
      pathname: "/goals",
      params: {
        mode: "add",
        suggestedTargetAmount:
          snapshot.emergencyFund.targetThreeMonths === null
            ? ""
            : `${snapshot.emergencyFund.targetThreeMonths}`,
        template: "emergency"
      }
    });
  };

  if (!isAuthReady || !session) {
    return (
      <FinancialDataStatusScreen
        text="Te llevaremos a iniciar sesion para recuperar tus datos."
        title="Preparando tu inicio"
      />
    );
  }

  if (onboardingSyncStatus === "loading") {
    return (
      <FinancialDataStatusScreen
        text="Estamos recuperando tu diagnóstico y tu plan guardado."
        title="Cargando tu información"
      />
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <FinancialDataStatusScreen
        text="Te llevaremos al diagnóstico inicial para completar los datos faltantes."
        title="Completa tu diagnóstico"
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>{greetingTitle}</Text>
            </View>
            <CircleButton onPress={() => router.push("/settings")} />
          </View>

          <MonthlyPlanCard
            actionCount={actionCount}
            compact={isPhone}
            completed={completedCount === actionCount}
            completedCount={completedCount}
            nextActionTitle={nextActionTitle}
            onRegisterProgress={() => router.push("/action-plan")}
            primaryGoalTitle={primaryGoalTitle}
            progressPercentage={progressPercentage}
          />

          <View style={styles.twoColumnGrid}>
            <PanelCard compact={isPhone} title="Resumen financiero estimado">
              <View style={styles.metricsGrid}>
                <MetricCard
                  icon={<PiggyBank color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Ingreso mensual"
                  tone="support"
                  value={getAmountLabel(metrics.incomeMidpoint, exactMonthlyIncome !== null)}
                />
                <MetricCard
                  icon={<ArrowDownCircle color="#C2410C" size={23} strokeWidth={2.4} />}
                  label="Gastos principales"
                  tone="danger"
                  value={getAmountLabel(metrics.expenseMidpoint, exactMonthlyExpenses !== null)}
                />
                <MetricCard
                  icon={<TrendingUp color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Margen mensual"
                  tone={metrics.estimatedMargin !== null && metrics.estimatedMargin > 0 ? "support" : "warning"}
                  value={getMarginLabel(metrics.estimatedMargin, hasExactCashflowAmounts)}
                />
                <MetricCard
                  icon={
                    <CreditCard
                      color={getToneColors(dashboardDebtTone).text}
                      size={23}
                      strokeWidth={2.4}
                    />
                  }
                  label="Cuotas de deuda"
                  tone={dashboardDebtTone}
                  value={
                    snapshot.cashflow.monthlyDebtPayments > 0
                      ? `${formatCOP(snapshot.cashflow.monthlyDebtPayments)}${
                          snapshot.debt.isPaymentEstimated ? " aprox." : ""
                        }`
                      : "$0"
                  }
                />
              </View>

              <View style={styles.comparisonBox}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonTitle}>Salidas mensuales vs ingresos</Text>
                  <Text style={styles.comparisonValue}>
                    {getExpensePercentageLabel(metrics.expensePercentage, hasExactCashflowAmounts)}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.expenseFill,
                      expensesMayExceedIncome && styles.expenseFillWarning,
                      { width: toPercentWidth(expenseBarWidth) }
                    ]}
                  />
                </View>
              </View>
            </PanelCard>

            <PanelCard
              compact={isPhone}
              disabled
              subtitle={precisionStatus.message}
              title="Mejorar mi plan financiero"
            >
              <ImprovePlanSummaryCard
                count={precisionStatus.exactValuesCount}
                disabled
                onPress={() => router.push("/improve-plan")}
                state={precisionStatus.label}
              />
            </PanelCard>
          </View>

          <RowCard
            actionLabel={hasEmergencyFundGoal ? "Ver ahorro" : "Crear meta"}
            compact={isPhone}
            icon={<ShieldCheck color={colors.support} size={36} strokeWidth={2.4} />}
            onPress={openEmergencySavings}
            text={emergencyStatus.text}
            title="Fondo de emergencia"
            tone={emergencyStatus.tone}
            value={
              snapshot.values.currentSavings !== null
                ? `Ahorro actual: ${getAmountLabel(snapshot.values.currentSavings, currentSavingsIsExact)}`
                : "Ahorro por registrar"
            }
          >
            <Chip label={emergencyStatus.state} tone={emergencyStatus.tone} />
          </RowCard>

          <RowCard
            compact={isPhone}
            actionLabel={hasSmallExpensesDetail ? "Revisar gastos" : "Detallar (opcional)"}
            icon={<Coffee color="#B45309" size={36} strokeWidth={2.4} />}
            onPress={() => router.push({ pathname: "/small-expenses", params: { source: "dashboard" } })}
            text={smallExpensesText}
            title="Gastos pequeños"
            tone={hasSmallExpensesDetail ? "warning" : "neutral"}
            value={smallExpensesValue}
          >
            {hasSmallExpensesDetail ? (
              <View style={styles.categoryChipLine}>
                <Text style={styles.rowInlineText}>
                  Intención:{" "}
                  {data.hasSmallExpenses === "No"
                    ? "No aplica"
                    : getDefinedLabel(data.smallExpensesIntention, "No definida")}
                </Text>
                <Chip label={snapshot.smallExpenses.label} tone="warning" />
              </View>
            ) : (
              <Chip label="Detalle opcional" tone="neutral" />
            )}
          </RowCard>

          <RowCard
            compact={isPhone}
            actionLabel="Ver metas"
            icon={<Flag color={colors.primary} size={36} strokeWidth={2.4} />}
            onPress={() => router.push("/goals-overview")}
            text={goalsDetailText}
            title={totalGoalsCount > 1 ? "Metas" : "Meta principal"}
            tone="primary"
            value={goalsValue}
          >
            <Chip label={goalStatus} tone={goalStatusTone} />
            {totalGoalsCount > 1 ? (
              <Chip
                label={`Aporte ${getAmountLabel(goalPlan.monthlyContributionTotal)}`}
                tone="support"
              />
            ) : null}
            {completedGoalsChipLabel ? (
              <Chip label={completedGoalsChipLabel} tone="support" />
            ) : null}
            {goalProgressLabel ? (
              <Chip label={goalProgressLabel} tone="primary" />
            ) : null}
          </RowCard>

          <RowCard
            compact={isPhone}
            actionLabel="Ver deudas"
            icon={<CreditCard color={getToneColors(dashboardDebtTone).text} size={36} strokeWidth={2.4} />}
            onPress={() => router.push("/debts")}
            text={dashboardDebtText}
            title="Deudas"
            tone={dashboardDebtTone}
            value={dashboardDebtValue}
          >
            <Chip
              label={getDebtRatioLabel(
                snapshot.debt.debtToIncomeRatio,
                snapshot.debt.reportedPaymentKind === "share"
                  ? snapshot.debt.reportedPaymentShare
                  : null
              )}
              tone={dashboardDebtTone}
            />
            {snapshot.debt.remainingTotal !== null ? (
              <Chip label={`Saldo ${formatCOP(snapshot.debt.remainingTotal)}`} tone="warning" />
            ) : null}
          </RowCard>

        </View>
      </ScrollView>

      <BottomNavigation activeRoute="/dashboard" />
      <View style={styles.hidden}>
        <BottomNavItem active icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
        <BottomNavItem icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
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
    fontSize: typography.display,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.display
  },
  titlePhone: {
    fontSize: typography.title,
    lineHeight: typography.lineHeight.title
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  profileButton: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  monthlyPlanCard: {
    ...shadows.card,
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  cardPhone: {
    padding: spacing.md
  },
  monthlyPlanBody: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  monthlyPlanProgressBlock: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  monthlyPlanMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  monthlyPlanMetricLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  monthlyPlanMetricValue: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  primaryGoalCard: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  monthlyPlanHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  monthlyPlanHeadingIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  monthlyPlanHeadingCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  monthlyPlanTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  monthlyPlanSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  nextActionCard: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  nextActionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  nextActionLabel: {
    color: "#B45309",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  nextActionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  primaryGoalIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  primaryGoalCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  primaryGoalLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  primaryGoalTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  monthlyPlanActions: {
    alignItems: "flex-start"
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  panelCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 320,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  panelCardDisabled: {
    opacity: 0.5
  },
  panelHeader: {
    gap: spacing.xs
  },
  panelTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  panelSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 140,
    padding: spacing.md
  },
  metricTextGroup: {
    gap: spacing.xs
  },
  metricLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  metricValue: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  improveSummary: {
    gap: spacing.md
  },
  improveHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  improveText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  precisionProgressBlock: {
    gap: spacing.sm
  },
  precisionProgressText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  precisionProgressValue: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  improveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  improveButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  improveButtonDisabled: {
    backgroundColor: colors.disabled
  },
  improveButtonTextDisabled: {
    color: colors.textSubtle
  },
  comparisonBox: {
    gap: spacing.sm,
    marginTop: spacing.xs
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
  progressTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  progressFillComplete: {
    backgroundColor: colors.support
  },
  expenseFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  expenseFillWarning: {
    backgroundColor: "#F97316"
  },
  rowCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg
  },
  rowCardPhone: {
    alignItems: "flex-start",
    padding: spacing.md
  },
  rowCardBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  rowCardTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  rowCardValueLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rowCardValue: {
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  rowCardAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44
  },
  rowCardActionText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  rowInlineText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  categoryChipLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 66,
    justifyContent: "center",
    width: 66
  },
  iconBubbleSmall: {
    height: 42,
    width: 42
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
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
