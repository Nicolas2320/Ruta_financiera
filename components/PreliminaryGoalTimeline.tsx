import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { ProjectionGoalInput } from "../utils/financialProjectionInput";
import { formatCOP } from "../utils/financialRanges";
import { buildGoalsOnlyTimeline } from "../utils/financialTimeline";
import { formatTargetMonth } from "../utils/monthYear";
import { FinancialTimelineChart } from "./FinancialTimelineChart";

function ProjectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function PreliminaryGoalTimeline({
  asOfDate,
  goals,
  hasReportedDebt,
  monthlyBudget
}: {
  asOfDate: string;
  goals: ProjectionGoalInput[];
  hasReportedDebt: boolean;
  monthlyBudget: number;
}) {
  const timeline = buildGoalsOnlyTimeline({
    asOfDate,
    goals,
    monthlyBudget
  });
  const [selectedGoalId, setSelectedGoalId] = useState(
    timeline?.trackedGoal?.goalId ?? timeline?.trackedGoals[0]?.goalId ?? ""
  );

  if (!timeline) {
    return null;
  }

  const firstMonth = timeline.months[0];
  const selectedGoal =
    timeline.trackedGoals.find((goal) => goal.goalId === selectedGoalId) ??
    timeline.trackedGoal ??
    timeline.trackedGoals[0] ??
    null;
  const selectedFirstContribution = selectedGoal
    ? firstMonth?.goalContributions.find(
        (contribution) => contribution.goalId === selectedGoal.goalId
      )?.amount ?? 0
    : 0;
  const selectedCompletionMonth = selectedGoal
    ? timeline.goalCompletionMonths[selectedGoal.goalId] ?? null
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROYECCIÓN DE TUS METAS</Text>
        <Text style={styles.title}>Fechas estimadas con el reparto mensual</Text>
        <Text style={styles.description}>
          El aporte se pondera por el dinero pendiente, el tiempo disponible y la prioridad de la
          meta principal. Cuando completas una, el plan se recalcula desde el mes siguiente.
        </Text>
      </View>

      {selectedGoal ? (
        <View style={styles.metrics}>
          <ProjectionMetric
            label={`${selectedGoal.title} · ${formatCOP(selectedFirstContribution)} al mes`}
            value={
              selectedCompletionMonth
                ? formatTargetMonth(selectedCompletionMonth)
                : "Más de 10 años"
            }
          />
        </View>
      ) : null}

      <FinancialTimelineChart
        focus="goal"
        onSelectedGoalChange={setSelectedGoalId}
        selectedGoalId={selectedGoalId}
        timeline={timeline}
      />

      {hasReportedDebt ? (
        <Text style={styles.note}>
          La cuota estimada ya reduce el aporte disponible. Estas líneas proyectan tus metas; para
          calcular fechas de deuda necesitamos saldo, tasa y cuota de cada una.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  header: {
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.6,
    lineHeight: typography.lineHeight.small
  },
  title: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  note: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  }
});
