import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { DistributionStrategyId } from "../utils/financialDistribution";
import {
  buildDistributionComparison,
  type DistributionComparisonCriterion,
  type DistributionComparisonRow
} from "../utils/financialDistributionComparison";
import type { DistributionScenarioPresentation } from "../utils/financialDistributionPresentation";
import { formatCOP } from "../utils/financialRanges";
import { formatTargetMonth, getMonthYearValue } from "../utils/monthYear";

const strategyNotes: Record<DistributionStrategyId, string> = {
  current_reference: "Mantiene las cuotas de deuda y no asigna dinero mensual a metas.",
  reduce_interest: "Usa el dinero disponible para adelantar el pago de tus deudas.",
  accelerate_goal: "Usa el dinero disponible para avanzar tus metas.",
  split_debt_goal: "Divide el dinero disponible entre deudas y metas."
};

const bestLabels: Record<DistributionComparisonCriterion, string> = {
  debt: "Deudas antes",
  goal: "Meta más rápida",
  interest: "Menos intereses"
};

function hasGoalContributions(scenario: DistributionScenarioPresentation) {
  return scenario.timeline.months.some((month) => month.goalContributionTotal > 0);
}

function getGoalResult(scenario: DistributionScenarioPresentation) {
  if (scenario.status !== "ready" || scenario.timeline.months.length === 0) {
    return "No disponible";
  }
  if (scenario.timeline.goalCompletionMonth) {
    return formatTargetMonth(scenario.timeline.goalCompletionMonth);
  }
  if (!scenario.timeline.trackedGoal) {
    return "Sin meta";
  }
  return hasGoalContributions(scenario) ? "Más de 10 años" : "Dinero no repartido";
}

function getDebtResult(scenario: DistributionScenarioPresentation) {
  if (scenario.status !== "ready" || scenario.timeline.months.length === 0) {
    return "No disponible";
  }
  if (scenario.timeline.months[0]?.debtPayments.length === 0) {
    return "Sin deudas";
  }
  if (!scenario.timeline.allDebtBalancesKnown) {
    return "Faltan saldos";
  }
  return scenario.timeline.allKnownDebtsPaidMonth
    ? formatTargetMonth(scenario.timeline.allKnownDebtsPaidMonth)
    : "Más de 10 años";
}

function getEarliestMonth(values: Array<string | null>) {
  const available = values.filter((value): value is string => Boolean(value));
  return available.length > 0 ? [...available].sort()[0] : null;
}

function getMonthDifference(value: string | null, earliest: string | null) {
  const valueMonth = getMonthYearValue(value);
  const earliestMonth = getMonthYearValue(earliest);
  if (!valueMonth || !earliestMonth) return null;
  return (
    (valueMonth.year - earliestMonth.year) * 12 +
    valueMonth.month -
    earliestMonth.month
  );
}

function getDifferenceLabel(value: string | null, earliest: string | null) {
  const difference = getMonthDifference(value, earliest);
  if (difference === null || difference <= 0) return null;
  return difference === 1
    ? "1 mes después de la más rápida"
    : `${difference} meses después de la más rápida`;
}

function HighlightCard({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.highlightCard}>
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightValue}>{value}</Text>
      <Text style={styles.highlightDetail}>{detail}</Text>
    </View>
  );
}

