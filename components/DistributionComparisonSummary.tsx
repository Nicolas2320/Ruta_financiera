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
import { formatTargetMonth } from "../utils/monthYear";

const strategyNotes: Record<DistributionStrategyId, string> = {
  current_reference: "Mantiene lo registrado; el dinero libre puede quedar sin un destino nuevo.",
  reduce_interest: "Ataca primero la deuda costosa; la meta espera mientras tanto.",
  accelerate_goal: "Concentra el margen en la meta; la deuda conserva sus cuotas requeridas.",
  split_debt_goal: "Avanza en ambos frentes; al completar la meta, reasigna lo libre a deuda."
};

const bestLabels: Record<DistributionComparisonCriterion, string> = {
  debt: "Sin deudas antes",
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

  return hasGoalContributions(scenario) ? "Más de 10 años" : "Sin aportes";
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

function ComparisonMetric({
  bestCriterion,
  bestCriteria,
  label,
  value
}: {
  bestCriterion?: DistributionComparisonCriterion;
  bestCriteria: DistributionComparisonCriterion[];
  label: string;
  value: string;
}) {
  const isBest = bestCriterion ? bestCriteria.includes(bestCriterion) : false;
  const bestLabel = bestCriterion ? bestLabels[bestCriterion] : null;

  return (
    <View
      accessibilityLabel={`${label}: ${value}${isBest && bestLabel ? `. ${bestLabel}` : ""}`}
      style={[styles.metric, isBest && styles.metricBest]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {isBest && bestLabel ? <Text style={styles.bestLabel}>{bestLabel}</Text> : null}
    </View>
  );
}

function ComparisonRow({
  compact,
  comparison,
  scenario
}: {
  compact: boolean;
  comparison: DistributionComparisonRow;
  scenario: DistributionScenarioPresentation;
}) {
  const unavailable = scenario.status !== "ready";

  return (
    <View
      accessibilityLabel={`${scenario.label}. ${strategyNotes[scenario.id]}`}
      style={[styles.row, compact && styles.rowCompact]}
    >
      <View style={[styles.strategy, compact && styles.strategyCompact]}>
        <View style={styles.strategyHeading}>
          <Text style={styles.strategyTitle}>{scenario.label}</Text>
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
        </View>
        <Text style={styles.strategyNote}>{strategyNotes[scenario.id]}</Text>
      </View>

      <View style={styles.metrics}>
        <ComparisonMetric
          bestCriteria={comparison.bestCriteria}
          bestCriterion="goal"
          label="Completa la meta"
          value={getGoalResult(scenario)}
        />
        <ComparisonMetric
          bestCriteria={comparison.bestCriteria}
          bestCriterion="debt"
          label="Termina las deudas"
          value={getDebtResult(scenario)}
        />
        <ComparisonMetric
          bestCriteria={comparison.bestCriteria}
          bestCriterion="interest"
          label="Intereses estimados"
          value={
            comparison.totalInterestCharged === null
              ? "No disponible"
              : `${formatCOP(comparison.totalInterestCharged)}${
                  comparison.hasUnknownInterestRates ? "*" : ""
                }`
          }
        />
        <ComparisonMetric
          bestCriteria={comparison.bestCriteria}
          label="Máximo hacia deudas"
          value={
            comparison.peakMonthlyDebtPayment === null
              ? "No disponible"
              : formatCOP(comparison.peakMonthlyDebtPayment)
          }
        />
      </View>
    </View>
  );
}

export function DistributionComparisonSummary({
  compact,
  scenarios
}: {
  compact: boolean;
  scenarios: DistributionScenarioPresentation[];
}) {
  const comparison = buildDistributionComparison(scenarios);
  const comparisonById = new Map(comparison.map((row) => [row.id, row]));
  const hasUnknownInterestRates = comparison.some((row) => row.hasUnknownInterestRates);

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        No hay una estrategia mejor en todo. Las etiquetas verdes muestran qué alternativa
        obtiene el mejor resultado en cada criterio.
      </Text>

      <View style={styles.rows}>
        {scenarios.map((scenario) => {
          const row = comparisonById.get(scenario.id);

          return row ? (
            <ComparisonRow
              compact={compact}
              comparison={row}
              key={scenario.id}
              scenario={scenario}
            />
          ) : null;
        })}
      </View>

      <View style={styles.explanation}>
        <Text style={styles.explanationText}>
          “Máximo hacia deudas” incluye cuotas requeridas, pagos liberados y dinero
          reasignado después de completar la meta; no es una nueva cuota obligatoria.
        </Text>
        {hasUnknownInterestRates ? (
          <Text style={styles.explanationWarning}>
            * Hay tasas sin definir; la comparación de intereses es parcial.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  intro: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  rows: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1
  },
  row: {
    alignItems: "stretch",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  rowCompact: {
    flexDirection: "column",
    gap: spacing.sm
  },
  strategy: {
    flexBasis: 190,
    flexGrow: 0,
    gap: spacing.xs
  },
  strategyCompact: {
    flexBasis: "auto"
  },
  strategyHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  strategyTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  strategyBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3
  },
  strategyBadgeUnavailable: {
    backgroundColor: colors.warningSoft
  },
  strategyBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  strategyBadgeTextUnavailable: {
    color: "#B45309"
  },
  strategyNote: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  metrics: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    minWidth: 0
  },
  metric: {
    borderLeftColor: colors.border,
    borderLeftWidth: 2,
    flexBasis: 105,
    flexGrow: 1,
    gap: 2,
    minWidth: 96,
    paddingLeft: spacing.sm
  },
  metricBest: {
    borderLeftColor: colors.support
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  bestLabel: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  explanation: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.sm
  },
  explanationText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  explanationWarning: {
    color: "#B45309",
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  }
});
