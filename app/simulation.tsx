import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Bot,
  CalendarCheck,
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
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { getMonthlyActionImpactSummary } from "../utils/actionProgressImpact";
import {
  calculateFinancialSnapshot,
  type FinancialSnapshot
} from "../utils/financialCalculations";
import { formatCOP } from "../utils/financialRanges";
import { formatGoalContribution, getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import type { ExactFinancialValues } from "../types/financial";
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
  comment: string;
  tone: Tone;
  unavailableContributionLabel?: string;
  unavailableAdvanceLabel?: string;
  unavailableExplanation?: string;
  calculationNote?: string;
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

function toFinancialDisplaySource(source: "exact" | "estimated" | "missing"): FinancialDisplay["source"] {
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
  source: "exact" | "estimated" | "missing";
  value: number | null;
}): FinancialDisplay {
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

function getScenarios(metrics: SimulationBase, registeredContribution = 0): Scenario[] {
  const marginWasUsed = metrics.estimatedMargin !== null && metrics.estimatedMargin > 0;
  const suggestedContribution =
    metrics.snapshot.cashflow.suggestedMonthlyContribution > 0
      ? metrics.snapshot.cashflow.suggestedMonthlyContribution
      : null;
  const balancedBase =
    suggestedContribution !== null
      ? suggestedContribution
      : contributionFromPositiveValue(metrics.estimatedMargin, 0.2);
  const intensiveBase =
    suggestedContribution !== null
      ? suggestedContribution * 1.25
      : contributionFromPositiveValue(metrics.estimatedMargin, 0.35);
  const smallExpensesOnlyNote =
    !marginWasUsed && metrics.smallExpenseValue !== null
      ? "Usa solo gastos pequeños porque el margen mensual aparece ajustado."
      : undefined;

  return [
    ...(registeredContribution > 0
      ? [
          {
            key: "registered",
            name: "Aporte registrado",
            monthlyContribution: registeredContribution,
            assumption: "Monto que registraste en el plan mensual.",
            tags: ["Real del mes", "No reemplaza"],
            comment: "Sirve para comparar tu avance real con los ritmos sugeridos.",
            tone: "purple" as Tone
          }
        ]
      : []),
    {
      key: "current",
      name: "Ritmo actual",
      monthlyContribution: suggestedContribution,
      assumption: "Aporte mensual sugerido por el plan.",
      tags: ["Bajo esfuerzo", "Gradual"],
      comment: "Avance lento, más fácil de sostener.",
      tone: "primary",
      unavailableContributionLabel: "No disponible",
      unavailableAdvanceLabel: "No calculado",
      unavailableExplanation: "Necesitamos margen positivo para estimar un aporte mensual."
    },
    {
      key: "balanced",
      name: "Ajuste equilibrado",
      monthlyContribution: sumAvailableParts([
        balancedBase,
        metrics.snapshot.smallExpenses.opportunityAmount
      ]),
      assumption: "Aporte sugerido + parte de gastos pequeños.",
      tags: ["Recomendado", "Sostenible"],
      comment: "Pequeños cambios pueden liberar espacio sin extremos.",
      tone: "support",
      calculationNote: smallExpensesOnlyNote,
      recommended: true
    },
    {
      key: "intensive",
      name: "Ajuste intensivo",
      monthlyContribution: sumAvailableParts([
        intensiveBase,
        contributionFromPositiveValue(metrics.smallExpenseValue, 0.3)
      ]),
      assumption: "Aporte ampliado + ajuste mayor en gastos pequeños.",
      tags: ["Más exigente", "Revisar"],
      comment: "Úsalo como referencia, no como obligación.",
      tone: "warning",
      calculationNote: smallExpensesOnlyNote
    }
  ];
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
    return "Margen ajustado";
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

  return "Si tu base está estable, puedes explorar inversión con calma y educación.";
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
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <IconBubble icon={icon} />
        <Text style={styles.sectionTitle}>{title}</Text>
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
  onToggle
}: {
  expanded: boolean;
  scenario: Scenario;
  maxMonthlyContribution: number;
  onToggle: () => void;
}) {
  const toneColors = getToneColors(scenario.tone);
  const relativeWidth =
    scenario.monthlyContribution !== null && maxMonthlyContribution > 0
      ? Math.max(10, Math.round((scenario.monthlyContribution / maxMonthlyContribution) * 100))
      : 0;

  return (
    <View
      style={[
        styles.scenarioCard,
        scenario.recommended && styles.scenarioCardRecommended
      ]}
    >
      <View style={styles.scenarioTopRow}>
        <View style={styles.scenarioTitleGroup}>
          <Text style={styles.scenarioTitle}>{scenario.name}</Text>
          <Text style={styles.scenarioAssumption}>{scenario.assumption}</Text>
        </View>
        {scenario.recommended ? <Chip label="Recomendado" tone="support" /> : null}
      </View>

      <View style={styles.scenarioMainRow}>
        <View style={styles.scenarioAmountBlock}>
          <Text style={styles.amountLabel}>Aporte mensual</Text>
          <Text style={[styles.amountValue, { color: toneColors.text }]}>
            {scenario.monthlyContribution !== null
              ? `${formatCOP(scenario.monthlyContribution)} aprox.`
              : scenario.unavailableContributionLabel ?? "No disponible"}
          </Text>
        </View>
        <View style={styles.scenarioChips}>
          {scenario.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              tone={tag === "Recomendado" || scenario.recommended ? "support" : scenario.tone}
            />
          ))}
        </View>
      </View>

      <View style={styles.scenarioCompactFooter}>
        <Text style={styles.scenarioCompactResult}>6 meses: {getAdvanceLabel(scenario, 6)}</Text>
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

          {scenario.unavailableExplanation ? (
            <Text style={styles.helperText}>{scenario.unavailableExplanation}</Text>
          ) : null}
          {scenario.calculationNote ? (
            <Text style={styles.helperText}>{scenario.calculationNote}</Text>
          ) : null}
          <Text style={styles.scenarioComment}>{scenario.comment}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SimulationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isFlowMode = source === "flow";
  const [expandedScenarioKey, setExpandedScenarioKey] = useState<string | null | undefined>(undefined);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const navigate = (route: Route) => router.push(route);
  const { exactValues, onboarding } = useOnboarding();
  const { completedActions } = usePlan();
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
    () => getScenarios(metrics, impactSummary.realContributionTotal),
    [impactSummary.realContributionTotal, metrics]
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <LineChart color={colors.primary} size={31} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={styles.title}>Simulación</Text>
              <Text style={styles.subtitle}>
                Compara tres ritmos posibles para avanzar este mes.
              </Text>
            </View>
            <View style={styles.heroChips}>
              <Chip label={snapshot.precision.label} tone={snapshot.precision.status === "clearer" ? "support" : "primary"} />
              <Chip label="Educativo" tone="support" />
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
              helper="Aporte asignado"
              icon={<PiggyBank color={colors.support} size={22} strokeWidth={2.4} />}
              label="Mes a mes"
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

          <SectionCard
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
            </View>
          </SectionCard>

          <SectionCard
            icon={<ClipboardCheck color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Escenarios"
          >
            <Text style={styles.helperText}>
              Los avances son una referencia: aporte mensual estimado multiplicado por 3, 6 y 12 meses.
            </Text>
            <View style={styles.scenariosList}>
              {scenarios.map((scenario) => (
                <ScenarioCard
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
            <View style={styles.insightCard}>
              <IconBubble
                icon={<AlertCircle color={colors.primary} size={22} strokeWidth={2.4} />}
              />
              <Text style={styles.insightTitle}>{snapshot.priority.title}</Text>
              <Text style={styles.text}>{snapshot.priority.description}</Text>
            </View>
            <View style={styles.insightCard}>
              <IconBubble
                icon={<ShieldCheck color={colors.support} size={22} strokeWidth={2.4} />}
                tone="support"
              />
              <Text style={styles.insightTitle}>Antes de invertir</Text>
              <Text style={styles.text}>{getInvestmentEducationMessage(onboarding)}</Text>
            </View>
          </View>

          <SectionCard
            icon={<WalletCards color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Como se calculo"
          >
            <Text style={styles.helperText}>{snapshot.precision.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowCalculationDetails((current) => !current)}
              style={({ pressed }) => [styles.detailToggle, styles.calculationToggle, pressed && styles.pressed]}
            >
              <Text style={styles.detailToggleText}>
                {showCalculationDetails ? "Ocultar datos usados" : "Ver datos usados"}
              </Text>
              {showCalculationDetails ? (
                <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
              ) : (
                <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
              )}
            </Pressable>
            {showCalculationDetails ? (
            <View style={styles.valueGrid}>
              <ValuePill label={metrics.incomeDisplay.label} value={metrics.incomeDisplay.value} />
              <ValuePill label={metrics.expenseDisplay.label} value={metrics.expenseDisplay.value} />
              <ValuePill
                label="Gastos pequeños"
                tone="warning"
                value={getSmallExpenseLabel(onboarding, metrics)}
              />
            </View>
            ) : null}
          </SectionCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Ir al plan mensual"
              icon={CalendarCheck}
              iconPosition="right"
              onPress={() => router.push("/action-plan")}
              title="Plan mensual"
            />
            <PrimaryButton
              accessibilityLabel="Volver al diagnóstico financiero"
              icon={null}
              onPress={() => router.push("/diagnosis")}
              title="Volver al diagnóstico"
              style={!isFlowMode && styles.hidden}
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
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
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
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
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
  scenarioCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
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
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  scenarioAssumption: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
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
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
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
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
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
  calculationToggle: {
    marginTop: -spacing.xs
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
  insightTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
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
