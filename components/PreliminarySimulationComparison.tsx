import { Check, ShieldCheck, Target, TrendingUp } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { SimulationPlanStrategy } from "../types/financial";
import type { FinancialSnapshot } from "../utils/financialCalculations";
import type { ProjectionGoalInput } from "../utils/financialProjectionInput";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import type {
  SimulationAmountRange,
  SimulationExperience
} from "../utils/simulationExperience";

function formatAmountRange(
  range: SimulationAmountRange,
  { signed = false }: { signed?: boolean } = {}
) {
  const formatValue = signed ? formatSignedCOP : formatCOP;

  if (range.minimum === null && range.maximum === null) {
    return "Por estimar";
  }

  if (range.minimum !== null && range.maximum === null) {
    return `Más de ${formatValue(range.minimum)}`;
  }

  if (range.minimum === null && range.maximum !== null) {
    return `Hasta ${formatValue(range.maximum)}`;
  }

  if (range.minimum === range.maximum) {
    return formatValue(range.minimum ?? 0);
  }

  return `${formatValue(range.minimum ?? 0)} – ${formatValue(range.maximum ?? 0)}`;
}

function addMonthsToProjection(asOfDate: string, months: number) {
  const date = new Date(`${asOfDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(date.getMonth() + Math.max(0, months));
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function getGoalProjection({
  asOfDate,
  goal,
  monthlyContribution
}: {
  asOfDate: string;
  goal: ProjectionGoalInput | null;
  monthlyContribution: number | null;
}) {
  if (
    !goal ||
    goal.targetAmount === null ||
    monthlyContribution === null ||
    monthlyContribution <= 0
  ) {
    return null;
  }

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const estimatedMonths = remainingAmount <= 0 ? 0 : Math.ceil(remainingAmount / monthlyContribution);

  if (estimatedMonths > 120) {
    return "Más de 10 años";
  }

  const completionMonth = addMonthsToProjection(asOfDate, estimatedMonths);
  return completionMonth ? formatTargetMonth(completionMonth) : null;
}

function getEstimateExplanation(experience: SimulationExperience) {
  if (experience.mode === "goal_only") {
    return "Como indicaste que no pagas deudas, esta vista se concentra en tu margen y tu meta.";
  }

  if (experience.debtDataSource === "category") {
    return "Usamos temporalmente el pago mensual que registraste dentro de tus gastos. No calculamos saldos, tasas ni fechas de terminación.";
  }

  if (experience.reportedRatioRange.kind === "minimum_only") {
    return "Tu respuesta no tiene un límite superior. Para no inventar una capacidad mensual, evitamos asignar dinero hasta tener una referencia un poco más precisa.";
  }

  if (experience.reportedRatioRange.kind === "unknown") {
    return "Sabemos que las deudas forman parte de tu situación, pero no inventamos una cuota ni un margen disponible.";
  }

  return `Tus pagos de deuda podrían estar entre ${formatAmountRange(
    experience.debtPaymentRange
  )}. Para esta exploración usamos el extremo prudente del rango.`;
}

export function PreliminarySimulationComparison({
  asOfDate,
  distributableAmount,
  experience,
  emergencyCoverageMonths,
  goal,
  onSelect,
  priority,
  selectedStrategy
}: {
  asOfDate: string;
  distributableAmount: number | null;
  emergencyCoverageMonths: number | null;
  experience: SimulationExperience;
  goal: ProjectionGoalInput | null;
  onSelect: (strategy: SimulationPlanStrategy) => void;
  priority: FinancialSnapshot["priority"];
  selectedStrategy: SimulationPlanStrategy;
}) {
  const goalProjection = getGoalProjection({
    asOfDate,
    goal,
    monthlyContribution: distributableAmount
  });
  const canEstimate = experience.planningMonthlyMargin !== null;
  const canSelectGoal = Boolean(
    goal && canEstimate && distributableAmount !== null && distributableAmount > 0
  );
  const goalIsAlreadyRecommended = priority.key === "advance_goal";
  const prudentMonthlyMargin =
    experience.planningMonthlyMargin === null
      ? null
      : Math.max(0, experience.planningMonthlyMargin);
  const recommendedUnassignedAmount =
    prudentMonthlyMargin === null
      ? null
      : Math.max(0, prudentMonthlyMargin - experience.recommendedMonthlyContribution);
  const explorationProtectedAmount =
    prudentMonthlyMargin === null || distributableAmount === null
      ? null
      : Math.max(0, prudentMonthlyMargin - distributableAmount);
  const recommendedSelected = selectedStrategy === "diagnosis_recommended";
  const goalSelected = selectedStrategy === "prioritize_goal" && canSelectGoal;

  return (
    <View style={styles.container}>
      <View style={styles.orientationBanner}>
        <View style={styles.orientationIcon}>
          <TrendingUp color={colors.primary} size={21} strokeWidth={2.5} />
        </View>
        <View style={styles.orientationCopy}>
          <Text style={styles.orientationTag}>ESTIMACIÓN INICIAL</Text>
          <Text style={styles.orientationTitle}>
            {experience.mode === "goal_only"
              ? "Una simulación centrada en tu meta"
              : "Una simulación sin pedirte cada deuda"}
          </Text>
          <Text style={styles.orientationText}>{getEstimateExplanation(experience)}</Text>
        </View>
      </View>

      <View style={styles.rangeGrid}>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>
            {experience.mode === "goal_only" ? "Pagos de deuda" : "Pagos de deuda estimados"}
          </Text>
          <Text style={styles.rangeValue}>
            {formatAmountRange(experience.debtPaymentRange)}
          </Text>
        </View>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>Margen mensual posible</Text>
          <Text style={styles.rangeValue}>
            {formatAmountRange(experience.monthlyMarginRange, { signed: true })}
          </Text>
        </View>
        <View style={[styles.rangeItem, styles.rangeItemPrimary]}>
          <Text style={styles.rangeLabel}>Referencia prudente</Text>
          <Text style={[styles.rangeValue, styles.rangeValuePrimary]}>
            {experience.planningMonthlyMargin === null
              ? "Por estimar"
              : formatSignedCOP(experience.planningMonthlyMargin)}
          </Text>
        </View>
      </View>

      <Text style={styles.comparisonIntro}>
        {goalIsAlreadyRecommended
          ? "Tu diagnóstico ya prioriza la meta. Aquí eliges el ritmo: un aporte gradual o uno acelerado usando más del margen disponible."
          : "Elige qué referencia quieres usar en la vista previa de tu plan. Podrás cambiarla después sin registrar pagos ni mover dinero."}
      </Text>

      {goalIsAlreadyRecommended && emergencyCoverageMonths !== null ? (
        <View style={styles.priorityExplanation}>
          <Text style={styles.priorityExplanationTitle}>
            ¿Por qué el diagnóstico ahora recomienda la meta?
          </Text>
          <Text style={styles.priorityExplanationText}>
            Tus ahorros equivalen aproximadamente a {new Intl.NumberFormat("es-CO", {
              maximumFractionDigits: 1
            }).format(emergencyCoverageMonths)} meses de gastos mensuales registrados. Por eso el fondo
            de emergencia ya no aparece como primera prioridad. Ese ahorro general no se suma
            automáticamente a la meta: allí solo cuenta el dinero que registraste como ya
            separado para ella.
          </Text>
        </View>
      ) : null}

      <View style={styles.options}>
        <Pressable
          accessibilityLabel={`Usar la recomendación: ${priority.title}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: recommendedSelected }}
          onPress={() => onSelect("diagnosis_recommended")}
          style={({ pressed }) => [
            styles.option,
            styles.optionRecommended,
            recommendedSelected && styles.optionSelectedSupport,
            pressed && styles.optionPressed
          ]}
        >
          <View style={styles.optionHeader}>
            <View style={[styles.optionIcon, styles.optionIconSupport]}>
              <ShieldCheck color={colors.support} size={22} strokeWidth={2.5} />
            </View>
            <View style={styles.optionHeaderCopy}>
              <Text style={[styles.optionTag, styles.optionTagSupport]}>RECOMENDADO</Text>
              <Text style={styles.optionTitle}>
                {goalIsAlreadyRecommended && goal
                  ? `Aporte gradual para ${goal.title}`
                  : priority.title}
              </Text>
            </View>
            <View
              style={[
                styles.selectionIndicator,
                recommendedSelected && styles.selectionIndicatorSupport
              ]}
            >
              {recommendedSelected ? (
                <Check color={colors.surface} size={15} strokeWidth={3} />
              ) : null}
            </View>
          </View>
          <Text style={styles.optionDescription}>
            {goalIsAlreadyRecommended
              ? "Avanza hacia la meta sin asignar todo el margen prudente, para conservar espacio ante gastos variables o imprevistos."
              : priority.description}
          </Text>
          <View style={styles.optionResult}>
            <Text style={styles.optionResultLabel}>
              {goalIsAlreadyRecommended
                ? "Aporte mensual gradual"
                : "Referencia mensual del diagnóstico"}
            </Text>
            <Text style={[styles.optionResultValue, styles.optionResultValueSupport]}>
              {experience.recommendedMonthlyContribution > 0
                ? formatCOP(experience.recommendedMonthlyContribution)
                : "Por definir"}
            </Text>
          </View>
          <Text style={styles.optionFootnote}>
            {recommendedUnassignedAmount === null
              ? "Mantiene la prioridad detectada en tu diagnóstico."
              : `Conserva al menos ${formatCOP(recommendedUnassignedAmount)} del margen prudente sin asignar.`}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={
            goal ? `Usar la referencia para priorizar ${goal.title}` : "Priorizar una meta"
          }
          accessibilityRole="radio"
          accessibilityState={{ disabled: !canSelectGoal, selected: goalSelected }}
          disabled={!canSelectGoal}
          onPress={() => onSelect("prioritize_goal")}
          style={({ pressed }) => [
            styles.option,
            goalSelected && styles.optionSelectedPrimary,
            !canSelectGoal && styles.optionDisabled,
            pressed && canSelectGoal && styles.optionPressed
          ]}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionIcon}>
              <Target color={colors.primary} size={22} strokeWidth={2.5} />
            </View>
            <View style={styles.optionHeaderCopy}>
              <Text style={styles.optionTag}>EXPLORACIÓN</Text>
              <Text style={styles.optionTitle}>
                {goal
                  ? goalIsAlreadyRecommended
                    ? `Acelerar ${goal.title}`
                    : `Si priorizaras ${goal.title}`
                  : "Si priorizaras una meta"}
              </Text>
            </View>
            <View
              style={[
                styles.selectionIndicator,
                goalSelected && styles.selectionIndicatorPrimary
              ]}
            >
              {goalSelected ? (
                <Check color={colors.surface} size={15} strokeWidth={3} />
              ) : null}
            </View>
          </View>
          <Text style={styles.optionDescription}>
            {goalIsAlreadyRecommended
              ? "Usa para la meta todo lo disponible después del margen protegido. Avanza más rápido, pero deja menos dinero sin asignar."
              : "Muestra qué pasaría si dirigieras a la meta todo lo disponible después de proteger el margen elegido."}
          </Text>
          <View style={styles.optionResult}>
            <Text style={styles.optionResultLabel}>Aporte mensual explorado</Text>
            <Text style={styles.optionResultValue}>
              {distributableAmount === null ? "Por estimar" : formatCOP(distributableAmount)}
            </Text>
          </View>
          <Text style={styles.optionFootnote}>
            {!goal
              ? "Primero necesitas una meta con un monto definido."
              : !canEstimate
                ? "Necesitamos acotar un poco el peso de tus deudas para proyectarla."
                : goalProjection
                  ? `Con este ritmo la completarías aproximadamente en ${goalProjection}.`
                  : "Define el valor de la meta para estimar cuándo podrías completarla."}
          </Text>
          {explorationProtectedAmount !== null ? (
            <Text style={styles.optionBalance}>
              Conserva {formatCOP(explorationProtectedAmount)} como margen protegido.
            </Text>
          ) : null}
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        {experience.mode === "goal_only"
          ? "La selección se guardará cuando continúes. No supone que ya separaste el dinero."
          : "La selección se guardará cuando continúes. No supone que ya separaste el dinero; cuando registres el detalle de tus deudas, aparecerá la comparación completa."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  orientationBanner: {
    alignItems: "flex-start",
    backgroundColor: "#F8FBFF",
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  orientationIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  orientationCopy: {
    flex: 1,
    gap: 3
  },
  orientationTag: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.badge
  },
  orientationTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  orientationText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  rangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rangeItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 170,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  rangeItemPrimary: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  rangeLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  rangeValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  rangeValuePrimary: {
    color: colors.support
  },
  comparisonIntro: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  priorityExplanation: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  priorityExplanationTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  priorityExplanationText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 280,
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  optionRecommended: {
    backgroundColor: "#F5FCF8",
    borderColor: colors.supportBorder
  },
  optionSelectedSupport: {
    borderColor: colors.support,
    borderWidth: 2
  },
  optionSelectedPrimary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  optionDisabled: {
    opacity: 0.58
  },
  optionPressed: {
    opacity: 0.82
  },
  optionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  optionIconSupport: {
    backgroundColor: colors.supportSoft
  },
  optionHeaderCopy: {
    flex: 1,
    gap: 2
  },
  selectionIndicator: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  selectionIndicatorSupport: {
    backgroundColor: colors.support,
    borderColor: colors.support
  },
  selectionIndicatorPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  optionTag: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.small
  },
  optionTagSupport: {
    color: colors.support
  },
  optionTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  optionResult: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm
  },
  optionResultLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  optionResultValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  optionResultValueSupport: {
    color: colors.support
  },
  optionFootnote: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  optionBalance: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  disclaimer: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  }
});
