import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Bot,
  ChartColumnIncreasing,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Flag,
  Home,
  LineChart,
  PiggyBank,
  PieChart,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { FinancialEducationCarousel } from "../components/FinancialEducationCarousel";
import { FinancialEducationModal } from "../components/FinancialEducationModal";
import {
  FinancialEducationStory,
  type FinancialEducationStoryTone
} from "../components/FinancialEducationStory";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { getMonthlyActionImpactSummary } from "../utils/actionProgressImpact";
import {
  calculateFinancialSnapshot,
  type FinancialSnapshot
} from "../utils/financialCalculations";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatGoalContribution, getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import type {
  ExactFinancialValues
} from "../types/financial";
import { getMonthlyPlanPeriodKey } from "../utils/monthlyPlan";

type OnboardingSnapshot = ReturnType<typeof useOnboarding>["onboarding"];
type Tone = "primary" | "support" | "warning" | "purple" | "neutral";
type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type FinancialDisplay = {
  label: string;
  value: string;
  source: "exact" | "range" | "empty";
  helper: string;
};

type SimulationBase = {
  snapshot: FinancialSnapshot;
  incomeDisplay: FinancialDisplay;
  expenseDisplay: FinancialDisplay;
  incomeValue: number | null;
  expenseValue: number | null;
  smallExpenseValue: number | null;
  estimatedMargin: number | null;
  expensePercentage: number | null;
};

type Scenario = {
  key: string;
  name: string;
  monthlyContribution: number | null;
  assumption: string;
  tags: string[];
  tone: Tone;
  kind?: "contribution" | "deficit-reduction";
  currentMargin?: number;
  marginAfterAdjustment?: number;
  unavailableContributionLabel?: string;
  unavailableAdvanceLabel?: string;
  recommended?: boolean;
};

function hasLowEmergencyCoverage(emergencyCoverage: string | null) {
  return emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes";
}

function hasDebtPressure(debtSituation: string | null, debtPaymentShare: string | null) {
  return (
    debtSituation === "A veces me cuesta pagarlas" ||
    debtSituation === "Son una preocupación importante" ||
    debtPaymentShare === "Más del 40%"
  );
}

