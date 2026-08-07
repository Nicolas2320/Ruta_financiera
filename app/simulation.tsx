import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bot,
  ClipboardCheck,
  Flag,
  Home,
  LineChart,
  PieChart,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { DistributionComparisonSummary } from "../components/DistributionComparisonSummary";
import { DistributionScenarioCard } from "../components/DistributionScenarioCard";
import { PreliminarySimulationComparison } from "../components/PreliminarySimulationComparison";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  ProtectedMarginControl,
  type ProtectedMarginMode
} from "../components/ProtectedMarginControl";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { type SimulationPlanStrategy } from "../types/financial";
import {
  buildDistributionScenarios,
  calculateProtectedMargin,
  type DistributionStrategyId,
  type ProtectedMarginPreference
} from "../utils/financialDistribution";
import { presentDistributionScenarios } from "../utils/financialDistributionPresentation";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { calculateFinancialSnapshot } from "../utils/financialCalculations";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import {
  buildSimulationExperience,
  type SimulationAmountRange
} from "../utils/simulationExperience";

type Tone = "primary" | "support" | "warning" | "purple" | "neutral";
type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};
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

function formatSimulationAmountRange(range: SimulationAmountRange) {
  if (range.minimum === null && range.maximum === null) {
    return "Por estimar";
  }

  if (range.minimum !== null && range.maximum === null) {
    return `Más de ${formatCOP(range.minimum)}`;
  }

  if (range.minimum === null && range.maximum !== null) {
    return `Hasta ${formatCOP(range.maximum)}`;
  }

  if (range.minimum === range.maximum) {
    return formatCOP(range.minimum ?? 0);
  }

  return `${formatCOP(range.minimum ?? 0)} – ${formatCOP(range.maximum ?? 0)}`;
}

function IconBubble({ icon, tone = "primary" }: { icon: ReactNode; tone?: Tone }) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: getToneColors(tone).background }]}>
      {icon}
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

