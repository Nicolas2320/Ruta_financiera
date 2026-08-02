import { ChevronDown, ChevronUp } from "lucide-react-native";
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
      ? `${formatCOP(scenario.unassignedAmount)} todavía no tienen un destino registrado.`
      : "Todo el dinero disponible ya tiene un destino registrado.";
  }

  if (scenario.id === "reduce_interest") {
    const destination = scenario.targetDebtTitles.join(", ");
    return scenario.extraDebtPayment > 0
      ? `${formatCOP(scenario.extraDebtPayment)} adicionales para ${destination}.`
      : "No se encontró una deuda elegible para recibir un pago adicional.";
  }

  if (scenario.id === "accelerate_goal") {
    return scenario.goalContribution > 0
      ? `${formatCOP(scenario.goalContribution)} mensuales para la meta.`
      : "No se pudo asignar dinero a una meta activa.";
  }

  return `${formatCOP(scenario.extraDebtPayment)} adicionales a deuda y ${formatCOP(
    scenario.goalContribution
  )} a la meta.`;
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
  const goal = scenario.timeline.trackedGoal;

  if (!goal || goal.targetAmount === null) {
    return null;
  }

  const progress = Math.min(
    100,
    Math.max(0, (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100)
  );
  const hasContribution = scenario.timeline.months.some(
    (month) => month.goalContributionTotal > 0
  );
  const explanation =
    scenario.id === "reduce_interest"
      ? "Esta estrategia dirige el dinero disponible a las deudas; por eso la meta se resume y no ocupa una gráfica vacía."
      : "No hay un aporte mensual registrado para esta meta en este escenario.";

  return (
    <View style={styles.goalSummary}>
      <View style={styles.goalSummaryCopy}>
        <Text style={styles.goalSummaryTitle}>{goal.title}</Text>
        <Text style={styles.goalSummaryStatus}>
          {hasContribution ? "Meta en movimiento" : "Sin aportes en este escenario"}
        </Text>
      </View>
      <View style={styles.goalSummaryProgress}>
        <View style={styles.goalSummaryValues}>
          <Text style={styles.goalSummaryValue}>{formatCOP(goal.currentAmount)} reunidos</Text>
          <Text style={styles.goalSummaryValue}>de {formatCOP(goal.targetAmount)}</Text>
        </View>
        <View style={styles.goalProgressTrack}>
          <View style={[styles.goalProgressFill, { width: `${progress}%` }]} />
        </View>
        {!hasContribution ? <Text style={styles.goalSummaryExplanation}>{explanation}</Text> : null}
      </View>
    </View>
  );
}

function TimelinePreview({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const timeline = scenario.timeline;

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
  const goal = timeline.trackedGoal;
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
        ? timeline.goalCompletionMonth
          ? `Con este plan alcanzas tu meta en ${formatSentenceMonth(
              timeline.goalCompletionMonth
            )}`
          : `Así avanzaría ${goal?.title ?? "tu meta"}`
        : "Así avanzan tu deuda y tu meta con el mismo dinero";
  const description =
    focus === "debt"
      ? "El saldo conocido baja con los pagos previstos en esta estrategia."
      : scenario.goalProjection?.targetMonth
        ? `Para ${formatTargetMonth(
            scenario.goalProjection.targetMonth
          )} reunirías aproximadamente ${formatCOP(
            scenario.goalProjection.amountAtTargetMonth
          )} de ${formatCOP(scenario.goalProjection.targetAmount)}.`
        : focus === "goal"
          ? "Mira cómo crece el dinero reunido con los aportes previstos."
          : "Deuda y meta comparten los mismos meses, pero conservan escalas independientes.";
  const metrics =
    focus === "debt"
      ? [
          { label: "Saldo al comenzar", value: formatCOP(startingKnownDebtBalance) },
          { label: "Pago del primer mes", value: formatCOP(firstDebtPayment) },
          { label: "Intereses estimados", value: formatCOP(timeline.totalInterestCharged) }
        ]
      : focus === "goal"
        ? [
            { label: "Reunido al comenzar", value: formatCOP(goal?.currentAmount ?? 0) },
            { label: "Aporte del primer mes", value: formatCOP(firstMonth.goalContributionTotal) },
            {
              label: "Valor de la meta",
              value:
                goal?.targetAmount === null
                  ? "Por definir"
                  : formatCOP(goal?.targetAmount ?? 0)
            }
          ]
        : [
            { label: "Deuda al comenzar", value: formatCOP(startingKnownDebtBalance) },
            { label: "Aporte inicial a meta", value: formatCOP(firstMonth.goalContributionTotal) },
            { label: "Intereses estimados", value: formatCOP(timeline.totalInterestCharged) }
          ];

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineHeader}>
        <View style={styles.timelineHeaderCopy}>
          <Text style={styles.timelineEyebrow}>
            {focus === "debt"
              ? "PROYECCIÓN DE DEUDA"
              : focus === "goal"
                ? "PROYECCIÓN DE META"
                : "DEUDA Y META"}
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
          {focus !== "debt" && timeline.goalCompletionMonth ? (
            <View style={[styles.timelineBadge, styles.timelineGoalBadge]}>
              <Text style={[styles.timelineBadgeText, styles.timelineGoalBadgeText]}>
                La completas: {formatTargetMonth(timeline.goalCompletionMonth)}
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

      <FinancialTimelineChart focus={focus} timeline={timeline} />

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
      {timeline.hasUnknownInterestRates ? (
        <Text style={styles.timelineWarning}>
          Alguna tasa está sin definir; las fechas y los intereses pueden cambiar.
        </Text>
      ) : null}
    </View>
  );
}

export function DistributionScenarioCard({
  expanded,
  onResolve,
  onSplitDebtPercentChange,
  onToggle,
  scenario
}: {
  expanded: boolean;
  onResolve?: () => void;
  onSplitDebtPercentChange?: (value: number) => void;
  onToggle: () => void;
  scenario: DistributionScenarioPresentation;
}) {
  const unavailable = scenario.status !== "ready";

  return (
    <View style={[styles.card, unavailable && styles.cardUnavailable]}>
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
          <Text style={styles.resolveButtonText}>Completar información</Text>
        </Pressable>
      ) : null}

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

      {expanded ? (
        <View style={styles.detail}>
          <TimelinePreview scenario={scenario} />

          <View style={styles.distributionDetail}>
            <Text style={styles.distributionDetailTitle}>Distribución del primer mes</Text>
            <View style={styles.allocations}>
              <AllocationValue
                label={
                  scenario.id === "current_reference"
                    ? "Cuotas registradas"
                    : "Cuotas requeridas"
                }
                value={formatCOP(scenario.baseDebtPayments)}
              />
              <AllocationValue
                label="Extra a deudas"
                value={formatCOP(scenario.extraDebtPayment)}
              />
              <AllocationValue label="A metas" value={formatCOP(scenario.goalContribution)} />
              <AllocationValue
                label="Sin asignar"
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
  issueList: {
    gap: spacing.xs
  },
  issueText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  resolveButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  resolveButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
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
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
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
  timelineWarning: {
    color: "#B45309",
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
