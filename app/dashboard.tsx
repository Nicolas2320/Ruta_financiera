import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowDownCircle,
  Bot,
  CalendarCheck,
  ChartColumnIncreasing,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  Flag,
  HandCoins,
  Home,
  LineChart,
  PencilLine,
  PieChart,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import {
  getMonthlyActionImpactSummary,
  getNextPlanAdjustmentHint
} from "../utils/actionProgressImpact";
import { formatCOP } from "../utils/financialRanges";
import { getGoalPlanFromOnboarding, type GoalAllocation } from "../utils/goalPlanning";
import {
  getActiveMonthlyPlanProgressKey,
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  getMonthlyPlanPriorityKey,
  getMonthlyPlanProgressKey,
  goalNeedsAmount,
  hasLowEmergencyCoverage,
  isMonthlyActionCompleted,
  type MonthlyAction,
  type MonthlyGoalContext
} from "../utils/monthlyPlan";

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
    return "Margen ajustado";
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

function getEmergencyStatus(emergencyCoverage: string | null): {
  state: string;
  text: string;
  tone: Tone;
} {
  if (emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes") {
    return {
      state: "Prioridad alta",
      text: "Construir una base para imprevistos puede darte más tranquilidad.",
      tone: "warning"
    };
  }

  if (emergencyCoverage === "1 – 3 meses") {
    return {
      state: "Base inicial",
      text: "Ya tienes una base, pero podrías fortalecerla.",
      tone: "support"
    };
  }

  if (emergencyCoverage === "3 – 6 meses" || emergencyCoverage === "Más de 6 meses") {
    return {
      state: "Cobertura saludable",
      text: "Tienes una protección más sólida frente a imprevistos.",
      tone: "support"
    };
  }

  return {
    state: "Por calcular",
    text: "Puedes empezar calculando tus gastos esenciales.",
    tone: "neutral"
  };
}

function getEmergencyStatusFromExactValues({
  currentSavings,
  monthlyExpenses
}: {
  currentSavings: number | null;
  monthlyExpenses: number | null;
}): {
  state: string;
  text: string;
  tone: Tone;
} | null {
  if (currentSavings === null) {
    return null;
  }

  if (monthlyExpenses === null || monthlyExpenses <= 0) {
    return {
      state: "Dato ingresado",
      text: "Usaremos tu ahorro actual ingresado como base para estimar tu fondo de emergencia.",
      tone: "primary"
    };
  }

  const months = currentSavings / monthlyExpenses;
  const monthsLabel = getRoundedMonthsLabel(months);

  if (months < 1) {
    return {
      state: "Base por fortalecer",
      text: `Con tus datos ingresados, tu ahorro actual cubriría cerca de ${monthsLabel} meses de gasto mensual.`,
      tone: "warning"
    };
  }

  if (months < 3) {
    return {
      state: "Base inicial",
      text: `Con tus datos ingresados, tu ahorro actual cubriría cerca de ${monthsLabel} meses de gasto mensual.`,
      tone: "support"
    };
  }

  return {
    state: "Base más clara",
    text: `Con tus datos ingresados, tu ahorro actual cubriría cerca de ${monthsLabel} meses de gasto mensual.`,
    tone: "support"
  };
}

function getGoalStatus({
  financialGoal,
  goalHorizon,
  goalAmountRange,
  emergencyCoverage,
  hasGoalTargetAmount
}: {
  financialGoal: string | null;
  goalHorizon: string | null;
  goalAmountRange: string | null;
  emergencyCoverage: string | null;
  hasGoalTargetAmount?: boolean;
}) {
  if (financialGoal === "Empezar a invertir" && hasLowEmergencyCoverage(emergencyCoverage)) {
    return "Primero fortalece tu base financiera";
  }

  if (!hasGoalTargetAmount && goalNeedsAmount(goalAmountRange)) {
    return "Falta concretar una cifra";
  }

  if (hasGoalTargetAmount) {
    return "Monto más claro";
  }

  if (financialGoal && goalHorizon && goalAmountRange) {
    return "Lista para revisar escenarios";
  }

  return "En definición";
}

