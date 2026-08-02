import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { DistributionScenarioPresentation } from "../utils/financialDistributionPresentation";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import { DebtGoalAllocationSlider } from "./DebtGoalAllocationSlider";

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

function GoalProjection({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const projection = scenario.goalProjection;

  if (!projection) {
    return null;
  }

  const targetMonthLabel = formatTargetMonth(projection.targetMonth);
  const reachesTarget = projection.targetGapAtTargetMonth <= 0;

  return (
    <View style={styles.goalProjection}>
      <Text style={styles.projectionTitle}>Qué pasaría con {projection.goalTitle}</Text>
      <Text style={styles.projectionText}>
        Si mantienes este ritmo, para {targetMonthLabel} tendrías aproximadamente {formatCOP(
          projection.amountAtTargetMonth
        )} de {formatCOP(projection.targetAmount)}.
      </Text>
      <View style={styles.projectionFacts}>
        <View style={styles.projectionFact}>
          <Text style={styles.projectionFactLabel}>Meta completa</Text>
          <Text style={[styles.projectionFactValue, reachesTarget && styles.positiveText]}>
            {reachesTarget
              ? "La cubrirías"
              : `Faltarían ${formatCOP(projection.targetGapAtTargetMonth)}`}
          </Text>
        </View>
        <View style={styles.projectionFact}>
          <Text style={styles.projectionFactLabel}>Ritmo estimado</Text>
          <Text style={styles.projectionFactValue}>
            {projection.estimatedMonthsToTarget === null
              ? "No calculado"
              : `${projection.estimatedMonthsToTarget} meses`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TimelinePreview({ scenario }: { scenario: DistributionScenarioPresentation }) {
  const timeline = scenario.timeline;

  if (timeline.months.length === 0) {
    return null;
  }

  const keyMonths = timeline.months
    .filter((month, index) =>
      index === 0 ||
      month.newlyPaidDebtIds.length > 0 ||
      month.goalContributions.some((contribution) => contribution.reached)
    )
    .slice(0, 4);

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineHeader}>
        <View style={styles.timelineHeaderCopy}>
          <Text style={styles.timelineTitle}>Proyección mes a mes</Text>
          <Text style={styles.timelineDescription}>
            Cuando termina una deuda, su pago base se libera desde el mes siguiente y el
            escenario vuelve a distribuir el dinero.
          </Text>
        </View>
        {timeline.allKnownDebtsPaidMonth ? (
          <View style={styles.timelineBadge}>
            <Text style={styles.timelineBadgeText}>
              Deudas: {formatTargetMonth(timeline.allKnownDebtsPaidMonth)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.timelineMonths}>
        {keyMonths.map((month) => {
          const paidDebtTitles = month.debtPayments
            .filter((payment) => month.newlyPaidDebtIds.includes(payment.debtId))
            .map((payment) => payment.title);

          return (
            <View key={month.month} style={styles.timelineMonth}>
              <Text style={styles.timelineMonthLabel}>{formatTargetMonth(month.month)}</Text>
              <View style={styles.timelineMonthValues}>
                <Text style={styles.timelineMonthValue}>
                  Deudas {formatCOP(month.baseDebtPayments + month.extraDebtPayments)}
                </Text>
                <Text style={styles.timelineMonthValue}>
                  Meta {formatCOP(month.goalContributionTotal)}
                </Text>
              </View>
              {paidDebtTitles.length > 0 ? (
                <Text style={styles.timelineEvent}>
                  Termina {paidDebtTitles.join(", ")}. Se liberan {formatCOP(
                    month.releasedPaymentNextMonth
                  )} desde el mes siguiente.
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.timelineFooter}>
        {timeline.goalCompletionMonth ? (
          <Text style={styles.timelineFooterText}>
            Meta estimada: {formatTargetMonth(timeline.goalCompletionMonth)}
          </Text>
        ) : null}
        <Text style={styles.timelineFooterText}>
          Intereses estimados: {formatCOP(timeline.totalInterestCharged)}
        </Text>
      </View>
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
        <Text style={styles.toggleText}>{expanded ? "Ocultar detalle" : "Ver distribución"}</Text>
        {expanded ? (
          <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
        ) : (
          <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.detail}>
          <View style={styles.allocations}>
            <AllocationValue
              label={scenario.id === "current_reference" ? "Cuotas registradas" : "Cuotas requeridas"}
              value={formatCOP(scenario.baseDebtPayments)}
            />
            <AllocationValue label="Extra a deudas" value={formatCOP(scenario.extraDebtPayment)} />
            <AllocationValue label="A metas" value={formatCOP(scenario.goalContribution)} />
            <AllocationValue label="Sin asignar" value={formatCOP(scenario.unassignedAmount)} />
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Queda en el mes después de esta distribución</Text>
            <Text style={styles.balanceValue}>
              {scenario.monthlyBalance === null
                ? "No disponible"
                : formatSignedCOP(scenario.monthlyBalance)}
            </Text>
          </View>

          <TimelinePreview scenario={scenario} />

          <GoalProjection scenario={scenario} />

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
  goalProjection: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  projectionTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  projectionText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  projectionFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  projectionFact: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexBasis: 145,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  projectionFactLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  projectionFactValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  positiveText: {
    color: colors.support
  },
  timeline: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.primaryBorder,
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
  timelineTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  timelineDescription: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
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
  timelineMonths: {
    gap: spacing.sm
  },
  timelineMonth: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  timelineMonthLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textTransform: "capitalize"
  },
  timelineMonthValues: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  timelineMonthValue: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  timelineEvent: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  timelineFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  timelineFooterText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
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