function wantsInvestmentEducation(investmentSituation: string | null) {
  return (
    investmentSituation === "No, pero quiero aprender" ||
    investmentSituation === "Sí, pero no entiendo bien cómo funcionan"
  );
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

function toFinancialDisplaySource(
  source: "exact" | "estimated" | "withheld" | "missing"
): FinancialDisplay["source"] {
  if (source === "exact") {
    return "exact";
  }

  if (source === "estimated") {
    return "range";
  }

  return "empty";
}

function getSnapshotDisplay({
  exactLabel,
  estimatedLabel,
  source,
  value
}: {
  exactLabel: string;
  estimatedLabel: string;
  source: "exact" | "estimated" | "withheld" | "missing";
  value: number | null;
}): FinancialDisplay {
  if (source === "withheld") {
    return {
      label: estimatedLabel,
      value: "No compartido",
      source: "empty",
      helper: "Elegiste no compartir este dato."
    };
  }

  if (value === null) {
    return {
      label: estimatedLabel,
      value: "No disponible",
      source: "empty",
      helper: "Falta información para calcularlo."
    };
  }

  const isExact = source === "exact";

  return {
    label: isExact ? exactLabel : estimatedLabel,
    value: isExact ? formatCOP(value) : `${formatCOP(value)} aprox.`,
    source: toFinancialDisplaySource(source),
    helper: isExact ? "Dato ingresado." : "Estimado por rango."
  };
}

function getSimulationBase(
  onboarding: OnboardingSnapshot,
  exactValues: ExactFinancialValues
): SimulationBase {
  const snapshot = calculateFinancialSnapshot({ onboarding, exactValues });
  const incomeDisplay = getSnapshotDisplay({
    exactLabel: "Ingreso mensual",
    estimatedLabel: "Rango de ingresos",
    source: snapshot.sourceMap.monthlyIncome,
    value: snapshot.cashflow.monthlyIncome
  });
  const expenseDisplay = getSnapshotDisplay({
    exactLabel: "Gasto mensual",
    estimatedLabel: "Rango de gastos",
    source: snapshot.sourceMap.monthlyExpenses,
    value: snapshot.cashflow.monthlyExpenses
  });
  const expensePercentage =
    snapshot.cashflow.expensesToIncomeRatio !== null
      ? Math.round(snapshot.cashflow.expensesToIncomeRatio * 100)
      : null;

  return {
    snapshot,
    incomeDisplay,
    expenseDisplay,
    incomeValue: snapshot.cashflow.monthlyIncome,
    expenseValue: snapshot.cashflow.monthlyExpenses,
    smallExpenseValue: snapshot.values.smallExpenses,
    estimatedMargin: snapshot.cashflow.monthlyMargin,
    expensePercentage
  };
}

function contributionFromPositiveValue(value: number | null, share: number) {
  if (value === null || value <= 0) {
    return null;
  }

  return value * share;
}

function sumAvailableParts(parts: Array<number | null>) {
  const availableParts = parts.filter((part): part is number => part !== null);

  if (availableParts.length === 0) {
    return null;
  }

  return availableParts.reduce((total, part) => total + part, 0);
}

function getSharePercentLabel(amount: number | null, base: number | null) {
  if (amount === null || amount <= 0 || base === null || base <= 0) {
    return null;
  }

  return `${Math.max(1, Math.round((amount / base) * 100))}%`;
}

function getScenarioDescription(parts: Array<string | null>, fallback: string) {
  const availableParts = parts.filter((part): part is string => part !== null);

  return availableParts.length > 0 ? `${availableParts.join(" + ")}.` : fallback;
}

function getMarginShareDescription(label: string, amount: number | null, metrics: SimulationBase) {
  const percentLabel = getSharePercentLabel(amount, metrics.estimatedMargin);

  return percentLabel !== null
    ? `${label} (cerca del ${percentLabel} de tu margen mensual)`
    : null;
}

function getSmallExpensesShareDescription(
  label: string,
  amount: number | null,
  metrics: SimulationBase
) {
  const percentLabel = getSharePercentLabel(amount, metrics.smallExpenseValue);

  return percentLabel !== null
    ? `${label} (cerca del ${percentLabel} de tus gastos pequeños)`
    : null;
}

function getScenarios(
  metrics: SimulationBase,
  registeredContribution = 0,
  assignedGoalContribution: number | null = null
): Scenario[] {
  const capacityContribution =
    metrics.snapshot.cashflow.suggestedMonthlyContribution > 0
      ? metrics.snapshot.cashflow.suggestedMonthlyContribution
      : null;
  const assignedContribution =
    assignedGoalContribution !== null && assignedGoalContribution > 0
      ? assignedGoalContribution
      : capacityContribution;
  const scenarioWithSmallExpenses =
    capacityContribution !== null
      ? capacityContribution
      : contributionFromPositiveValue(metrics.estimatedMargin, 0.2);
  const balancedSmallExpensePart = metrics.snapshot.smallExpenses.opportunityAmount;
  const scenarios: Scenario[] = [
    ...(registeredContribution > 0
      ? [
          {
            key: "registered",
            name: "Aporte registrado",
            monthlyContribution: registeredContribution,
            assumption: getScenarioDescription(
              [getMarginShareDescription("Aporte registrado", registeredContribution, metrics)],
              "Monto que registraste en el plan mensual."
            ),
            tags: ["Real del mes", "No reemplaza"],
            tone: "purple" as Tone
          }
        ]
      : []),
    {
      key: "assigned",
      name: "Aporte meta",
      monthlyContribution: assignedContribution,
      assumption: getScenarioDescription(
        assignedGoalContribution !== null && assignedGoalContribution > 0
          ? [getMarginShareDescription("Aporte asignado a esta meta", assignedContribution, metrics)]
          : [getMarginShareDescription("Aporte sugerido", assignedContribution, metrics)],
        "Necesitamos una meta con aporte asignado o un margen mensual positivo para calcular este aporte."
      ),
      tags: ["Actual", "Meta"],
      tone: "primary",
      unavailableContributionLabel: "No disponible",
      unavailableAdvanceLabel: "No calculado"
    },
    {
      key: "capacity",
      name: "Aporte sugerido",
      monthlyContribution: capacityContribution,
      assumption: getScenarioDescription(
        [
          getMarginShareDescription("Referencia calculada desde tu margen", capacityContribution, metrics)
        ],
        metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
          ? "No sugerimos aportes mientras tu margen mensual sea cero o negativo."
          : "Referencia de aporte calculada desde tu margen mensual."
      ),
      tags: ["Referencia", "No asigna solo"],
      tone: "support",
      unavailableContributionLabel:
        metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
          ? "No sugerido con déficit"
          : "No disponible",
      unavailableAdvanceLabel:
        metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
          ? "No aplica"
          : "No disponible",
      recommended:
        capacityContribution !== null &&
        (assignedGoalContribution === null || assignedGoalContribution <= 0)
    }
  ];

  if (balancedSmallExpensePart !== null && balancedSmallExpensePart > 0) {
    if (metrics.estimatedMargin !== null && metrics.estimatedMargin < 0) {
      const deficitReduction = Math.min(
        balancedSmallExpensePart,
        Math.abs(metrics.estimatedMargin)
      );

      scenarios.push({
        key: "with-small-expenses",
        name: "Reducir el déficit",
        monthlyContribution: deficitReduction,
        assumption:
          "Revisar una parte de tus gastos pequeños podría reducir el déficit mensual. No es dinero disponible para aportar.",
        tags: ["No es ahorro", "Explorar"],
        tone: "warning",
        kind: "deficit-reduction",
        currentMargin: metrics.estimatedMargin,
        marginAfterAdjustment: metrics.estimatedMargin + balancedSmallExpensePart,
        recommended: true
      });
    } else {
      scenarios.push({
        key: "with-small-expenses",
        name: "Aporte con ajuste opcional",
        monthlyContribution: sumAvailableParts([
          scenarioWithSmallExpenses,
          balancedSmallExpensePart
        ]),
        assumption: getScenarioDescription(
          [
            getMarginShareDescription("Aporte sugerido", scenarioWithSmallExpenses, metrics),
            getSmallExpensesShareDescription(
              "Parte de gastos pequeños",
              balancedSmallExpensePart,
              metrics
            )
          ],
          "Combina el aporte sugerido con una parte opcional de tus gastos pequeños."
        ),
        tags: ["Más exigente", "Revisar"],
        tone: "warning"
      });
    }
  }

  return scenarios;
}

function getAdvanceLabel(scenario: Scenario, months: number) {
  const { monthlyContribution } = scenario;

  if (monthlyContribution === null) {
    return scenario.unavailableAdvanceLabel ?? "No disponible";
  }

  return `${formatCOP(monthlyContribution * months)} aprox.`;
}

function getAmountLabel(value: number | null, isMorePrecise = false) {
  if (value === null) {
    return "No disponible";
  }

  return isMorePrecise ? formatCOP(value) : `${formatCOP(value)} aprox.`;
}

function getMarginLabel(metrics: SimulationBase) {
  if (metrics.estimatedMargin === null) {
    return "No disponible";
  }

  if (metrics.estimatedMargin <= 0) {
    const isMorePrecise =
      metrics.incomeDisplay.source === "exact" && metrics.expenseDisplay.source === "exact";

    return isMorePrecise
      ? formatSignedCOP(metrics.estimatedMargin)
      : `${formatSignedCOP(metrics.estimatedMargin)} aprox.`;
  }

  return getAmountLabel(
    metrics.estimatedMargin,
    metrics.incomeDisplay.source === "exact" && metrics.expenseDisplay.source === "exact"
  );
}

function getExpensePercentageLabel(metrics: SimulationBase) {
  if (metrics.expensePercentage === null) {
    return "No disponible";
  }

  const isMorePrecise =
    metrics.incomeDisplay.source === "exact" && metrics.expenseDisplay.source === "exact";

  return isMorePrecise ? `${metrics.expensePercentage}%` : `${metrics.expensePercentage}% aprox.`;
}

function getSmallExpenseLabel(onboarding: OnboardingSnapshot, metrics: SimulationBase) {
  if (onboarding.hasSmallExpenses === "No") {
    return "No identificados";
  }

  if (metrics.smallExpenseValue === null) {
    return "No disponible";
  }

  return `${formatCOP(metrics.smallExpenseValue)} aprox.`;
}

function getInvestmentEducationMessage(onboarding: OnboardingSnapshot) {
  if (hasLowEmergencyCoverage(onboarding.emergencyCoverage)) {
    return "Primero conviene fortalecer una base para imprevistos.";
  }

  if (hasDebtPressure(onboarding.debtSituation, onboarding.debtPaymentShare)) {
    return "Antes de invertir, puede ser útil revisar el peso mensual de tus deudas.";
  }

  if (wantsInvestmentEducation(onboarding.investmentSituation)) {
    return "Puedes empezar por riesgo, plazo, liquidez y diversificación.";
  }

  return "Si después confirmas que tu base está estable, puedes explorar inversión con calma y educación.";
}

function getGoalMonthsLabel(months: number | null, fallback: string) {
  if (months === null) {
    return fallback;
  }

  return `${months} meses aprox.`;
}

function IconBubble({ icon, tone = "primary" }: { icon: ReactNode; tone?: Tone }) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: getToneColors(tone).background }]}>
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
  icon,
  headerAction,
  children,
  compact = false
}: {
  title: string;
  icon: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.sectionCard, compact && styles.cardPhone]}>
      <View style={styles.sectionHeader}>
        <IconBubble icon={icon} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {headerAction}
      </View>
      {children}
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
  icon,
  tone = "primary"
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.summaryMetric,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <IconBubble icon={icon} tone={tone} />
      <View style={styles.summaryMetricText}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: toneColors.text }]}>{value}</Text>
        <Text style={styles.metricHelper}>{helper}</Text>
      </View>
    </View>
  );
}

