import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { ProjectionGoalInput } from "../utils/financialProjectionInput";
import { formatCOP } from "../utils/financialRanges";
import { buildGoalOnlyTimeline } from "../utils/financialTimeline";
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
  goal,
  hasReportedDebt,
  isEmergencyReference,
  monthlyContribution
}: {
  asOfDate: string;
  goal: ProjectionGoalInput;
  hasReportedDebt: boolean;
  isEmergencyReference: boolean;
  monthlyContribution: number;
}) {
  const timeline = buildGoalOnlyTimeline({
    asOfDate,
    goal,
    monthlyContribution
  });

  if (!timeline || goal.targetAmount === null) {
    return null;
  }

  const targetLabel =
    goal.targetAmountSource === "range" && goal.amountRange
      ? goal.amountRange
      : formatCOP(goal.targetAmount);
  const title = timeline.goalCompletionMonth
    ? `${isEmergencyReference ? "Alcanzarías esta base" : "Completarías esta meta"} en ${formatTargetMonth(
        timeline.goalCompletionMonth
      )}`
    : "La proyección supera los próximos 10 años";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {isEmergencyReference ? "PROYECCIÓN DEL FONDO" : "PROYECCIÓN DE META"}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          {isEmergencyReference
            ? "La línea parte de tus ahorros disponibles y usa como objetivo una base equivalente a tres meses de gastos."
            : `La línea muestra cómo avanzaría ${goal.title} con el aporte del escenario seleccionado.`}
        </Text>
      </View>

      <View style={styles.metrics}>
        <ProjectionMetric
          label={isEmergencyReference ? "Ahorro disponible reportado" : "Reunido al comenzar"}
          value={formatCOP(goal.currentAmount)}
        />
        <ProjectionMetric label="Aporte mensual" value={formatCOP(monthlyContribution)} />
        <ProjectionMetric
          label={isEmergencyReference ? "Base sugerida" : "Valor de la meta"}
          value={targetLabel}
        />
      </View>

      <FinancialTimelineChart focus="goal" timeline={timeline} />

      {goal.targetAmountSource === "range" && goal.amountRange ? (
        <Text style={styles.note}>
          Elegiste {goal.amountRange}. Para trazar esta referencia usamos {formatCOP(
            goal.targetAmount
          )}, el punto medio del rango.
        </Text>
      ) : null}
      {hasReportedDebt ? (
        <Text style={styles.note}>
          La cuota estimada ya reduce el aporte disponible. Esta gráfica proyecta la meta, no una
          fecha de pago de deuda; para calcular esa fecha necesitamos saldo, tasa y cuota de cada
          deuda.
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
