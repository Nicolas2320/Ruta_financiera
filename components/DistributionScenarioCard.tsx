import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { DistributionScenarioPresentation } from "../utils/financialDistributionPresentation";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import { DebtGoalAllocationSlider } from "./DebtGoalAllocationSlider";
import { PrimaryButton } from "./PrimaryButton";
import { SelectableCard } from "./ui/SelectableCard";
import {
  FinancialTimelineChart,
  financialTimelineChartColors,
  type FinancialTimelineFocus
} from "./FinancialTimelineChart";

const MOBILE_STRATEGY_MAX_WIDTH = 236;

function getStatusLabel(scenario: DistributionScenarioPresentation) {
  if (scenario.issueCodes.includes("missing_debt_details")) return "Faltan deudas";
  if (scenario.status === "incomplete") return "Faltan datos";
  if (scenario.status === "no_surplus") return "Sin margen";
  if (scenario.status === "not_applicable") return "No aplica";
  return scenario.badge;
}

function getHeadline(scenario: DistributionScenarioPresentation) {
  if (scenario.status !== "ready") {
    return scenario.issueMessages[0] ?? "Esta estrategia todavía no se puede calcular.";
  }

  if (scenario.id === "current_reference") {
    return scenario.unassignedAmount > 0
      ? `${formatCOP(scenario.unassignedAmount)} quedan sin repartir.`
      : "Todo el dinero disponible ya tiene un destino registrado.";
  }

  if (scenario.id === "reduce_interest") {
    const destination = scenario.targetDebtTitles.join(", ");
    return scenario.extraDebtPayment > 0
      ? `En el primer mes: ${formatCOP(scenario.extraDebtPayment)} adicionales para ${destination}.`
      : "No se encontró una deuda elegible para recibir un pago adicional.";
  }

  if (scenario.id === "accelerate_goal") {
    return scenario.goalContribution > 0
      ? `En el primer mes: ${formatCOP(scenario.goalContribution)} entre tus metas.`
      : "No se pudo asignar dinero a tus metas activas.";
  }

  return `En el primer mes: ${formatCOP(scenario.extraDebtPayment)} adicionales a deuda y ${formatCOP(
    scenario.goalContribution
  )} a tus metas.`;
}

function AllocationValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.allocationValue}>
      <Text style={styles.allocationLabel}>{label}</Text>
      <Text style={styles.allocationAmount}>{value}</Text>
    </View>
  );
}

function getTimelineFocus(
  scenario: DistributionScenarioPresentation
): FinancialTimelineFocus {
  if (scenario.id === "split_debt_goal") return "combined";
  if (scenario.id === "accelerate_goal") return "goal";
  if (scenario.id === "current_reference" && scenario.goalContribution > 0) {
    return "combined";
  }
  return "debt";
}

function formatSentenceMonth(value: string) {
  const formatted = formatTargetMonth(value);
  return `${formatted.charAt(0).toLocaleLowerCase("es-CO")}${formatted.slice(1)}`;
}

function ProjectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.projectionMetric}>
      <Text style={styles.projectionMetricLabel}>{label}</Text>
      <Text style={styles.projectionMetricValue}>{value}</Text>
    </View>
  );
}

