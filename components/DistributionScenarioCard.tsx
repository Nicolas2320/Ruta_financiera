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

  const labels: string[] = [];
  const firstMonth = scenario.timeline.months[0];

  if (firstMonth.debtPayments.length === 0) {
    labels.push("Sin deudas registradas");
  } else if (!scenario.timeline.allDebtBalancesKnown) {
    labels.push("Deudas: faltan saldos");
  } else if (scenario.timeline.allKnownDebtsPaidMonth) {
    labels.push(`Sin deudas: ${formatTargetMonth(scenario.timeline.allKnownDebtsPaidMonth)}`);
  } else {
    labels.push("Deudas: más de 10 años");
  }

  if (scenario.timeline.trackedGoal) {
    labels.push(
      scenario.timeline.goalCompletionMonth
        ? `Meta: ${formatTargetMonth(scenario.timeline.goalCompletionMonth)}`
        : scenario.goalContribution > 0
          ? "Meta: por proyectar"
          : "Metas: sin aporte mensual"
    );
  }

  return labels;
}

export function DistributionStrategyOption({
  applied,
  onResolve,
  onSelect,
  resolveLabel = "Completar información",
  scenario,
  selected
}: {
  applied: boolean;
  onResolve?: () => void;
  onSelect?: () => void;
  resolveLabel?: string;
  scenario: DistributionScenarioPresentation;
  selected: boolean;
}) {
  const unavailable = scenario.status !== "ready";
  const outcomes = getOutcomeLabels(scenario);

  return (
    <Pressable
      accessibilityLabel={`${scenario.label}. ${getHeadline(scenario)}${applied ? ". Estrategia actual" : selected ? ". Vista previa" : ""}`}
      accessibilityRole={unavailable ? "button" : "radio"}
      accessibilityState={{ disabled: unavailable && !onResolve, selected }}
      disabled={unavailable && !onResolve}
      onPress={unavailable ? onResolve : onSelect}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        unavailable && styles.cardUnavailable,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.optionHeader}>
        <Text style={styles.optionTitle}>{scenario.label}</Text>
        <View style={[styles.badge, unavailable && styles.badgeUnavailable]}>
          <Text style={[styles.badgeText, unavailable && styles.badgeTextUnavailable]}>
            {getStatusLabel(scenario)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.optionImpact, unavailable && styles.headlineUnavailable]}
      >
        {getHeadline(scenario)}
      </Text>

      {outcomes.length > 0 ? (
        <View style={styles.outcomeList}>
          {outcomes.map((outcome) => (
            <View key={outcome} style={styles.outcomeChip}>
              <Text style={styles.outcomeChipText}>{outcome}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.optionFooter}>
        {applied ? (
          <View style={styles.appliedBadge}>
            <Check color={colors.support} size={14} strokeWidth={3} />
            <Text style={styles.appliedBadgeText}>Estrategia actual</Text>
          </View>
        ) : selected ? (
          <View style={styles.previewBadge}>
            <View style={styles.previewDot} />
            <Text style={styles.previewBadgeText}>Vista previa</Text>
          </View>
        ) : unavailable ? (
          <View style={styles.resolveLink}>
            <Text style={styles.resolveLinkText}>{resolveLabel}</Text>
            <ArrowRight color={colors.primary} size={16} strokeWidth={2.5} />
          </View>
        ) : (
          <Text style={styles.chooseLabel}>Ver esta estrategia</Text>
        )}
      </View>
    </Pressable>
  );
}

function DistributionOverview({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const segments = [
    { color: colors.primary, label: "Extra a deudas", value: scenario.extraDebtPayment },
    { color: financialTimelineChartColors.goal, label: "A metas", value: scenario.goalContribution },
    { color: colors.textSubtle, label: "Sin repartir", value: scenario.unassignedAmount }
  ].filter((segment) => segment.value > 0);
  const distributionTotal = segments.reduce((total, segment) => total + segment.value, 0);

  return (
    <View style={styles.distributionOverview}>
      <Text style={styles.distributionDetailTitle}>Distribución del primer mes</Text>
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

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderCopy}>
          <Text style={styles.detailEyebrow}>DETALLE DE LA ESTRATEGIA</Text>
          <Text style={styles.detailTitle}>{scenario.label}</Text>
          <Text style={styles.description}>{scenario.description}</Text>
        </View>
        <View style={applied ? styles.appliedBadge : styles.previewBadge}>
          {applied ? (
            <Check color={colors.support} size={14} strokeWidth={3} />
          ) : (
            <View style={styles.previewDot} />
          )}
          <Text style={applied ? styles.appliedBadgeText : styles.previewBadgeText}>
            {applied ? "Estrategia actual" : "Vista previa"}
          </Text>
        </View>
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

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: applied }}
        disabled={applied}
        onPress={onApply}
        style={({ pressed }) => [
          styles.applyButton,
          applied && styles.applyButtonApplied,
          pressed && !applied && styles.pressed
        ]}
      >
        {applied ? <Check color={colors.support} size={18} strokeWidth={3} /> : null}
        <Text style={[styles.applyButtonText, applied && styles.applyButtonTextApplied]}>
          {applied ? "Esta es tu estrategia actual" : "Aplicar esta estrategia"}
        </Text>
      </Pressable>
      <Text style={styles.applyHelper}>
        Aplicarla actualiza tu plan mensual; no registra pagos ni separa dinero.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 280,
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 188,
    padding: spacing.md
  },
  optionCardSelected: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.primary,
    borderWidth: 2
  },
  optionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  optionTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option,
    minWidth: 150
  },
  optionImpact: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  outcomeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  outcomeChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  outcomeChipText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  optionFooter: {
    alignItems: "flex-start",
    flexGrow: 1,
    justifyContent: "flex-end"
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
    fontWeight: typography.weight.black,
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
    fontWeight: typography.weight.black,
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  chooseLabel: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  detailPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
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
    fontWeight: typography.weight.black,
    letterSpacing: 0.6,
    lineHeight: typography.lineHeight.small
  },
  detailTitle: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
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
    marginTop: 4,
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
    fontWeight: typography.weight.black,
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  projectionToggleHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  applyButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  applyButtonApplied: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  applyButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.button
  },
  applyButtonTextApplied: {
    color: colors.support
  },
  applyHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  inactiveGoalsNotice: {
    backgroundColor: "#F3E8FF",
    borderColor: "#D8B4FE",
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