export default function SimulationScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ source?: string }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isFlowMode = source === "flow";
  const navigate = (route: Route) => router.push(route);
  const { session } = useAuth();
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const [protectedMarginMode, setProtectedMarginMode] =
    useState<ProtectedMarginMode>("automatic");
  const [customProtectedMarginInput, setCustomProtectedMarginInput] = useState("");
  const [selectedPlanStrategy, setSelectedPlanStrategy] =
    useState<SimulationPlanStrategy>("diagnosis_recommended");
  const [selectedDistributionId, setSelectedDistributionId] =
    useState<DistributionStrategyId>("current_reference");
  const [expandedDistributionId, setExpandedDistributionId] =
    useState<string>("current_reference");
  const [splitDebtPercent, setSplitDebtPercent] = useState(50);

  const projectionInput = useMemo(
    () => buildFinancialProjectionInput({ exactValues, onboarding }),
    [exactValues, onboarding]
  );
  const simulationExperience = useMemo(
    () => buildSimulationExperience({ exactValues, onboarding }),
    [exactValues, onboarding]
  );
  const isDetailedDebtMode = simulationExperience.mode === "detailed_debt";
  const protectedMarginBase = isDetailedDebtMode
    ? projectionInput.cashflow.availableAfterRequiredPayments
    : simulationExperience.planningMonthlyMargin;
  const automaticProtectedMargin = Math.round(
    Math.max(0, protectedMarginBase ?? 0) * 0.1
  );
  const customProtectedMargin = parseCOPInput(customProtectedMarginInput) ?? 0;
  const protectedMarginPreference: ProtectedMarginPreference =
    protectedMarginMode === "custom"
      ? { amount: customProtectedMargin, mode: "custom" }
      : { mode: protectedMarginMode };
  const activeProjectionGoals = projectionInput.goals.filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );
  const distributionScenarioSet = useMemo(
    () =>
      buildDistributionScenarios({
        input: projectionInput,
        protectedMarginPreference,
        splitDebtShare: splitDebtPercent / 100
      }),
    [projectionInput, protectedMarginPreference, splitDebtPercent]
  );
  const distributionScenarios = useMemo(
    () =>
      presentDistributionScenarios({
        input: projectionInput,
        scenarios: distributionScenarioSet
      }),
    [distributionScenarioSet, projectionInput]
  );
  const strategyBaseScenario = distributionScenarioSet.reduceInterest;
  const preliminaryProtectedMargin =
    !isDetailedDebtMode && simulationExperience.planningMonthlyMargin !== null
      ? calculateProtectedMargin({
          preference: protectedMarginPreference,
          surplusBeforeProtection: Math.max(0, simulationExperience.planningMonthlyMargin)
        }).result
      : null;
  const hasDistributionBase = isDetailedDebtMode
    ? strategyBaseScenario.surplusBeforeProtection !== null
    : simulationExperience.planningMonthlyMargin !== null;
  const surplusBeforeProtection = isDetailedDebtMode
    ? hasDistributionBase
      ? Math.max(0, strategyBaseScenario.surplusBeforeProtection ?? 0)
      : null
    : simulationExperience.planningMonthlyMargin === null
      ? null
      : Math.max(0, simulationExperience.planningMonthlyMargin);
  const protectedAmount = isDetailedDebtMode
    ? hasDistributionBase
      ? strategyBaseScenario.protectedMargin.amount
      : null
    : preliminaryProtectedMargin?.amount ?? null;
  const distributableAmount = isDetailedDebtMode
    ? hasDistributionBase
      ? strategyBaseScenario.distributableAmount
      : null
    : surplusBeforeProtection === null || protectedAmount === null
      ? null
      : Math.max(0, surplusBeforeProtection - protectedAmount);
  const canSelectPreliminaryGoal = Boolean(
    activeProjectionGoals.length > 0 &&
      distributableAmount !== null &&
      distributableAmount > 0 &&
      simulationExperience.planningMonthlyMargin !== null
  );
  const selectedDetailedScenario = distributionScenarios.find(
    (scenario) => scenario.id === selectedDistributionId
  );
  const strategyToSave: SimulationPlanStrategy = isDetailedDebtMode
    ? selectedDetailedScenario?.status === "ready"
      ? selectedDistributionId
      : "current_reference"
    : selectedPlanStrategy === "prioritize_goal" && canSelectPreliminaryGoal
      ? "accelerate_goal"
      : "diagnosis_recommended";
  const debtShareToSave =
    strategyToSave === "split_debt_goal" ? splitDebtPercent / 100 : null;
  const customProtectedMarginToSave =
    protectedMarginMode === "custom" ? customProtectedMargin : null;
  const storedPreference = onboarding.simulationPlanPreference;
  const normalizedStoredStrategy =
    storedPreference?.strategy === "prioritize_goal"
      ? "accelerate_goal"
      : storedPreference?.strategy;
  const storedSelectionMatches = Boolean(
    storedPreference &&
      normalizedStoredStrategy === strategyToSave &&
      storedPreference.debtShare === debtShareToSave &&
      storedPreference.protectedMarginMode === protectedMarginMode &&
      storedPreference.customProtectedMargin === customProtectedMarginToSave
  );
  const monthlyOperatingCosts = simulationExperience.monthlyOperatingCosts;
  const cashflowIssueRoute =
    projectionInput.issues.find(
      (issue) => issue.code === "missing_income" || issue.code === "missing_expenses"
    )?.ownerRoute ?? "/improve-plan";

  const handleProtectedMarginModeChange = (mode: ProtectedMarginMode) => {
    if (mode === "custom" && customProtectedMarginInput.length === 0) {
      setCustomProtectedMarginInput(formatCOP(automaticProtectedMargin));
    }

    setProtectedMarginMode(mode);
  };

  useEffect(() => {
    const preference = onboarding.simulationPlanPreference;

    if (!preference) {
      return;
    }

    setProtectedMarginMode(preference.protectedMarginMode);
    setCustomProtectedMarginInput(
      preference.customProtectedMargin === null
        ? ""
        : formatCOP(preference.customProtectedMargin)
    );
    if (
      preference.strategy === "current_reference" ||
      preference.strategy === "reduce_interest" ||
      preference.strategy === "accelerate_goal" ||
      preference.strategy === "split_debt_goal"
    ) {
      setSelectedDistributionId(preference.strategy);
    } else if (preference.strategy === "prioritize_goal") {
      setSelectedDistributionId("accelerate_goal");
    }
    if (preference.debtShare !== null) {
      setSplitDebtPercent(Math.round(preference.debtShare * 100));
    }
    setSelectedPlanStrategy(
      (preference.strategy === "prioritize_goal" ||
        preference.strategy === "accelerate_goal")
        ? "prioritize_goal"
        : "diagnosis_recommended"
    );
  }, [onboarding.simulationPlanPreference?.selectedAt]);

  useEffect(() => {
    if (canSelectPreliminaryGoal && selectedPlanStrategy !== "prioritize_goal") {
      setSelectedPlanStrategy("prioritize_goal");
    } else if (
      selectedPlanStrategy === "prioritize_goal" &&
      !canSelectPreliminaryGoal
    ) {
      setSelectedPlanStrategy("diagnosis_recommended");
    }
  }, [canSelectPreliminaryGoal, selectedPlanStrategy]);

  const saveStrategyPreference = (strategy: SimulationPlanStrategy) => {
    updateOnboarding({
      simulationPlanPreference: {
        strategy,
        goalId: null,
        debtShare: strategy === "split_debt_goal" ? splitDebtPercent / 100 : null,
        protectedMarginMode,
        customProtectedMargin: customProtectedMarginToSave,
        selectedAt: new Date().toISOString()
      }
    });
  };

  const handleContinue = () => {
    saveStrategyPreference(strategyToSave);

    session ? router.push("/action-plan") : router.push("/plan-preview");
  };

  const handleCustomProtectedMarginChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setCustomProtectedMarginInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const getResolutionRoute = (
    issueCodes: Array<(typeof distributionScenarios)[number]["issueCodes"][number]>
  ): Route => {
    if (issueCodes.includes("missing_cashflow")) return cashflowIssueRoute;
    if (
      issueCodes.includes("missing_goal") ||
      issueCodes.includes("missing_goal_target")
    ) {
      return "/goals-overview";
    }

    return "/debts";
  };

  const snapshot = useMemo(
    () => calculateFinancialSnapshot({ onboarding, exactValues }),
    [exactValues, onboarding]
  );
  const debtMetricLabel = isDetailedDebtMode
    ? "Cuotas de deuda"
    : simulationExperience.mode === "reported_debt"
      ? snapshot.debt.isPaymentEstimated
        ? "Pagos de deuda estimados"
        : "Pagos de deuda"
      : "Pagos de deuda";
  const debtMetricValue = isDetailedDebtMode
    ? formatCOP(projectionInput.cashflow.knownRequiredDebtPaymentsTotal)
    : formatSimulationAmountRange(simulationExperience.debtPaymentRange);
  const debtMetricHelper = isDetailedDebtMode
    ? projectionInput.cashflow.hasCompleteRequiredDebtPayments
      ? "Pagos mínimos o acordados"
      : "Falta confirmar una o más cuotas"
    : simulationExperience.mode === "goal_only"
      ? "Indicaste que no pagas deudas"
      : simulationExperience.debtDataSource === "category"
        ? "Referencia registrada dentro de gastos"
        : snapshot.debt.reportedPaymentKind === "exact"
          ? "Pago mensual informado"
          : snapshot.debt.reportedPaymentKind === "range"
            ? "Según el rango mensual que elegiste"
        : onboarding.debtPaymentShare
          ? `Según tu respuesta: ${onboarding.debtPaymentShare}`
          : "Sin inventar una cuota exacta";
  const heroSubtitle = isDetailedDebtMode
    ? "Compara distintas formas de repartir el mismo dinero mensual. Ninguna alternativa cambia tu plan hasta que tú lo decidas."
    : simulationExperience.mode === "reported_debt"
      ? snapshot.debt.reportedPaymentKind === "exact"
        ? "Explora tu capacidad mensual con el pago total que informaste, sin inventar saldos ni intereses."
        : "Explora tu capacidad mensual sin registrar cada deuda. Trabajamos con el rango que compartiste y evitamos inventar saldos o intereses."
      : "Explora cuánto podrías dirigir a tus metas y cómo cambia el resultado al proteger una parte del margen.";

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
              <Text style={styles.subtitle}>{heroSubtitle}</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryMetric
              helper={
                projectionInput.cashflow.monthlyIncomeSource === "exact"
                  ? "Dato registrado"
                  : "Estimado desde tu rango"
              }
              icon={<WalletCards color={colors.support} size={22} strokeWidth={2.4} />}
              label="Ingreso mensual"
              tone="support"
              value={
                projectionInput.cashflow.monthlyIncome === null
                  ? "No disponible"
                  : formatCOP(projectionInput.cashflow.monthlyIncome)
              }
            />
            <SummaryMetric
              helper="Principales y pequeños; no incluye deudas"
              icon={<PieChart color={colors.primary} size={22} strokeWidth={2.4} />}
              label="Gastos sin deudas"
              value={
                monthlyOperatingCosts === null
                  ? "No disponible"
                  : formatCOP(monthlyOperatingCosts)
              }
            />
            <SummaryMetric
              helper={debtMetricHelper}
              icon={<ClipboardCheck color="#B45309" size={22} strokeWidth={2.4} />}
              label={debtMetricLabel}
              tone="warning"
              value={debtMetricValue}
            />
            <SummaryMetric
              helper={
                isDetailedDebtMode
                  ? "Después de dejar una parte libre para el mes"
                  : simulationExperience.planningMonthlyMargin === null
                    ? "No lo calculamos sin una referencia prudente"
                    : "Calculado después de dejar una parte libre para el mes"
              }
              icon={<TrendingUp color={colors.primary} size={22} strokeWidth={2.4} />}
              label="Para repartir"
              value={
                distributableAmount === null
                  ? "No disponible"
                  : formatCOP(distributableAmount)
              }
            />
          </View>

          <SectionCard
            compact={isPhone}
            icon={<ShieldCheck color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Antes de repartir"
          >
            <ProtectedMarginControl
              customAmountInput={customProtectedMarginInput}
              distributableAmount={distributableAmount}
              mode={protectedMarginMode}
              onCustomAmountChange={handleCustomProtectedMarginChange}
              onModeChange={handleProtectedMarginModeChange}
              protectedAmount={protectedAmount}
              surplusBeforeProtection={surplusBeforeProtection}
            />
          </SectionCard>

          <SectionCard
            compact={isPhone}
            icon={<Target color={colors.primary} size={22} strokeWidth={2.4} />}
            title="Metas"
          >
            {activeProjectionGoals.length > 0 ? (
              <View style={styles.goalsSummaryList}>
                {activeProjectionGoals.map((goal) => (
                  <View key={goal.id} style={styles.goalSummaryRow}>
                    <View style={styles.goalSummaryTitleRow}>
                      <Text style={styles.goalSummaryTitle}>{goal.title}</Text>
                      {goal.isPrimary ? (
                        <View style={styles.primaryGoalChip}>
                          <Text style={styles.primaryGoalChipText}>Meta principal</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.goalSummaryText}>
                      {goal.targetAmountSource === "range" && goal.amountRange
                        ? goal.amountRange
                        : goal.targetAmount === null
                          ? "Monto por definir"
                          : formatCOP(goal.targetAmount)}
                      {" · "}
                      {formatTargetMonth(goal.targetMonth)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.text}>
                  Crea una meta activa para proyectar cómo se repartiría el aporte mensual.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/goals-overview")}
                  style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
                >
                  <Text style={styles.inlineButtonText}>Ir a metas</Text>
                </Pressable>
              </View>
            )}
          </SectionCard>

          {isDetailedDebtMode ? (
            <>
              <SectionCard
                compact={isPhone}
                icon={<TrendingUp color={colors.primary} size={22} strokeWidth={2.4} />}
                title="Resumen comparativo"
              >
                <DistributionComparisonSummary
                  compact={isPhone}
                  scenarios={distributionScenarios}
                />
              </SectionCard>

              <SectionCard
                compact={isPhone}
                icon={<ClipboardCheck color={colors.primary} size={22} strokeWidth={2.4} />}
                title="Estrategias para el mismo dinero"
              >
                <Text style={styles.sectionDescription}>
                  Todas conservan primero tus gastos y cuotas requeridas. Lo único que cambia
                  es el destino del dinero que queda disponible. Elige una para que Metas,
                  Deudas, el dashboard y tu plan mensual usen la misma distribución.
                </Text>
                <View style={styles.scenariosList}>
                  {distributionScenarios.map((scenario) => (
                    <DistributionScenarioCard
                      expanded={expandedDistributionId === scenario.id}
                      key={scenario.id}
                      onResolve={
                        scenario.status === "ready"
                          ? undefined
                          : () => router.push(getResolutionRoute(scenario.issueCodes))
                      }
                      onSplitDebtPercentChange={setSplitDebtPercent}
                      onSelect={
                        scenario.status === "ready"
                          ? () => setSelectedDistributionId(scenario.id)
                          : undefined
                      }
                      onSave={
                        scenario.status === "ready" &&
                        selectedDistributionId === scenario.id &&
                        !storedSelectionMatches
                          ? () => saveStrategyPreference(scenario.id)
                          : undefined
                      }
                      onToggle={() =>
                        setExpandedDistributionId((current) =>
                          current === scenario.id ? "" : scenario.id
                        )
                      }
                      scenario={scenario}
                      saved={
                        selectedDistributionId === scenario.id && storedSelectionMatches
                      }
                      selected={selectedDistributionId === scenario.id}
                    />
                  ))}
                </View>
                <Text style={styles.disclaimerText}>
                  Selecciona una estrategia y usa Guardar para aplicarla. Si cambias el
                  porcentaje entre deudas y metas, vuelve a guardarla. Esto no registra pagos
                  ni separa dinero.
                </Text>
              </SectionCard>
            </>
          ) : (
            <SectionCard
              compact={isPhone}
              icon={<TrendingUp color={colors.primary} size={22} strokeWidth={2.4} />}
              title="Proyección de tus metas"
            >
              <PreliminarySimulationComparison
                asOfDate={projectionInput.asOfDate}
                distributableAmount={distributableAmount}
                experience={simulationExperience}
                goals={activeProjectionGoals}
                onSelect={setSelectedPlanStrategy}
                selectedStrategy={selectedPlanStrategy}
              />
            </SectionCard>
          )}

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                session ? "Ir al plan mensual" : "Ver vista previa de mi plan mensual"
              }
              iconPosition="right"
              onPress={handleContinue}
              title={
                isDetailedDebtMode
                  ? session
                    ? "Plan mensual"
                    : "Ver cómo sería mi plan"
                  : session
                    ? selectedPlanStrategy === "prioritize_goal"
                      ? "Continuar"
                      : "Continuar"
                    : selectedPlanStrategy === "prioritize_goal"
                      ? "Ver plan"
                      : "Ver vista previa del plan"
              }
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
  goalsSummaryList: {
    gap: spacing.sm
  },
  goalSummaryRow: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  goalSummaryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  goalSummaryTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  goalSummaryText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  primaryGoalChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3
  },
  primaryGoalChipText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
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
  sectionDescription: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  emptyState: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  inlineButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inlineButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
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