function getImprovePlanDashboardText(count: number) {
  if (count === 0) {
    return "Agrega 4 datos opcionales para calcular mejor tu margen mensual, fondo de emergencia y avance hacia tu meta.";
  }

  if (count < 4) {
    return "Ya estamos usando algunos datos más claros en tus cálculos.";
  }

  return "Tu Dashboard ya usa estos valores para mostrar cálculos más útiles.";
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

function getActionTone(action: MonthlyAction): Tone {
  if (action.category === "Ahorro") {
    return "support";
  }

  if (action.category === "Gastos hormiga" || action.category === "Meta") {
    return "purple";
  }

  if (action.category === "Gastos" || action.category === "Deudas") {
    return "warning";
  }

  return "primary";
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
  insight,
  onRegisterProgress,
  primaryGoalTitle,
  progressPercentage,
  realContribution,
  text,
  title
}: {
  actionCount: number;
  completed: boolean;
  completedCount: number;
  insight: string;
  onRegisterProgress: () => void;
  primaryGoalTitle?: string | null;
  progressPercentage: number;
  realContribution: string;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.monthlyPlanCard}>
      <View style={styles.monthlyPlanBody}>
        <Text style={styles.kickerPrimary}>Plan del mes</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{text}</Text>
        {primaryGoalTitle ? (
          <View style={styles.heroGoalPill}>
            <Flag color={colors.primary} size={16} strokeWidth={2.4} />
            <Text style={styles.heroGoalPillText}>Meta principal: {primaryGoalTitle}</Text>
          </View>
        ) : null}

        <View style={styles.monthlyPlanMetrics}>
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

          <View style={styles.monthlyPlanRealBlock}>
            <HandCoins color={colors.support} size={21} strokeWidth={2.4} />
            <View style={styles.monthlyPlanRealText}>
              <Text style={styles.monthlyPlanMetricLabel}>Avance real</Text>
              <Text style={styles.monthlyPlanRealValue}>{realContribution}</Text>
            </View>
          </View>
        </View>

        <View style={styles.monthlyPlanInsight}>
          <Text style={styles.monthlyPlanInsightLabel}>Insight</Text>
          <Text style={styles.monthlyPlanInsightText}>{insight}</Text>
        </View>

        <View style={styles.monthlyPlanActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onRegisterProgress}
            style={({ pressed }) => [styles.improveButton, pressed && styles.pressed]}
          >
            <Text style={styles.improveButtonText}>Registrar avance</Text>
            <ChevronRight color={colors.surface} size={20} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NextActionCard({
  action,
  onRegisterProgress
}: {
  action: MonthlyAction | undefined;
  onRegisterProgress: () => void;
}) {
  return (
    <View style={styles.nextActionCard}>
      <IconBubble
        icon={<CalendarCheck color="#D97706" size={48} strokeWidth={2.4} />}
        size="large"
        tone="warning"
      />
      {action ? (
        <View style={styles.nextActionBody}>
          <Text style={styles.kickerWarning}>Próxima acción</Text>
          <Text style={styles.nextActionTitle}>{action.title}</Text>
          <Text style={styles.text}>{action.description}</Text>
          <View style={styles.chipRow}>
            <Chip label={action.category} tone={getActionTone(action)} />
            <Chip label={`Dificultad: ${action.difficulty}`} tone={action.difficulty === "Baja" ? "support" : "warning"} />
          </View>
          <View style={styles.impactInline}>
            <Text style={styles.impactInlineLabel}>Impacto estimado</Text>
            <Text style={styles.impactInlineText}>{action.estimatedImpact}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.nextActionBody}>
          <Text style={styles.kickerPrimary}>Plan completado</Text>
          <Text style={styles.nextActionTitle}>Tus 3 acciones están listas</Text>
          <Text style={styles.text}>
            Completaste tus acciones de este mes. Puedes revisar tu plan o ajustar tus respuestas.
          </Text>
        </View>
      )}
      <View style={styles.nextActionControls}>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRegisterProgress}
            style={({ pressed }) => [styles.primaryPillButton, pressed && styles.pressed]}
          >
            <CheckCircle2 color={colors.surface} size={20} strokeWidth={2.4} />
            <Text style={styles.primaryPillButtonText}>Registrar avance</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PanelCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.panelCard}>
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
  onPress
}: {
  count: number;
  state: string;
  onPress: () => void;
}) {
  const isComplete = count === 4;
  const tone: Tone = count === 0 ? "neutral" : isComplete ? "support" : "primary";

  return (
    <View style={styles.improveSummary}>
      <View style={styles.improveHeader}>
        <IconBubble
          icon={<LineChart color={getToneColors(tone).text} size={23} strokeWidth={2.4} />}
          size="small"
          tone={tone}
        />
        <Chip label={state} tone={tone} />
      </View>

      <Text style={styles.improveText}>{getImprovePlanDashboardText(count)}</Text>

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
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.improveButton, pressed && styles.pressed]}
      >
        <Text style={styles.improveButtonText}>{getImprovePlanActionLabel(count)}</Text>
        <ChevronRight color={colors.surface} size={20} strokeWidth={2.5} />
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
  children
}: {
  icon: ReactNode;
  title: string;
  value: string;
  text: string;
  tone?: Tone;
  actionLabel?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.rowCard}>
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
        <ChevronRight color={colors.textSubtle} size={24} strokeWidth={2.2} />
      )}
    </View>
  );
}