function ValuePill({
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
    <View style={[styles.valuePill, { borderColor: toneColors.border }]}>
      <Text style={styles.valuePillLabel}>{label}</Text>
      <Text style={[styles.valuePillText, { color: toneColors.text }]}>{value}</Text>
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

function ScenarioCard({
  expanded,
  scenario,
  maxMonthlyContribution,
  onToggle,
  compact = false
}: {
  expanded: boolean;
  scenario: Scenario;
  maxMonthlyContribution: number;
  onToggle: () => void;
  compact?: boolean;
}) {
  const toneColors = getToneColors(scenario.tone);
  const relativeWidth =
    scenario.monthlyContribution !== null && maxMonthlyContribution > 0
      ? Math.max(10, Math.round((scenario.monthlyContribution / maxMonthlyContribution) * 100))
      : 0;
  const scenarioName = scenario.key === "assigned" ? "Aporte meta" : scenario.name;
  const scenarioTags =
    scenario.tags;
  const isDeficitReduction = scenario.kind === "deficit-reduction";

  return (
    <View
      style={[
        styles.scenarioCard,
        compact && styles.scenarioCardPhone,
        scenario.recommended && styles.scenarioCardRecommended
      ]}
    >
      <View style={styles.scenarioTopRow}>
        <View style={styles.scenarioTitleGroup}>
          <Text style={styles.scenarioTitle}>{scenarioName}</Text>
          <Text style={styles.scenarioAssumption}>{scenario.assumption}</Text>
        </View>
        {scenario.recommended ? <Chip label="Recomendado" tone="support" /> : null}
      </View>

      <View style={styles.scenarioMainRow}>
        <View style={styles.scenarioAmountBlock}>
          <Text style={styles.amountLabel}>
            {isDeficitReduction ? "Reducción mensual potencial" : "Aporte mensual"}
          </Text>
          <Text style={[styles.amountValue, { color: toneColors.text }]}>
            {scenario.monthlyContribution !== null
              ? `${formatCOP(scenario.monthlyContribution)} aprox.`
              : scenario.unavailableContributionLabel ?? "No disponible"}
          </Text>
        </View>
        <View style={styles.scenarioChips}>
          {scenarioTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              tone={tag === "Recomendado" || scenario.recommended ? "support" : scenario.tone}
            />
          ))}
        </View>
      </View>

      <View style={styles.scenarioCompactFooter}>
        <Text style={styles.scenarioCompactResult}>
          {isDeficitReduction && scenario.marginAfterAdjustment !== undefined
            ? `Margen después: ${formatSignedCOP(scenario.marginAfterAdjustment)} aprox.`
            : `6 meses: ${getAdvanceLabel(scenario, 6)}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.detailToggle, pressed && styles.pressed]}
        >
          <Text style={styles.detailToggleText}>{expanded ? "Ocultar detalle" : "Ver detalle"}</Text>
          {expanded ? (
            <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
          ) : (
            <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.scenarioDetailBlock}>
          {isDeficitReduction ? (
            <View style={styles.advanceGrid}>
              <ValuePill
                label="Déficit actual"
                tone="warning"
                value={
                  scenario.currentMargin !== undefined
                    ? `${formatSignedCOP(scenario.currentMargin)} aprox.`
                    : "No disponible"
                }
              />
              <ValuePill
                label="Reducción potencial"
                tone="support"
                value={
                  scenario.monthlyContribution !== null
                    ? `${formatCOP(scenario.monthlyContribution)} aprox.`
                    : "No disponible"
                }
              />
              <ValuePill
                label="Margen después"
                tone="warning"
                value={
                  scenario.marginAfterAdjustment !== undefined
                    ? `${formatSignedCOP(scenario.marginAfterAdjustment)} aprox.`
                    : "No disponible"
                }
              />
            </View>
          ) : (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: toneColors.text, width: toPercentWidth(relativeWidth) }
                  ]}
                />
              </View>

              <View style={styles.advanceGrid}>
                <ValuePill label="3 meses" tone={scenario.tone} value={getAdvanceLabel(scenario, 3)} />
                <ValuePill label="6 meses" tone={scenario.tone} value={getAdvanceLabel(scenario, 6)} />
                <ValuePill label="12 meses" tone={scenario.tone} value={getAdvanceLabel(scenario, 12)} />
              </View>
            </>
          )}

        </View>
      ) : null}
    </View>
  );
}

export default function SimulationScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ source?: string }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isFlowMode = source === "flow";
  const [expandedScenarioKey, setExpandedScenarioKey] = useState<string | null | undefined>(undefined);
  const navigate = (route: Route) => router.push(route);
  const { session } = useAuth();
  const { exactValues, onboarding } = useOnboarding();
  const { completedActions } = usePlan();
  const guidanceMode = onboarding.financialGuidanceMode;

  const metrics = useMemo(
    () => getSimulationBase(onboarding, exactValues),
    [exactValues, onboarding]
  );
  const impactSummary = useMemo(
    () =>
      getMonthlyActionImpactSummary(completedActions, {
        periodKey: getMonthlyPlanPeriodKey()
      }),
    [completedActions]
  );
  const snapshot = metrics.snapshot;
  const goalPlan = useMemo(
    () =>
      getGoalPlanFromOnboarding(
        onboarding,
        snapshot.cashflow.suggestedMonthlyContribution,
        exactValues
      ),
    [exactValues, onboarding, snapshot.cashflow.suggestedMonthlyContribution]
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const scenarios = useMemo(
    () =>
      getScenarios(
        metrics,
        impactSummary.realContributionTotal,
        primaryGoalAllocation?.monthlyContribution ?? null
      ),
    [impactSummary.realContributionTotal, metrics, primaryGoalAllocation?.monthlyContribution]
  );
  const defaultExpandedScenarioKey =
    scenarios.find((scenario) => scenario.recommended)?.key ?? scenarios[0]?.key ?? null;
  const activeExpandedScenarioKey =
    expandedScenarioKey === undefined ? defaultExpandedScenarioKey : expandedScenarioKey;
  const maxMonthlyContribution = Math.max(
    ...scenarios.map((scenario) => scenario.monthlyContribution ?? 0),
    0
  );
  const simulatedGoalTargetAmount =
    primaryGoalAllocation?.targetAmount ?? snapshot.goal.targetAmount;
  const simulatedGoalRemainingAmount =
    primaryGoalAllocation?.remainingAmount ?? snapshot.goal.remainingAmount;
  const simulatedGoalEstimatedMonths =
    primaryGoalAllocation?.estimatedMonthsToGoal ?? snapshot.goal.estimatedMonthsToGoal;
  const simulatedGoalTitle =
    primaryGoalAllocation?.goal.title ?? onboarding.financialGoal ?? snapshot.goal.name ?? "No definida";
  const simulatedGoalHorizon =
    primaryGoalAllocation?.goal.horizon ?? onboarding.goalHorizon ?? "No definido";
  const simulatedGoalContributionLabel = primaryGoalAllocation
    ? formatGoalContribution(primaryGoalAllocation.monthlyContribution)
    : snapshot.cashflow.suggestedMonthlyContribution > 0
      ? `${formatCOP(snapshot.cashflow.suggestedMonthlyContribution)} aprox.`
      : "Por definir";
  const capacityContributionLabel =
    snapshot.cashflow.suggestedMonthlyContribution > 0
      ? `${formatCOP(snapshot.cashflow.suggestedMonthlyContribution)} aprox.`
      : metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
        ? "No sugerido con déficit"
        : "Por definir";
  const contributionRateLabel =
    snapshot.cashflow.suggestedContributionRate !== null
      ? `${Math.round(snapshot.cashflow.suggestedContributionRate * 100)}%`
      : "No aplica";
  const marginRateLabel =
    snapshot.cashflow.marginRate !== null
      ? `${Math.round(snapshot.cashflow.marginRate * 100)}%`
      : "No disponible";
  const contributionRuleText =
    metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
      ? "Mientras el margen sea cero o negativo, no sugerimos un aporte. Los ajustes se muestran únicamente como una posible reducción del déficit."
      : snapshot.cashflow.suggestedContributionRate !== null
        ? `Tu margen equivale al ${marginRateLabel} de tus ingresos. Usamos el ${contributionRateLabel} de ese margen y redondeamos hacia abajo a los $10.000 más cercanos: ${formatCOP(snapshot.cashflow.suggestedContributionBeforeRounding)} antes del redondeo y ${formatCOP(snapshot.cashflow.suggestedMonthlyContribution)} como referencia final.`
        : "Necesitamos una referencia de ingresos y gastos para explicar el aporte sugerido.";
  const contributionBandRuleText =
    "La regla cambia según cuánto representa el margen sobre tus ingresos: hasta 10% usamos 25% del margen; más de 10% y hasta 25% usamos 35%; por encima de 25% usamos 45%.";
  const contributionTone: FinancialEducationStoryTone =
    metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
      ? "critical"
      : snapshot.cashflow.suggestedMonthlyContribution > 0
        ? "positive"
        : "neutral";
  const contributionPlainLanguage =
    snapshot.cashflow.suggestedContributionRate !== null
      ? `De cada $100 de margen, usamos $${Math.round(
          snapshot.cashflow.suggestedContributionRate * 100
        )} como referencia para tu aporte mensual.`
      : "Necesitamos una referencia de ingresos y gastos para traducir tu margen en un aporte.";
  const contributionResultLabel =
    metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0
      ? "Aporte no sugerido con déficit"
      : "Aporte mensual sugerido";
  const goalBudgetLabel =
    goalPlan.monthlyGoalBudget > 0 ? `${formatCOP(goalPlan.monthlyGoalBudget)} aprox.` : "Por definir";
  const goalBudgetModeLabel =
    goalPlan.monthlyGoalBudgetMode === "manual" ? "Bolsa manual" : "Bolsa recomendada";
  const goalMonthsLabel = getGoalMonthsLabel(
    simulatedGoalEstimatedMonths,
    primaryGoalAllocation?.viabilityLabel ?? snapshot.goal.label
  );
  const goalTone: Tone =
    simulatedGoalTargetAmount !== null && simulatedGoalEstimatedMonths !== null
      ? "support"
      : "warning";
  const expensesTone: Tone =
    metrics.expensePercentage !== null && metrics.expensePercentage >= 85 ? "warning" : "primary";
  const marginTone: Tone =
    metrics.estimatedMargin !== null && metrics.estimatedMargin > 0 ? "support" : "warning";
  const scenarioOverviewSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>Qué estás comparando</Text>
      <Text style={styles.scenarioGuideText}>
        Cada escenario muestra una forma distinta de avanzar hacia tu meta. Solo compara
        posibilidades educativas: no mueve dinero ni modifica tu plan.
      </Text>
      <View style={styles.valueGrid}>
        <ValuePill label="Aporte meta" tone="support" value={simulatedGoalContributionLabel} />
        <ValuePill label="Aporte sugerido" tone="warning" value={capacityContributionLabel} />
      </View>
    </View>
  );
  const scenarioTermsSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>De dónde sale cada monto</Text>
      <View style={styles.scenarioEducationList}>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>Aporte meta</Text>
          <Text style={styles.scenarioGuideText}>Lo asignado a tu meta principal.</Text>
        </View>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>Bolsa manual o recomendada</Text>
          <Text style={styles.scenarioGuideText}>
            El presupuesto total que se reparte entre tus metas.
          </Text>
        </View>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>Aporte sugerido</Text>
          <Text style={styles.scenarioGuideText}>
            Una referencia calculada desde tu margen; no cambia tu plan.
          </Text>
        </View>
      </View>
    </View>
  );
  const scenarioAdjustmentSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>Ajuste de gastos pequeños</Text>
      <View style={styles.scenarioEducationWarning}>
        <Text style={styles.scenarioGuideText}>
          Si tienes déficit, este escenario solo muestra cuánto podría reducirse al revisar
          gastos pequeños.
        </Text>
        <Text style={styles.scenarioGuideTerm}>
          No representa ahorro ni dinero disponible.
        </Text>
      </View>
    </View>
  );
  const scenarioSlides =
    guidanceMode === "guided"
      ? [scenarioOverviewSlide, scenarioTermsSlide, scenarioAdjustmentSlide]
      : guidanceMode === "brief"
        ? [
            scenarioOverviewSlide,
            <View style={styles.educationSlideContent}>
              {scenarioTermsSlide}
              {scenarioAdjustmentSlide}
            </View>
          ]
        : [
            <View style={styles.educationSlideContent}>
              {scenarioTermsSlide}
              {scenarioAdjustmentSlide}
            </View>
          ];
  const simulatedGoalOverviewSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>Qué representa esta simulación</Text>
      <Text style={styles.scenarioGuideText}>
        Proyecta una ruta posible hacia tu meta usando los datos actuales. No separa
        dinero ni cambia los aportes de tu plan.
      </Text>
      <View style={styles.valueGrid}>
        <ValuePill
          label="Objetivo"
          tone={goalTone}
          value={
            simulatedGoalTargetAmount !== null
              ? `${formatCOP(simulatedGoalTargetAmount)} aprox.`
              : "Por definir"
          }
        />
        <ValuePill
          label="Restante"
          tone="primary"
          value={
            simulatedGoalRemainingAmount !== null
              ? `${formatCOP(simulatedGoalRemainingAmount)} aprox.`
              : "Por calcular"
          }
        />
      </View>
    </View>
  );
  const simulatedGoalTermsSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>Cómo leer los demás datos</Text>
      <View style={styles.scenarioEducationList}>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>Tiempo</Text>
          <Text style={styles.scenarioGuideText}>
            Meses aproximados para cubrir lo restante con el aporte asignado.
          </Text>
        </View>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>{goalBudgetModeLabel}</Text>
          <Text style={styles.scenarioGuideText}>
            Presupuesto mensual disponible para repartir entre tus metas.
          </Text>
        </View>
        <View style={styles.scenarioEducationItem}>
          <Text style={styles.scenarioGuideTerm}>Aporte sugerido</Text>
          <Text style={styles.scenarioGuideText}>
            Referencia calculada desde tu margen; no reemplaza el aporte que tú
            decidas asignar.
          </Text>
        </View>
      </View>
    </View>
  );
  const simulatedGoalCautionSlide = (
    <View style={styles.educationSlideContent}>
      <Text style={styles.scenarioGuideTitle}>Recuerda que puede cambiar</Text>
      <View style={styles.scenarioEducationWarning}>
        <Text style={styles.scenarioGuideText}>
          El tiempo estimado cambia si ajustas el objetivo, registras un ahorro o
          modificas el aporte mensual.
        </Text>
        <Text style={styles.scenarioGuideTerm}>
          Es una orientación educativa, no una garantía.
        </Text>
      </View>
    </View>
  );
  const simulatedGoalSlides =
    guidanceMode === "guided"
      ? [
          simulatedGoalOverviewSlide,
          simulatedGoalTermsSlide,
          simulatedGoalCautionSlide
        ]
      : guidanceMode === "brief"
        ? [
            simulatedGoalOverviewSlide,
            <View style={styles.educationSlideContent}>
              {simulatedGoalTermsSlide}
              {simulatedGoalCautionSlide}
            </View>
          ]
        : [
            <View style={styles.educationSlideContent}>
              {simulatedGoalTermsSlide}
              {simulatedGoalCautionSlide}
            </View>
          ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.heroCard, isPhone && styles.cardPhone]}>
            <View style={styles.heroIcon}>
              <LineChart color={colors.primary} size={31} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>Simulación</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryMetric
              helper={simulatedGoalHorizon}
              icon={<Target color={getToneColors(goalTone).text} size={22} strokeWidth={2.4} />}
              label="Meta"
              tone={goalTone}
              value={simulatedGoalTitle}
            />
            <SummaryMetric
              helper="Desde tu bolsa de metas"
              icon={<PiggyBank color={colors.support} size={22} strokeWidth={2.4} />}
              label="Aporte meta"
              tone="support"
              value={simulatedGoalContributionLabel}
            />
            <SummaryMetric
              helper="Después de gastos"
              icon={<TrendingUp color={getToneColors(marginTone).text} size={22} strokeWidth={2.4} />}
              label="Margen"
              tone={marginTone}
              value={getMarginLabel(metrics)}
            />
            <SummaryMetric
              helper="Gastos frente a ingresos"
              icon={<ChartColumnIncreasing color={getToneColors(expensesTone).text} size={22} strokeWidth={2.4} />}
              label="Relación"
              tone={expensesTone}
              value={getExpensePercentageLabel(metrics)}
            />
          </View>

          <View style={styles.calculationHelp}>
            <FinancialEducationModal
              accessibilityLabel="Explicar cómo calculamos el aporte sugerido"
              guidanceMode={guidanceMode}
              icon={<WalletCards color={colors.primary} size={23} strokeWidth={2.4} />}
              title="Cómo calculamos tu aporte sugerido"
              triggerLabel="¿Cómo calculamos este aporte?"
            >
              <FinancialEducationStory
                calculationItems={[
                  {
                    label: "Margen mensual",
                    value:
                      metrics.estimatedMargin !== null
                        ? formatSignedCOP(metrics.estimatedMargin)
                        : getMarginLabel(metrics)
                  },
                  {
                    label: "Porcentaje usado",
                    operator: "×",
                    value: contributionRateLabel
                  },
                  {
                    emphasis: true,
                    label: "Aporte sugerido",
                    operator: "=",
                    value:
                      snapshot.cashflow.suggestedMonthlyContribution > 0
                        ? formatCOP(snapshot.cashflow.suggestedMonthlyContribution)
                        : capacityContributionLabel
                  }
                ]}
                calculationTitle="Cómo estimamos el aporte"
                closeLabel="Cerrar"
                definition={`${contributionRuleText} ${contributionBandRuleText}`}
                estimateLabel={snapshot.precision.label}
                guidanceMode={guidanceMode}
                plainLanguage={contributionPlainLanguage}
                plainLanguageBadge={
                  snapshot.cashflow.suggestedContributionRate !== null
                    ? `${Math.round(snapshot.cashflow.suggestedContributionRate * 100)}%`
                    : "Aporte"
                }
                resultDescription="Es una referencia educativa calculada desde tu margen; no modifica tu plan."
                resultLabel={contributionResultLabel}
                resultValue={
                  snapshot.cashflow.suggestedMonthlyContribution > 0
                    ? formatCOP(snapshot.cashflow.suggestedMonthlyContribution)
                    : capacityContributionLabel
                }
                tone={contributionTone}
              />
            </FinancialEducationModal>
          </View>

          <SectionCard
            compact={isPhone}
            headerAction={
              <FinancialEducationModal
                accessibilityLabel="Explicar la meta simulada"
                guidanceMode={guidanceMode}
                icon={<Target color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Cómo leer tu meta simulada"
              >
                <FinancialEducationCarousel
                  closeLabel="Cerrar"
                  resetKey={`simulated-goal-${guidanceMode}`}
                  slides={simulatedGoalSlides}
                />
              </FinancialEducationModal>
            }
            icon={<Target color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Meta simulada"
          >
            <View style={styles.valueGrid}>
              <ValuePill
                label="Objetivo"
                tone={goalTone}
                value={
                  simulatedGoalTargetAmount !== null
                    ? `${formatCOP(simulatedGoalTargetAmount)} aprox.`
                    : "Por definir"
                }
              />
              <ValuePill
                label="Restante"
                tone="primary"
                value={
                  simulatedGoalRemainingAmount !== null
                    ? `${formatCOP(simulatedGoalRemainingAmount)} aprox.`
                    : "Por calcular"
                }
              />
              <ValuePill label="Tiempo" tone={goalTone} value={goalMonthsLabel} />
              <ValuePill label={goalBudgetModeLabel} tone="support" value={goalBudgetLabel} />
              <ValuePill
                label="Aporte sugerido"
                tone="warning"
                value={capacityContributionLabel}
              />
            </View>
          </SectionCard>

          <SectionCard
            compact={isPhone}
            headerAction={
              <FinancialEducationModal
                accessibilityLabel="Explicar escenarios"
                guidanceMode={guidanceMode}
                icon={<ClipboardCheck color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Cómo leer estos escenarios"
              >
                <FinancialEducationCarousel
                  closeLabel="Cerrar"
                  resetKey={`scenarios-${guidanceMode}`}
                  slides={scenarioSlides}
                />
              </FinancialEducationModal>
            }
            icon={<ClipboardCheck color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Escenarios"
          >
            <View style={styles.scenariosList}>
              {scenarios.map((scenario) => (
                <ScenarioCard
                  compact={isPhone}
                  key={scenario.key}
                  expanded={activeExpandedScenarioKey === scenario.key}
                  maxMonthlyContribution={maxMonthlyContribution}
                  onToggle={() =>
                    setExpandedScenarioKey((current) => {
                      const currentExpandedKey =
                        current === undefined ? defaultExpandedScenarioKey : current;
                      return currentExpandedKey === scenario.key ? null : scenario.key;
                    })
                  }
                  scenario={scenario}
                />
              ))}
            </View>
          </SectionCard>

          <View style={styles.insightsGrid}>
            <View style={[styles.insightCard, isPhone && styles.cardPhone]}>
              <View style={styles.insightHeader}>
                <IconBubble
                  icon={<AlertCircle color={colors.primary} size={22} strokeWidth={2.4} />}
                />
                <Text style={styles.insightTitle}>{snapshot.priority.title}</Text>
              </View>
              <Text style={styles.text}>{snapshot.priority.description}</Text>
            </View>
            <View style={[styles.insightCard, isPhone && styles.cardPhone]}>
              <View style={styles.insightHeader}>
                <IconBubble
                  icon={<ShieldCheck color={colors.support} size={22} strokeWidth={2.4} />}
                  tone="support"
                />
                <Text style={styles.insightTitle}>Antes de invertir</Text>
              </View>
              <Text style={styles.text}>{getInvestmentEducationMessage(onboarding)}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                session ? "Ir al plan mensual" : "Ver vista previa de mi plan mensual"
              }
              iconPosition="right"
              onPress={() =>
                session
                  ? router.push("/action-plan")
                  : router.push("/plan-preview")
              }
              title={session ? "Plan mensual" : "Ver cómo sería mi plan"}
            />
            <PrimaryButton
              accessibilityLabel="Volver a la pantalla anterior"
              icon={null}
              onPress={() => router.back()}
              title="Volver"
              style={[styles.secondaryButton, !isFlowMode && styles.hidden]}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
      {!isFlowMode ? (
        <>
        <BottomNavigation activeRoute="/simulation" />
        <View style={styles.hidden}>
          <BottomNavItem icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
          <BottomNavItem icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
          <BottomNavItem icon={Flag} onNavigate={navigate} route="/goals-overview" title="Metas" />
          <BottomNavItem active icon={LineChart} onNavigate={navigate} route="/simulation" title="Simulación" />
          <BottomNavItem icon={Bot} onNavigate={navigate} route="/assistant" title="Asistente" />
        </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 760,
    width: "100%"
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
    gap: spacing.md,
    padding: spacing.lg
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  heroTextGroup: {
    flexBasis: 260,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  calculationHelp: {
    alignItems: "flex-start"
  },
  summaryMetric: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 260,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.md,
    minHeight: 118,
    padding: spacing.md
  },
  summaryMetricText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  metricLabel: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  metricValue: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  metricHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
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
  sectionTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
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
  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  valuePill: {
    backgroundColor: "#F8FBFF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 180,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 76,
    padding: spacing.md
  },
  valuePillLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  valuePillText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  scenariosList: {
    gap: spacing.md
  },
  scenarioGuideTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  educationSlideContent: {
    gap: spacing.md
  },
  scenarioEducationList: {
    gap: spacing.sm
  },
  scenarioEducationItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  scenarioEducationWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  scenarioGuideText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.regular,
    lineHeight: typography.lineHeight.caption
  },
  scenarioGuideTerm: {
    color: colors.text,
    fontWeight: typography.weight.black,
  },
  scenarioCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  scenarioCardPhone: {
    paddingHorizontal: spacing.sm
  },
  scenarioCardRecommended: {
    backgroundColor: "#FBFFFC",
    borderColor: "#B9E9CD",
    borderWidth: 2
  },
  scenarioTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  scenarioTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 210
  },
  scenarioTitle: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
  },
  scenarioAssumption: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body
  },
  scenarioMainRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  scenarioAmountBlock: {
    flexBasis: 220,
    flexGrow: 1,
    gap: spacing.xs
  },
  amountLabel: {
    color: colors.textSubtle,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  amountValue: {
    color: colors.primary,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  scenarioChips: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexBasis: 180,
    flexGrow: 1,
    flexWrap: "wrap",
    gap: spacing.sm
  },
  scenarioCompactFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  scenarioCompactResult: {
    color: colors.text,
    flex: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    minWidth: 160
  },
  detailToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  detailToggleText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  scenarioDetailBlock: {
    gap: spacing.md
  },
  progressTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: radius.pill,
    height: "100%"
  },
  advanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  scenarioComment: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  insightCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 300,
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  insightHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  insightTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  disclaimerText: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption,
    padding: spacing.md
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
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
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
