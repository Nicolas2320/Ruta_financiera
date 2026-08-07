import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { DistributionScenarioPresentation } from "../utils/financialDistributionPresentation";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import { DebtGoalAllocationSlider } from "./DebtGoalAllocationSlider";
import {
  FinancialTimelineChart,
  financialTimelineChartColors,
  type FinancialTimelineFocus
} from "./FinancialTimelineChart";

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

function GoalProgressSummary({
  scenario
}: {
  scenario: DistributionScenarioPresentation;
}) {
  const goals = scenario.timeline.trackedGoals.filter(
    (goal) => goal.targetAmount !== null
  );

  if (goals.length === 0) {
    return null;
  }
  const explanation =
    scenario.id === "reduce_interest"
      ? "Esta estrategia dirige el dinero disponible a las deudas; por eso no se reparte entre las metas."
      : "El dinero disponible no se reparte entre estas metas en este escenario.";

  return (
    <View style={styles.goalSummary}>
      {goals.map((goal) => {
        const targetAmount = goal.targetAmount ?? 0;
        const progress = Math.min(
          100,
          Math.max(0, (goal.currentAmount / Math.max(1, targetAmount)) * 100)
        );
        const hasContribution = scenario.timeline.months.some((month) =>
          month.goalContributions.some((contribution) => contribution.goalId === goal.goalId)
        );

        return (
          <View key={goal.goalId} style={styles.goalSummaryItem}>
            <View style={styles.goalSummaryCopy}>
              <Text style={styles.goalSummaryTitle}>{goal.title}</Text>
              <Text style={styles.goalSummaryStatus}>
                {hasContribution ? "Meta en movimiento" : "Dinero no repartido a esta meta"}
              </Text>
            </View>
            <View style={styles.goalSummaryProgress}>
              <View style={styles.goalSummaryValues}>
                <Text style={styles.goalSummaryValue}>{formatCOP(goal.currentAmount)} reunidos</Text>
                <Text style={styles.goalSummaryValue}>de {formatCOP(targetAmount)}</Text>
              </View>
              <View style={styles.goalProgressTrack}>
                <View style={[styles.goalProgressFill, { width: `${progress}%` }]} />
              </View>
              {!hasContribution ? <Text style={styles.goalSummaryExplanation}>{explanation}</Text> : null}
            </View>
          </View>
        );
      })}
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
            value: formatCOP(timeline.totalInterestCharged)
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

      {focus === "debt" ? <GoalProgressSummary scenario={scenario} /> : null}

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

export function DistributionScenarioCard({
  expanded,
  onResolve,
  onSave,
  onSelect,
  onSplitDebtPercentChange,
  onToggle,
  resolveLabel = "Completar información",
  scenario,
  saved = false,
  selected = false
}: {
  expanded: boolean;
  onResolve?: () => void;
  onSave?: () => void;
  onSelect?: () => void;
  onSplitDebtPercentChange?: (value: number) => void;
  onToggle: () => void;
  resolveLabel?: string;
  scenario: DistributionScenarioPresentation;
  saved?: boolean;
  selected?: boolean;
}) {
  const unavailable = scenario.status !== "ready";

  return (
    <View
      style={[
        styles.card,
        selected && styles.cardSelected,
        unavailable && styles.cardUnavailable
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{scenario.label}</Text>
            <View style={[styles.badge, unavailable && styles.badgeUnavailable]}>
              <Text style={[styles.badgeText, unavailable && styles.badgeTextUnavailable]}>
                {getStatusLabel(scenario)}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{scenario.description}</Text>
        </View>
      </View>

      {scenario.id === "split_debt_goal" &&
      scenario.status === "ready" &&
      scenario.debtSharePercent !== null &&
      onSplitDebtPercentChange ? (
        <DebtGoalAllocationSlider
          debtPercent={scenario.debtSharePercent}
          onChange={onSplitDebtPercentChange}
        />
      ) : null}

      <View style={[styles.headlineBox, unavailable && styles.headlineBoxUnavailable]}>
        <Text style={[styles.headline, unavailable && styles.headlineUnavailable]}>
          {getHeadline(scenario)}
        </Text>
      </View>

      {!unavailable && onSelect ? (
        <View style={styles.selectionActions}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={onSelect}
            style={({ pressed }) => [
              styles.selectButton,
              selected && styles.selectButtonSelected,
              pressed && styles.pressed
            ]}
          >
            <View
              style={[
                styles.selectIndicator,
                selected && styles.selectIndicatorSelected
              ]}
            >
              {selected ? (
                <Check color={colors.surface} size={14} strokeWidth={3} />
              ) : null}
            </View>
            <Text
              style={[
                styles.selectButtonText,
                selected && styles.selectButtonTextSelected
              ]}
            >
              {selected ? "Seleccionada" : "Seleccionar"}
            </Text>
          </Pressable>
          {selected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saved }}
              disabled={saved}
              onPress={onSave}
              style={({ pressed }) => [
                styles.saveButton,
                saved && styles.saveButtonSaved,
                pressed && !saved && styles.pressed
              ]}
            >
              {saved ? <Check color={colors.support} size={17} strokeWidth={3} /> : null}
              <Text style={[styles.saveButtonText, saved && styles.saveButtonTextSaved]}>
                {saved ? "Guardado" : "Guardar"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {scenario.issueMessages.length > 1 ? (
        <View style={styles.issueList}>
          {scenario.issueMessages.slice(1).map((message) => (
            <Text key={message} style={styles.issueText}>
              • {message}
            </Text>
          ))}
        </View>
      ) : null}

      {unavailable && onResolve ? (
        <Pressable
          accessibilityRole="button"
          onPress={onResolve}
          style={({ pressed }) => [styles.resolveButton, pressed && styles.pressed]}
        >
          <Text style={styles.resolveButtonText}>{resolveLabel}</Text>
          <ArrowRight color={colors.surface} size={19} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {!unavailable ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Text style={styles.toggleText}>
            {expanded ? "Ocultar proyección" : "Ver proyección"}
          </Text>
          {expanded ? (
            <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
          ) : (
            <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
          )}
        </Pressable>
      ) : null}

      {expanded && !unavailable ? (
        <View style={styles.detail}>
          <TimelinePreview scenario={scenario} />

          <View style={styles.distributionDetail}>
            <Text style={styles.distributionDetailTitle}>Distribución del primer mes</Text>
            <View style={styles.allocations}>
              <AllocationValue
                label={
                  scenario.id === "current_reference"
                    ? "Cuotas registradas"
                    : "Cuotas de deuda"
                }
                value={formatCOP(scenario.baseDebtPayments)}
              />
              <AllocationValue
                label="Extra a deudas"
                value={formatCOP(scenario.extraDebtPayment)}
              />
              <AllocationValue label="A metas" value={formatCOP(scenario.goalContribution)} />
              <AllocationValue
                label="Sin repartir"
                value={formatCOP(scenario.unassignedAmount)}
              />
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>
                Queda en el mes después de esta distribución
              </Text>
              <Text style={styles.balanceValue}>
                {scenario.monthlyBalance === null
                  ? "No disponible"
                  : formatSignedCOP(scenario.monthlyBalance)}
              </Text>
            </View>
          </View>

          {scenario.issueMessages.length > 0 && !unavailable ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Resultado con información limitada</Text>
              {scenario.issueMessages.map((message) => (
                <Text key={message} style={styles.warningText}>
                  • {message}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  cardUnavailable: {
    backgroundColor: "#FAFBFC"
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    flexGrow: 1,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeUnavailable: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  badgeTextUnavailable: {
    color: "#B45309"
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  headlineBox: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  headlineBoxUnavailable: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  headline: {
    color: colors.support,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  headlineUnavailable: {
    color: "#B45309"
  },
  selectionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  selectButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  selectButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  selectIndicator: {
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  selectIndicatorSelected: {
    backgroundColor: colors.primary
  },
  selectButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  selectButtonTextSelected: {
    color: colors.primary
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  saveButtonSaved: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  saveButtonTextSaved: {
    color: colors.support
  },
  issueList: {
    gap: spacing.xs
  },
  issueText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  resolveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  resolveButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.button
  },
  toggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  toggleText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  detail: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md
  },
  distributionDetail: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  distributionDetailTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  allocations: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  allocationAmount: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  balanceRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  balanceLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption,
    minWidth: 180
  },
  balanceValue: {
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
    fontWeight: typography.weight.black,
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  timelineGoalBadge: {
    backgroundColor: "#F3E8FF",
    borderColor: "#D8B4FE"
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
  goalSummary: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm
  },
  goalSummaryItem: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  goalSummaryCopy: {
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
    paddingTop: spacing.md
  },
  goalSummaryTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  goalSummaryStatus: {
    color: financialTimelineChartColors.goal,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  goalSummaryProgress: {
    flexBasis: 240,
    flexGrow: 2,
    gap: spacing.xs,
    minWidth: 200,
    paddingTop: spacing.md
  },
  goalSummaryValues: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  goalSummaryValue: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  goalProgressTrack: {
    backgroundColor: "#E9DFFF",
    borderRadius: radius.pill,
    height: 9,
    overflow: "hidden"
  },
  goalProgressFill: {
    backgroundColor: financialTimelineChartColors.goal,
    borderRadius: radius.pill,
    height: "100%"
  },
  goalSummaryExplanation: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  timelineMilestones: {
    gap: spacing.sm
  },
  timelineMilestonesTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
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
    marginTop: 4,
    width: 8
  },
  timelineMilestoneCopy: {
    flex: 1,
    gap: 1
  },
  timelineMilestoneMonth: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  timelineMilestoneText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  warningTitle: {
    color: "#B45309",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
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