function TimelinePreview({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const timeline = scenario.timeline;
  const [selectedGoalId, setSelectedGoalId] = useState(
    timeline.trackedGoal?.goalId ?? timeline.trackedGoals[0]?.goalId ?? ""
  );

  if (timeline.months.length === 0) {
    return null;
  }

  const focus = getTimelineFocus(scenario);
  const firstMonth = timeline.months[0];
  const startingKnownDebtBalance = firstMonth.debtPayments.reduce(
    (total, payment) => total + (payment.startingBalance ?? 0),
    0
  );
  const firstDebtPayment = firstMonth.baseDebtPayments + firstMonth.extraDebtPayments;
  const trackedGoals = timeline.trackedGoals;
  const selectedGoal =
    trackedGoals.find((goal) => goal.goalId === selectedGoalId) ??
    timeline.trackedGoal ??
    trackedGoals[0] ??
    null;
  const selectedGoalProjection = selectedGoal
    ? scenario.goalProjections.find(
        (projection) => projection.goalId === selectedGoal.goalId
      ) ?? null
    : null;
  const selectedGoalCompletionMonth = selectedGoal
    ? timeline.goalCompletionMonths[selectedGoal.goalId] ?? null
    : null;
  const selectedGoalContribution = selectedGoal
    ? firstMonth.goalContributions.find(
        (contribution) => contribution.goalId === selectedGoal.goalId
      )?.amount ?? 0
    : 0;
  const payoffEvents = timeline.months
    .filter((month) => month.newlyPaidDebtIds.length > 0)
    .slice(0, 4);
  const title =
    focus === "debt"
      ? timeline.allKnownDebtsPaidMonth
        ? `Con este plan sales de deudas en ${formatSentenceMonth(
            timeline.allKnownDebtsPaidMonth
          )}`
        : "Así cambiaría tu deuda durante la proyección"
      : focus === "goal"
        ? trackedGoals.length > 1
          ? "Fechas estimadas con el reparto mensual"
          : selectedGoalCompletionMonth
            ? `Con este plan alcanzas tu meta en ${formatSentenceMonth(
                selectedGoalCompletionMonth
              )}`
            : `Así avanzaría ${selectedGoal?.title ?? "tu meta"}`
        : trackedGoals.length > 1
          ? "Así avanzan tus deudas y metas con el mismo dinero"
          : "Así avanzan tu deuda y tu meta con el mismo dinero";
  const description =
    focus === "combined" && selectedGoal
      ? `El ${100 - (scenario.debtSharePercent ?? 50)}% destinado a metas se reparte según su saldo pendiente, fecha objetivo y prioridad. Aquí ves cuánto recibe ${selectedGoal.title}.`
      : focus === "debt"
      ? "El saldo conocido baja con los pagos previstos en esta estrategia."
      : selectedGoalProjection?.targetMonth
        ? `Para ${formatTargetMonth(
            selectedGoalProjection.targetMonth
          )} reunirías aproximadamente ${formatCOP(
            selectedGoalProjection.amountAtTargetMonth
          )} de ${formatCOP(selectedGoalProjection.targetAmount)}.`
        : focus === "goal"
          ? "El aporte se pondera por saldo pendiente, fecha objetivo y prioridad principal."
          : "Deudas y metas comparten los mismos meses, pero conservan escalas independientes.";
  const metrics =
    focus === "debt"
      ? [
          { label: "Saldo al comenzar", value: formatCOP(startingKnownDebtBalance) },
          { label: "Pago del primer mes", value: formatCOP(firstDebtPayment) },
          {
            label: "Intereses estimados",
            value: timeline.hasUnknownInterestRates
              ? "No calculable"
              : formatCOP(timeline.totalInterestCharged)
          }
        ]
      : focus === "goal"
        ? [
            { label: "Meta seleccionada", value: selectedGoal?.title ?? "Por seleccionar" },
            { label: "Aporte mensual", value: formatCOP(selectedGoalContribution) },
            {
              label: "Fecha estimada",
              value: selectedGoalCompletionMonth
                ? formatTargetMonth(selectedGoalCompletionMonth)
                : "Por proyectar"
            }
          ]
        : [
            { label: "Deuda al comenzar", value: formatCOP(startingKnownDebtBalance) },
            {
              label: selectedGoal
                ? `Aporte a ${selectedGoal.title}`
                : "Aporte a metas",
              value: formatCOP(selectedGoalContribution)
            },
            {
              label: "Fecha estimada de meta",
              value: selectedGoalCompletionMonth
                ? formatTargetMonth(selectedGoalCompletionMonth)
                : "Por proyectar"
            }
          ];

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineHeader}>
        <View style={styles.timelineHeaderCopy}>
          <Text style={styles.timelineEyebrow}>
            {focus === "debt"
              ? "PROYECCIÓN DE DEUDA"
              : focus === "goal"
                ? "PROYECCIÓN DE METAS"
                : "DEUDAS Y METAS"}
          </Text>
          <Text style={styles.timelineTitle}>{title}</Text>
          <Text style={styles.timelineDescription}>{description}</Text>
        </View>
        <View style={styles.timelineBadges}>
          {focus !== "goal" && timeline.allKnownDebtsPaidMonth ? (
            <View style={styles.timelineBadge}>
              <Text style={styles.timelineBadgeText}>
                Sin deudas: {formatTargetMonth(timeline.allKnownDebtsPaidMonth)}
              </Text>
            </View>
          ) : null}
          {focus !== "debt" && selectedGoal ? (
            <View style={[styles.timelineBadge, styles.timelineGoalBadge]}>
              <Text style={[styles.timelineBadgeText, styles.timelineGoalBadgeText]}>
                {selectedGoal.title}: {selectedGoalCompletionMonth
                  ? formatTargetMonth(selectedGoalCompletionMonth)
                  : "Por proyectar"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.projectionMetrics}>
        {metrics.map((metric) => (
          <ProjectionMetric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </View>

      <FinancialTimelineChart
        focus={focus}
        onSelectedGoalChange={setSelectedGoalId}
        selectedGoalId={selectedGoalId}
        timeline={timeline}
      />

      {scenario.id === "current_reference" && scenario.timeline.trackedGoals.length > 0 ? (
        <View style={styles.inactiveGoalsNotice}>
          <Text style={styles.inactiveGoalsNoticeText}>
            Esta alternativa no realiza aportes mensuales a tus metas.
          </Text>
        </View>
      ) : null}

      {focus !== "goal" && payoffEvents.length > 0 ? (
        <View style={styles.timelineMilestones}>
          <Text style={styles.timelineMilestonesTitle}>Hitos de pago</Text>
          <View style={styles.timelineMilestoneList}>
          {payoffEvents.map((month) => {
            const paidDebtTitles = month.debtPayments
              .filter((payment) => month.newlyPaidDebtIds.includes(payment.debtId))
              .map((payment) => payment.title);

            return (
              <View key={month.month} style={styles.timelineMilestone}>
                <View style={styles.timelineMilestoneDot} />
                <View style={styles.timelineMilestoneCopy}>
                  <Text style={styles.timelineMilestoneMonth}>
                    {formatTargetMonth(month.month)}
                  </Text>
                  <Text style={styles.timelineMilestoneText}>
                    {paidDebtTitles.join(", ")} · libera {formatCOP(
                      month.releasedPaymentNextMonth
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getOutcomeLabels(scenario: DistributionScenarioPresentation) {
  if (scenario.status !== "ready" || scenario.timeline.months.length === 0) {
    return [];
  }

  const labels: Array<{ kind: "debt" | "goal"; label: string }> = [];
  const firstMonth = scenario.timeline.months[0];

  if (firstMonth.debtPayments.length === 0) {
    labels.push({ kind: "debt", label: "Sin deudas registradas" });
  } else if (!scenario.timeline.allDebtBalancesKnown) {
    labels.push({ kind: "debt", label: "Deudas: faltan saldos" });
  } else if (scenario.timeline.allKnownDebtsPaidMonth) {
    labels.push({
      kind: "debt",
      label: `Sin deudas: ${formatTargetMonth(scenario.timeline.allKnownDebtsPaidMonth)}`
    });
  } else {
    labels.push({ kind: "debt", label: "Deudas: más de 10 años" });
  }

  if (scenario.timeline.trackedGoal) {
    labels.push({
      kind: "goal",
      label: scenario.timeline.goalCompletionMonth
        ? `Meta: ${formatTargetMonth(scenario.timeline.goalCompletionMonth)}`
        : scenario.goalContribution > 0
          ? "Meta: por proyectar"
          : "Metas: sin aporte mensual"
    });
  }

  return labels;
}

export function DistributionStrategyOption({
  applied,
  compact,
  compactWidth,
  onResolve,
  onSelect,
  resolveLabel = "Completar información",
  scenario,
  selected
}: {
  applied: boolean;
  compact: boolean;
  compactWidth?: number;
  onResolve?: () => void;
  onSelect?: () => void;
  resolveLabel?: string;
  scenario: DistributionScenarioPresentation;
  selected: boolean;
}) {
  const unavailable = scenario.status !== "ready";

  return (
    <SelectableCard
      accessibilityLabel={`${scenario.label}. ${getHeadline(scenario)}${applied ? ". Estrategia actual" : selected ? ". Vista previa" : ""}`}
      onPress={(unavailable ? onResolve : onSelect) ?? (() => undefined)}
      selected={selected}
      showControl={false}
      style={[
        styles.optionCard,
        compact && styles.optionCardCompact,
        compact && compactWidth ? { width: compactWidth } : null,
        unavailable && styles.cardUnavailable
      ]}
      title={scenario.label}
      titleStyle={styles.optionTitle}
      variant="stack"
    >
      <View style={styles.optionMeta}>
        <View style={[styles.badge, unavailable && styles.badgeUnavailable]}>
          <Text style={[styles.badgeText, unavailable && styles.badgeTextUnavailable]}>
            {getStatusLabel(scenario)}
          </Text>
        </View>
        {applied ? (
          <View style={styles.appliedBadge}>
            <Text style={styles.appliedBadgeText}>Actual</Text>
          </View>
        ) : unavailable ? (
          <View style={styles.resolveLink}>
            <Text style={styles.resolveLinkText}>{resolveLabel}</Text>
            <ArrowRight color={colors.primary} size={16} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>
    </SelectableCard>
  );
}

export function DistributionStrategyNavigator({
  compact,
  isApplied,
  onResolve,
  onSelect,
  resolveLabel,
  scenarios,
  selectedId
}: {
  compact: boolean;
  isApplied: (id: DistributionScenarioPresentation["id"]) => boolean;
  onResolve: (scenario: DistributionScenarioPresentation) => void;
  onSelect: (scenario: DistributionScenarioPresentation) => void;
  resolveLabel: (scenario: DistributionScenarioPresentation) => string | undefined;
  scenarios: DistributionScenarioPresentation[];
  selectedId: DistributionScenarioPresentation["id"];
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    scenarios.findIndex((scenario) => scenario.id === selectedId)
  );
  const compactCardWidth = carouselWidth
    ? Math.min(MOBILE_STRATEGY_MAX_WIDTH, carouselWidth - spacing.xl)
    : MOBILE_STRATEGY_MAX_WIDTH;
  const carouselInset = carouselWidth
    ? Math.max(spacing.md, (carouselWidth - compactCardWidth) / 2)
    : spacing.md;
  const snapInterval = compactCardWidth + spacing.sm;

  useEffect(() => {
    if (!compact) return;
    scrollRef.current?.scrollTo({
      animated: true,
      x: selectedIndex * snapInterval,
      y: 0
    });
  }, [compact, selectedIndex, snapInterval]);

  const selectAtIndex = (index: number) => {
    const scenario = scenarios[index];
    if (!scenario) return;
    if (scenario.status === "ready") {
      onSelect(scenario);
      return;
    }
    onResolve(scenario);
  };

  const findReadyIndex = (direction: -1 | 1) => {
    let nextIndex = selectedIndex + direction;
    while (nextIndex >= 0 && nextIndex < scenarios.length) {
      if (scenarios[nextIndex]?.status === "ready") return nextIndex;
      nextIndex += direction;
    }
    return null;
  };

  const previousIndex = findReadyIndex(-1);
  const nextIndex = findReadyIndex(1);
  const renderOptions = () =>
    scenarios.map((scenario) => (
      <DistributionStrategyOption
        applied={isApplied(scenario.id)}
        compact={compact}
        compactWidth={compact ? compactCardWidth : undefined}
        key={scenario.id}
        onResolve={() => onResolve(scenario)}
        onSelect={() => onSelect(scenario)}
        resolveLabel={resolveLabel(scenario)}
        scenario={scenario}
        selected={scenario.status === "ready" && selectedId === scenario.id}
      />
    ));

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextVisibleIndex = Math.max(
      0,
      Math.min(
        scenarios.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / snapInterval)
      )
    );
    const scenario = scenarios[nextVisibleIndex];
    if (scenario?.status === "ready" && scenario.id !== selectedId) {
      onSelect(scenario);
    }
  };

  const handleCarouselLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== carouselWidth) {
      setCarouselWidth(nextWidth);
    }
  };

  return (
    <View style={styles.navigator}>
      {compact ? (
        <View style={styles.navigatorHeader}>
          <Text style={styles.navigatorCounter}>
            Estrategia {selectedIndex + 1} de {scenarios.length}
          </Text>
          <View style={styles.navigatorActions}>
            <Pressable
              accessibilityLabel="Ver estrategia anterior"
              accessibilityRole="button"
              accessibilityState={{ disabled: previousIndex === null }}
              disabled={previousIndex === null}
              onPress={() => previousIndex !== null && selectAtIndex(previousIndex)}
              style={({ pressed }) => [
                styles.navigatorButton,
                previousIndex === null && styles.navigatorButtonDisabled,
                pressed && previousIndex !== null && styles.pressed
              ]}
            >
              <ChevronLeft color={colors.primary} size={20} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              accessibilityLabel="Ver estrategia siguiente"
              accessibilityRole="button"
              accessibilityState={{ disabled: nextIndex === null }}
              disabled={nextIndex === null}
              onPress={() => nextIndex !== null && selectAtIndex(nextIndex)}
              style={({ pressed }) => [
                styles.navigatorButton,
                nextIndex === null && styles.navigatorButtonDisabled,
                pressed && nextIndex !== null && styles.pressed
              ]}
            >
              <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {compact ? (
        <View onLayout={handleCarouselLayout} style={styles.navigatorViewport}>
          <ScrollView
            contentContainerStyle={[
              styles.navigatorTrackCompact,
              { paddingHorizontal: carouselInset }
            ]}
            decelerationRate="fast"
            horizontal
            onMomentumScrollEnd={handleMomentumScrollEnd}
            ref={scrollRef}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={snapInterval}
          >
            {renderOptions()}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.navigatorTrack}>{renderOptions()}</View>
      )}
    </View>
  );
}

function DistributionOverview({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const segments = [
    { color: colors.primary, label: "Extra a deudas", value: scenario.extraDebtPayment },
    { color: financialTimelineChartColors.goal, label: "A metas", value: scenario.goalContribution },
    { color: colors.textSubtle, label: "Sin repartir", value: scenario.unassignedAmount }
  ].filter((segment) => segment.value > 0);
  const distributionTotal = segments.reduce((total, segment) => total + segment.value, 0);
  const isSplitStrategy = scenario.id === "split_debt_goal";
  const primaryAllocation =
    scenario.id === "reduce_interest"
      ? {
          color: colors.primary,
          kind: "debt" as const,
          label: "Extra a deudas",
          value: scenario.extraDebtPayment
        }
      : scenario.id === "accelerate_goal"
        ? {
            color: financialTimelineChartColors.goal,
            kind: "goal" as const,
            label: "A metas",
            value: scenario.goalContribution
          }
        : scenario.id === "current_reference"
          ? {
              color: colors.textSubtle,
              kind: "neutral" as const,
              label: "Permanece sin repartir",
              value: scenario.unassignedAmount
            }
          : null;

  return (
    <View style={styles.distributionOverview}>
      <Text style={styles.distributionDetailTitle}>Distribución del primer mes</Text>
      {isSplitStrategy ? (
        <>
          {distributionTotal > 0 ? (
            <View style={styles.distributionTrack}>
              {segments.map((segment) => (
                <View
                  key={segment.label}
                  style={[
                    styles.distributionSegment,
                    {
                      backgroundColor: segment.color,
                      flexGrow: segment.value,
                      flexBasis: 0
                    }
                  ]}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.distributionLegend}>
            {segments.map((segment) => (
              <View key={segment.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                <View>
                  <Text style={styles.legendLabel}>{segment.label}</Text>
                  <Text style={styles.legendValue}>{formatCOP(segment.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : primaryAllocation ? (
        <View
          style={[
            styles.primaryAllocation,
            primaryAllocation.kind === "debt"
              ? styles.primaryAllocationDebt
              : primaryAllocation.kind === "goal"
                ? styles.primaryAllocationGoal
                : styles.primaryAllocationNeutral
          ]}
        >
          <View style={styles.primaryAllocationLabelRow}>
            <View
              style={[styles.legendDot, { backgroundColor: primaryAllocation.color }]}
            />
            <Text
              style={[
                styles.primaryAllocationLabel,
                primaryAllocation.kind === "debt"
                  ? styles.primaryAllocationLabelDebt
                  : primaryAllocation.kind === "goal"
                    ? styles.primaryAllocationLabelGoal
                    : styles.primaryAllocationLabelNeutral
              ]}
            >
              {primaryAllocation.label}
            </Text>
          </View>
          <Text style={styles.primaryAllocationValue}>
            {formatCOP(primaryAllocation.value)}
          </Text>
          {primaryAllocation.kind === "neutral" ? (
            <Text style={styles.primaryAllocationHelper}>
              Este dinero permanece disponible y no se destina a deudas ni metas.
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.supportingAmounts}>
        <AllocationValue label="Cuotas requeridas" value={formatCOP(scenario.baseDebtPayments)} />
        <AllocationValue
          label="Dinero libre que conservas"
          value={
            scenario.monthlyBalance === null
              ? "No disponible"
              : formatSignedCOP(scenario.monthlyBalance - scenario.unassignedAmount)
          }
        />
      </View>
    </View>
  );
}

export function DistributionStrategyDetail({
  applied,
  onApply,
  onProjectionToggle,
  onSplitDebtPercentChange,
  projectionExpanded,
  scenario
}: {
  applied: boolean;
  onApply?: () => void;
  onProjectionToggle: () => void;
  onSplitDebtPercentChange?: (value: number) => void;
  projectionExpanded: boolean;
  scenario: DistributionScenarioPresentation;
}) {
  if (scenario.status !== "ready") {
    return null;
  }
  const outcomes = getOutcomeLabels(scenario);

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderCopy}>
          <Text style={styles.detailEyebrow}>DETALLE DE LA ESTRATEGIA</Text>
          <Text style={styles.detailTitle}>{scenario.label}</Text>
          <Text style={styles.description}>{scenario.description}</Text>
        </View>
        <View style={applied ? styles.appliedBadge : styles.previewBadge}>
          {!applied ? (
            <View style={styles.previewDot} />
          ) : null}
          <Text style={applied ? styles.appliedBadgeText : styles.previewBadgeText}>
            {applied ? "Estrategia actual" : "Vista previa"}
          </Text>
        </View>
      </View>

      <View style={styles.detailOutcome}>
        <Text style={styles.optionImpact}>{getHeadline(scenario)}</Text>
        {outcomes.length > 0 ? (
          <View style={styles.outcomeList}>
            {outcomes.map((outcome) => (
              <View
                key={outcome.kind}
                style={[
                  styles.outcomeChip,
                  outcome.kind === "goal" ? styles.outcomeChipGoal : styles.outcomeChipDebt
                ]}
              >
                <Text
                  style={[
                    styles.outcomeChipText,
                    outcome.kind === "goal"
                      ? styles.outcomeChipTextGoal
                      : styles.outcomeChipTextDebt
                  ]}
                >
                  {outcome.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {scenario.id === "split_debt_goal" &&
      scenario.debtSharePercent !== null &&
      onSplitDebtPercentChange ? (
        <DebtGoalAllocationSlider
          debtPercent={scenario.debtSharePercent}
          onChange={onSplitDebtPercentChange}
        />
      ) : null}

      <DistributionOverview scenario={scenario} />

      <Pressable
        accessibilityRole="button"
        onPress={onProjectionToggle}
        style={({ pressed }) => [styles.projectionToggle, pressed && styles.pressed]}
      >
        <View>
          <Text style={styles.projectionToggleTitle}>
            {projectionExpanded ? "Ocultar proyección completa" : "Ver proyección completa"}
          </Text>
          <Text style={styles.projectionToggleHelper}>
            Gráfica, fechas estimadas e hitos de pago
          </Text>
        </View>
        {projectionExpanded ? (
          <ChevronUp color={colors.primary} size={20} strokeWidth={2.5} />
        ) : (
          <ChevronDown color={colors.primary} size={20} strokeWidth={2.5} />
        )}
      </Pressable>

      {projectionExpanded ? <TimelinePreview scenario={scenario} /> : null}

      {scenario.issueMessages.length > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Resultado con información limitada</Text>
          {scenario.issueMessages.map((message) => (
            <Text key={message} style={styles.warningText}>
              • {message}
            </Text>
          ))}
        </View>
      ) : null}

      {applied ? (
        <View style={styles.appliedConfirmation}>
          <Check color={colors.support} size={18} strokeWidth={3} />
          <Text style={styles.appliedConfirmationText}>Esta es tu estrategia actual</Text>
        </View>
      ) : (
        <PrimaryButton
          accessibilityLabel={`Aplicar la estrategia ${scenario.label}`}
          icon={null}
          onPress={onApply ?? (() => undefined)}
          title="Aplicar esta estrategia"
        />
      )}
      <Text style={styles.applyHelper}>
        Aplicarla actualiza tu plan mensual; no registra pagos ni separa dinero.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    flexBasis: 0,
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 150
  },
  optionCardCompact: {
    flexBasis: "auto",
    flexGrow: 0,
    minWidth: 0
  },
  optionTitle: {
    fontWeight: typography.weight.bold
  },
  optionImpact: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption,
    textAlign: "left"
  },
  outcomeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  outcomeChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  outcomeChipDebt: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder
  },
  outcomeChipGoal: {
    backgroundColor: colors.goalSoft,
    borderColor: colors.goalBorder
  },
  outcomeChipText: {
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  outcomeChipTextDebt: {
    color: colors.primaryDark
  },
  outcomeChipTextGoal: {
    color: colors.goalDark
  },
  optionMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  appliedBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  appliedBadgeText: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  previewBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  previewBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  previewDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 8,
    width: 8
  },
  resolveLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  resolveLinkText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  navigator: {
    gap: spacing.sm
  },
  navigatorHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  navigatorCounter: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  navigatorActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  navigatorButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  navigatorButtonDisabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabledBorder,
    opacity: 0.55
  },
  navigatorTrack: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  navigatorTrackCompact: {
    alignItems: "stretch",
    gap: spacing.sm
  },
  navigatorViewport: {
    marginHorizontal: -spacing.md,
    overflow: "hidden"
  },
  detailPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.lg,
    paddingTop: spacing.lg
  },
  detailOutcome: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  detailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  detailHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220
  },
  detailEyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
    lineHeight: typography.lineHeight.small
  },
  detailTitle: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.brand
  },
  distributionOverview: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  distributionTrack: {
    borderRadius: radius.pill,
    flexDirection: "row",
    height: 12,
    overflow: "hidden"
  },
  distributionSegment: {
    height: "100%",
    minWidth: 2
  },
  primaryAllocation: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  primaryAllocationDebt: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder
  },
  primaryAllocationGoal: {
    backgroundColor: colors.goalSoft,
    borderColor: colors.goalBorder
  },
  primaryAllocationNeutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  primaryAllocationLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  primaryAllocationLabel: {
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  primaryAllocationLabelDebt: {
    color: colors.primaryDark
  },
  primaryAllocationLabelGoal: {
    color: colors.goalDark
  },
  primaryAllocationLabelNeutral: {
    color: colors.textMuted
  },
  primaryAllocationValue: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
  },
  primaryAllocationHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  distributionLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg
  },
  legendItem: {
    alignItems: "flex-start",
    flexBasis: 150,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.xs
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 9,
    marginTop: spacing.xs,
    width: 9
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  legendValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  supportingAmounts: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  projectionToggle: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  projectionToggleTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  projectionToggleHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  appliedConfirmation: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.lg
  },
  appliedConfirmationText: {
    color: colors.support,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  applyHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  inactiveGoalsNotice: {
    backgroundColor: colors.goalSoft,
    borderColor: colors.goalBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.sm
  },
  inactiveGoalsNoticeText: {
    color: financialTimelineChartColors.goal,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  cardUnavailable: {
    backgroundColor: colors.background
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeUnavailable: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.badge
  },
  badgeTextUnavailable: {
    color: colors.warning
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  headlineUnavailable: {
    color: colors.warning
  },
  distributionDetailTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.option
  },
  allocationValue: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 135,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  allocationLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  allocationAmount: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  timeline: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  timelineHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  timelineHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220
  },
  timelineEyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
    lineHeight: typography.lineHeight.small
  },
  timelineTitle: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
  },
  timelineDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  timelineBadges: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  timelineBadge: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  timelineBadgeText: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  timelineGoalBadge: {
    backgroundColor: colors.goalSoft,
    borderColor: colors.goalBorder
  },
  timelineGoalBadgeText: {
    color: financialTimelineChartColors.goal
  },
  projectionMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  projectionMetric: {
    borderLeftColor: colors.primary,
    borderLeftWidth: 3,
    flexBasis: 145,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 130,
    paddingLeft: spacing.sm
  },
  projectionMetricLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  projectionMetricValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  timelineMilestones: {
    gap: spacing.sm
  },
  timelineMilestonesTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  timelineMilestoneList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  timelineMilestone: {
    alignItems: "flex-start",
    flexBasis: 190,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.xs
  },
  timelineMilestoneDot: {
    backgroundColor: financialTimelineChartColors.payoff,
    borderRadius: radius.pill,
    height: 8,
    marginTop: spacing.xs,
    width: 8
  },
  timelineMilestoneCopy: {
    flex: 1,
    gap: spacing.xs
  },
  timelineMilestoneMonth: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  timelineMilestoneText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  warningTitle: {
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  warningText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  pressed: {
    opacity: 0.82
  }
});