function ComparisonMetric({
  bestCriterion,
  bestCriteria,
  detail,
  label,
  value
}: {
  bestCriterion: "debt" | "goal";
  bestCriteria: DistributionComparisonCriterion[];
  detail?: string | null;
  label: string;
  value: string;
}) {
  const isBest = bestCriteria.includes(bestCriterion);
  const bestLabel = bestLabels[bestCriterion];
  return (
    <View
      accessibilityLabel={`${label}: ${value}${isBest ? `. ${bestLabel}` : ""}`}
      style={[styles.metric, isBest && styles.metricBest]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
      {isBest ? <Text style={styles.bestLabel}>✓ {bestLabel}</Text> : null}
    </View>
  );
}

function ComparisonRow({
  compact,
  comparison,
  earliestDebtMonth,
  earliestGoalMonth,
  scenario,
  selected
}: {
  compact: boolean;
  comparison: DistributionComparisonRow;
  earliestDebtMonth: string | null;
  earliestGoalMonth: string | null;
  scenario: DistributionScenarioPresentation;
  selected: boolean;
}) {
  const unavailable = scenario.status !== "ready";
  const interestUnavailable = comparison.hasUnknownInterestRates;

  return (
    <View
      accessibilityLabel={`${scenario.label}. ${strategyNotes[scenario.id]}${selected ? ". Estrategia seleccionada" : ""}`}
      style={[styles.row, compact && styles.rowCompact, selected && styles.rowSelected]}
    >
      <View style={[styles.strategy, compact && styles.strategyCompact]}>
        <Text style={styles.strategyTitle}>{scenario.label}</Text>
        <View style={styles.strategyBadges}>
          <View style={[styles.strategyBadge, unavailable && styles.strategyBadgeUnavailable]}>
            <Text
              style={[
                styles.strategyBadgeText,
                unavailable && styles.strategyBadgeTextUnavailable
              ]}
            >
              {unavailable ? "Faltan datos" : scenario.badge}
            </Text>
          </View>
          {selected ? (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>Seleccionada</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.strategyNote}>{strategyNotes[scenario.id]}</Text>
      </View>

      <View style={styles.results}>
        <View style={styles.primaryMetrics}>
          <ComparisonMetric
            bestCriteria={comparison.bestCriteria}
            bestCriterion="goal"
            detail={getDifferenceLabel(comparison.goalCompletionMonth, earliestGoalMonth)}
            label="Meta completada"
            value={getGoalResult(scenario)}
          />
          <ComparisonMetric
            bestCriteria={comparison.bestCriteria}
            bestCriterion="debt"
            detail={getDifferenceLabel(comparison.debtFreeMonth, earliestDebtMonth)}
            label="Libre de deudas"
            value={getDebtResult(scenario)}
          />
        </View>

        <View style={styles.secondaryMetrics}>
          <View style={styles.secondaryMetric}>
            <Text style={styles.secondaryLabel}>Pago mensual máximo a deudas</Text>
            <Text style={styles.secondaryValue}>
              {comparison.peakMonthlyDebtPayment === null
                ? "No disponible"
                : formatCOP(comparison.peakMonthlyDebtPayment)}
            </Text>
          </View>
          <View style={styles.secondaryMetric}>
            <Text style={styles.secondaryLabel}>Intereses estimados</Text>
            <Text style={styles.secondaryValue}>
              {interestUnavailable || comparison.totalInterestCharged === null
                ? "No calculable"
                : formatCOP(comparison.totalInterestCharged)}
            </Text>
            {interestUnavailable ? (
              <Text style={styles.secondaryWarning}>Agrega las tasas para comparar.</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export function DistributionComparisonSummary({
  compact,
  scenarios,
  selectedStrategyId
}: {
  compact: boolean;
  scenarios: DistributionScenarioPresentation[];
  selectedStrategyId: DistributionStrategyId;
}) {
  const comparison = buildDistributionComparison(scenarios);
  const comparisonById = new Map(comparison.map((row) => [row.id, row]));
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const earliestGoalMonth = getEarliestMonth(comparison.map((row) => row.goalCompletionMonth));
  const earliestDebtMonth = getEarliestMonth(comparison.map((row) => row.debtFreeMonth));
  const goalWinner = comparison.find((row) => row.bestCriteria.includes("goal"));
  const debtWinner = comparison.find((row) => row.bestCriteria.includes("debt"));
  const splitComparison = comparisonById.get("split_debt_goal");
  const splitScenario = scenarioById.get("split_debt_goal");

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Cada estrategia prioriza algo distinto. Compara el tiempo y el esfuerzo mensual.
      </Text>

      <View style={[styles.highlights, compact && styles.highlightsCompact]}>
        {goalWinner ? (
          <HighlightCard
            detail={formatTargetMonth(goalWinner.goalCompletionMonth)}
            label="Meta más rápida"
            value={scenarioById.get(goalWinner.id)?.label ?? goalWinner.label}
          />
        ) : null}
        {debtWinner ? (
          <HighlightCard
            detail={formatTargetMonth(debtWinner.debtFreeMonth)}
            label="Deudas antes"
            value={scenarioById.get(debtWinner.id)?.label ?? debtWinner.label}
          />
        ) : null}
        {splitComparison && splitScenario?.status === "ready" ? (
          <HighlightCard
            detail={`Meta: ${formatTargetMonth(splitComparison.goalCompletionMonth)} · Deudas: ${formatTargetMonth(splitComparison.debtFreeMonth)}`}
            label="Punto medio"
            value={splitScenario.badge}
          />
        ) : null}
      </View>

      <View style={styles.rows}>
        {scenarios.map((scenario) => {
          const row = comparisonById.get(scenario.id);
          return row ? (
            <ComparisonRow
              compact={compact}
              comparison={row}
              earliestDebtMonth={earliestDebtMonth}
              earliestGoalMonth={earliestGoalMonth}
              key={scenario.id}
              scenario={scenario}
              selected={scenario.id === selectedStrategyId}
            />
          ) : null;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  intro: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  highlightsCompact: { flexDirection: "column" },
  highlightCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 180,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  highlightLabel: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  highlightValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  highlightDetail: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  rows: { gap: spacing.sm },
  row: {
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  rowSelected: {
    backgroundColor: colors.selectedSoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  rowCompact: {
    flexDirection: "column",
    gap: spacing.sm
  },
  strategy: {
    flexBasis: 205,
    flexGrow: 0,
    gap: spacing.xs
  },
  strategyCompact: { flexBasis: "auto" },
  strategyTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  strategyBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  strategyBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  strategyBadgeUnavailable: { backgroundColor: colors.warningSoft },
  strategyBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  strategyBadgeTextUnavailable: { color: colors.warning },
  selectedBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  selectedBadgeText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  strategyNote: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  results: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  primaryMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metric: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 130,
    padding: spacing.sm
  },
  metricBest: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  metricDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  bestLabel: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  secondaryMetrics: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm
  },
  secondaryMetric: {
    flexBasis: 160,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 140
  },
  secondaryLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  secondaryValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  secondaryWarning: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  }
});