function QuickAccessCard({
  title,
  route,
  icon,
  tone,
  onNavigate
}: {
  title: string;
  route: Route;
  icon: ReactNode;
  tone: Tone;
  onNavigate: (route: Route) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onNavigate(route)}
      style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
    >
      <IconBubble icon={icon} size="large" tone={tone} />
      <Text style={styles.quickTitle}>{title}</Text>
    </Pressable>
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
  const { exactValues, onboarding } = useOnboarding();
  const { completedActions } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const snapshot = metrics.snapshot;
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(onboarding, snapshot.cashflow.suggestedMonthlyContribution, exactValues),
    [exactValues, onboarding, snapshot.cashflow.suggestedMonthlyContribution]
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const primaryGoalTitle =
    primaryGoalAllocation?.goal.title ?? snapshot.goal.name ?? data.financialGoal;
  const monthlyGoalContext = useMemo<MonthlyGoalContext>(
    () => ({
      title: primaryGoalTitle,
      monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
      estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null
    }),
    [
      primaryGoalAllocation?.estimatedMonthsToGoal,
      primaryGoalAllocation?.monthlyContribution,
      primaryGoalTitle
    ]
  );
  const suggestedActions = useMemo(
    () => getMonthlyActions(data, metrics, undefined, monthlyGoalContext),
    [data, metrics, monthlyGoalContext]
  );
  const suggestedPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, suggestedActions),
    [metrics, suggestedActions]
  );
  const activePlanProgressKey = useMemo(
    () => getActiveMonthlyPlanProgressKey(completedActions, suggestedPlanProgressKey),
    [completedActions, suggestedPlanProgressKey]
  );
  const activePlanPriorityKey = getMonthlyPlanPriorityKey(activePlanProgressKey);
  const actions = useMemo(
    () => getMonthlyActions(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const focus = useMemo(
    () => getMonthlyFocus(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const planProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, actions, activePlanPriorityKey ?? undefined),
    [activePlanPriorityKey, actions, metrics]
  );
  const completedCount = actions.filter((action) =>
    isMonthlyActionCompleted({
      actionId: action.id,
      completedActions,
      planProgressKey
    })
  ).length;
  const actionCount = actions.length;
  const progressPercentage = actionCount > 0 ? Math.round((completedCount / actionCount) * 100) : 0;
  const impactSummary = useMemo(
    () =>
      getMonthlyActionImpactSummary(completedActions, {
        periodKey: getMonthlyPlanPeriodKey()
      }),
    [completedActions]
  );
  const impactDetail = getNextPlanAdjustmentHint(impactSummary);
  const realContributionLabel =
    impactSummary.realContributionTotal > 0 ? formatCOP(impactSummary.realContributionTotal) : "$0";
  const precisionStatus = snapshot.precision;
  const exactMonthlyIncome =
    snapshot.sourceMap.monthlyIncome === "exact" ? snapshot.cashflow.monthlyIncome : null;
  const exactMonthlyExpenses =
    snapshot.sourceMap.monthlyExpenses === "exact" ? snapshot.cashflow.monthlyExpenses : null;
  const currentSavingsIsExact = snapshot.sourceMap.currentSavings === "exact";
  const hasExactMonthlyAmounts =
    snapshot.sourceMap.monthlyIncome === "exact" &&
    snapshot.sourceMap.monthlyExpenses === "exact";
  const emergencyTone = getEmergencyTone(snapshot.emergencyFund.status);
  const emergencyStatus = {
    state: snapshot.emergencyFund.label,
    text:
      snapshot.emergencyFund.coverageMonths !== null
        ? `Con estos datos, tu ahorro cubre cerca de ${getRoundedMonthsLabel(snapshot.emergencyFund.coverageMonths)} meses de gasto mensual.`
        : snapshot.emergencyFund.label,
    tone: emergencyTone
  };
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
  const categoryLabels = data.smallExpenseCategories.slice(0, 4);
  const summarySubtitle =
    precisionStatus.exactValuesCount > 0
      ? "Usa tus datos ingresados y completa con rangos cuando hace falta."
      : "Basado en los rangos que seleccionaste.";
  const primaryGoalTargetAmount = primaryGoalAllocation?.targetAmount ?? snapshot.goal.targetAmount;
  const goalDetailText =
    primaryGoalAllocation && isCompletedGoalAllocation(primaryGoalAllocation)
      ? primaryGoalTargetAmount !== null
        ? `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Meta completada.`
        : "Meta completada."
      : primaryGoalTargetAmount !== null
      ? primaryGoalProgressPercentage !== null
        ? `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Base actual frente a tu objetivo: ${primaryGoalProgressPercentage}% aprox.`
        : `Objetivo: ${formatCOP(primaryGoalTargetAmount)}. Horizonte: ${getDefinedLabel(data.goalHorizon)}.`
      : `Horizonte: ${getDefinedLabel(data.goalHorizon)}. Cifra aproximada: ${getDefinedLabel(data.goalAmountRange, "No definida")}.`;
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
      ? `Bolsa sugerida: ${getAmountLabel(goalPlan.monthlyGoalBudget)}. Principal: ${getDefinedLabel(primaryGoalTitle, "No definida")}.${completedGoalsDetail}`
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
    snapshot.smallExpenses.amount !== null
      ? snapshot.sourceMap.smallExpenses === "exact"
        ? formatCOP(snapshot.smallExpenses.amount)
        : `${formatCOP(snapshot.smallExpenses.amount)} aprox.`
      : snapshot.sourceMap.smallExpenses === "unknown"
        ? "Por estimar"
        : `Rango: ${getDefinedLabel(data.smallExpensesRange)}`;
  const navigate = (route: Route) => router.push(route);

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
              <Text style={styles.title}>Inicio</Text>
              <Text style={styles.subtitle}>
                Hola, este es tu panorama financiero de este mes.
              </Text>
            </View>
            <CircleButton onPress={() => router.push("/settings")} />
          </View>

          <MonthlyPlanCard
            actionCount={actionCount}
            completed={completedCount === actionCount}
            completedCount={completedCount}
            insight={impactDetail}
            onRegisterProgress={() => router.push("/action-plan")}
            primaryGoalTitle={primaryGoalTitle}
            progressPercentage={progressPercentage}
            realContribution={realContributionLabel}
            text={focus.text}
            title={focus.title}
          />

          <View style={styles.twoColumnGrid}>
            <PanelCard
              subtitle={summarySubtitle}
              title="Resumen financiero estimado"
            >
              <View style={styles.metricsGrid}>
                <MetricCard
                  icon={<PiggyBank color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Ingreso mensual"
                  tone="support"
                  value={getAmountLabel(metrics.incomeMidpoint, exactMonthlyIncome !== null)}
                />
                <MetricCard
                  icon={<ArrowDownCircle color="#C2410C" size={23} strokeWidth={2.4} />}
                  label="Gasto mensual"
                  tone="danger"
                  value={getAmountLabel(metrics.expenseMidpoint, exactMonthlyExpenses !== null)}
                />
                <MetricCard
                  icon={<TrendingUp color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Margen mensual"
                  tone={metrics.estimatedMargin !== null && metrics.estimatedMargin > 0 ? "support" : "warning"}
                  value={getMarginLabel(metrics.estimatedMargin, hasExactMonthlyAmounts)}
                />
                <MetricCard
                  icon={<PieChart color={colors.primary} size={23} strokeWidth={2.4} />}
                  label="Gastos / ingresos"
                  tone={metrics.expensePercentage !== null && metrics.expensePercentage >= 85 ? "warning" : "primary"}
                  value={getExpensePercentageLabel(metrics.expensePercentage, hasExactMonthlyAmounts)}
                />
              </View>

              <View style={styles.comparisonBox}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonTitle}>Comparación gastos vs ingresos</Text>
                  <Text style={styles.comparisonValue}>
                    {getExpensePercentageLabel(metrics.expensePercentage, hasExactMonthlyAmounts)}
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
                <Text style={styles.helperText}>
                  {expensesMayExceedIncome
                    ? "Tus gastos podrían superar tus ingresos mensuales según los datos disponibles."
                    : hasExactMonthlyAmounts
                      ? "Tus datos ingresados muestran esta relación entre gastos e ingresos."
                      : "Tus gastos representan aproximadamente esta parte de tus ingresos."}
                </Text>
              </View>
            </PanelCard>

            <PanelCard
              subtitle={precisionStatus.message}
              title="Mejorar mi plan financiero"
            >
              <ImprovePlanSummaryCard
                count={precisionStatus.exactValuesCount}
                onPress={() => router.push("/improve-plan")}
                state={precisionStatus.label}
              />
            </PanelCard>
          </View>

          <RowCard
            icon={<ShieldCheck color={colors.support} size={36} strokeWidth={2.4} />}
            text={emergencyStatus.text}
            title="Fondo de emergencia"
            tone={emergencyStatus.tone}
            value={
              snapshot.values.currentSavings !== null
                ? `Ahorro actual: ${getAmountLabel(snapshot.values.currentSavings, currentSavingsIsExact)}`
                : getDefinedLabel(data.emergencyCoverage)
            }
          >
            <Chip label={emergencyStatus.state} tone={emergencyStatus.tone} />
          </RowCard>

          <RowCard
            actionLabel="Revisar gastos"
            icon={<Coffee color="#B45309" size={36} strokeWidth={2.4} />}
            onPress={() => router.push({ pathname: "/small-expenses", params: { source: "dashboard" } })}
            text={snapshot.smallExpenses.recommendation}
            title="Gastos pequeños"
            tone="warning"
            value={smallExpensesValue}
          >
            <View style={styles.categoryChipLine}>
              <Text style={styles.rowInlineText}>
                Intención: {getDefinedLabel(data.smallExpensesIntention, "No definida")}
              </Text>
              <Chip label={snapshot.smallExpenses.label} tone="warning" />
              {categoryLabels.map((category) => (
                <Chip key={category} label={category} tone="warning" />
              ))}
            </View>
          </RowCard>

          <RowCard
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
              <Chip label={`Bolsa ${getAmountLabel(goalPlan.monthlyGoalBudget)}`} tone="support" />
            ) : null}
            {completedGoalsChipLabel ? (
              <Chip label={completedGoalsChipLabel} tone="support" />
            ) : null}
            {goalProgressLabel ? (
              <Chip label={goalProgressLabel} tone="primary" />
            ) : null}
          </RowCard>

          <View style={styles.quickSection}>
            <Text style={styles.sectionTitleStandalone}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              <QuickAccessCard
                icon={<ClipboardCheck color={colors.primary} size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/diagnosis"
                title="Diagnóstico"
                tone="primary"
              />
              <QuickAccessCard
                icon={<ChartColumnIncreasing color={colors.support} size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/simulation"
                title="Simulación"
                tone="support"
              />
              <QuickAccessCard
                icon={<CalendarCheck color="#7C3AED" size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/action-plan"
                title="Plan mensual"
                tone="purple"
              />
              <QuickAccessCard
                icon={<PencilLine color="#B45309" size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route={{ pathname: "/summary", params: { mode: "edit" } }}
                title="Editar respuestas"
                tone="warning"
              />
            </View>
          </View>
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
  heroBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  kickerPrimary: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  kickerWarning: {
    color: "#B45309",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  heroText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  heroGoalPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  heroGoalPillText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  heroProgressText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs
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
  monthlyPlanBody: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  monthlyPlanMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  monthlyPlanProgressBlock: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 260,
    flexGrow: 1,
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
  monthlyPlanRealBlock: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 170,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  monthlyPlanRealText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  monthlyPlanRealValue: {
    color: colors.support,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  monthlyPlanInsight: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  monthlyPlanInsightLabel: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  monthlyPlanInsightText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  monthlyPlanActions: {
    alignItems: "flex-start"
  },
  nextActionCard: {
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
  nextActionBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  nextActionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  nextActionControls: {
    alignItems: "flex-end",
    flexBasis: 150,
    flexGrow: 0,
    minWidth: 150
  },
  primaryPillButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  primaryPillButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  impactInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  impactInlineLabel: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  impactInlineText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
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
  quickSection: {
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  sectionTitleStandalone: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  quickCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 116,
    minWidth: 130,
    padding: spacing.md
  },
  quickTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
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
  iconBubbleLarge: {
    height: 124,
    width: 124
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
