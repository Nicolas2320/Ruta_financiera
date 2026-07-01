import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  CalendarCheck,
  ChartColumnIncreasing,
  Check,
  ClipboardCheck,
  HandCoins,
  PenLine,
  PiggyBank,
  Search,
  ShieldCheck,
  Target,
  Wallet
} from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import {
  getLegacyFieldsFromGoal,
  getOnboardingGoals,
  normalizeActionProgressRecord,
  type ActionProgressEvidence,
  type ActionProgressPatch,
  type ActionProgressStatus,
  type ActionProgressValue,
  type FinancialGoal
} from "../types/financial";
import { formatCOP, getFinancialDataSourceLabel } from "../utils/financialRanges";
import { formatGoalContribution, getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import {
  applyGoalContribution,
  removeGoalContributionBySource
} from "../utils/goalContributions";
import {
  getActionImpactMessage,
  getActionProgressImpactItem,
  getMonthlyActionImpactSummary,
  getMonthlyImpactHeadline,
  getNextPlanAdjustmentHint,
  type MonthlyActionImpactItem
} from "../utils/actionProgressImpact";
import {
  getActiveMonthlyPlanProgressKey,
  getMonthlyActions,
  getMonthlyActionProgressId,
  getMonthlyActionProgressStatus,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  getMonthlyPlanPriorityKey,
  getMonthlyPlanProgressKey,
  isMonthlyActionCompleted,
  type MonthlyAction,
  type MonthlyGoalContext
} from "../utils/monthlyPlan";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type ChipTone = "primary" | "support" | "warning" | "purple" | "neutral";

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getActionVisual(actionId: string): {
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
} {
  if (actionId === "emergency") {
    return { icon: PiggyBank, color: colors.support, backgroundColor: colors.supportSoft };
  }

  if (actionId === "variable-expenses") {
    return { icon: Search, color: "#B77900", backgroundColor: colors.warningSoft };
  }

  if (actionId === "small-expenses") {
    return { icon: HandCoins, color: "#7C3AED", backgroundColor: "#F1E8FF" };
  }

  if (actionId === "debt") {
    return { icon: Wallet, color: "#F97316", backgroundColor: "#FFF1E7" };
  }

  if (actionId === "education") {
    return { icon: BookOpen, color: colors.primary, backgroundColor: colors.primarySoft };
  }

  if (actionId === "goal-amount") {
    return { icon: Target, color: "#7C3AED", backgroundColor: "#F1E8FF" };
  }

  return { icon: CalendarCheck, color: colors.support, backgroundColor: colors.supportSoft };
}

function getCategoryTone(category: string): ChipTone {
  if (category === "Ahorro") {
    return "support";
  }

  if (category === "Gastos" || category === "Deudas") {
    return "warning";
  }

  if (category === "Gastos hormiga" || category === "Meta") {
    return "purple";
  }

  return "primary";
}

type EvidenceConfig = {
  type: NonNullable<ActionProgressEvidence["type"]>;
  title: string;
  prompt: string;
  placeholder: string;
  resultLabel: string;
};

const amountEvidenceByActionId: Record<string, Omit<EvidenceConfig, "type">> = {
  "debt-monthly-payment": {
    title: "Registra el pago mensual",
    prompt: "Anota cuánto pagas aproximadamente al mes por tus deudas.",
    placeholder: "Ej. 350000",
    resultLabel: "Pago mensual identificado"
  },
  "weekly-limit": {
    title: "Define el límite",
    prompt: "Escribe el límite semanal que vas a probar.",
    placeholder: "Ej. 80000",
    resultLabel: "Límite semanal definido"
  },
  "small-automatic-separation": {
    title: "Registra lo que separaste",
    prompt: "Anota la cantidad mínima que apartaste o vas a apartar al recibir ingresos.",
    placeholder: "Ej. 50000",
    resultLabel: "Monto separado"
  },
  "initial-emergency-contribution": {
    title: "Registra el aporte",
    prompt: "Anota cuánto separaste para tu fondo de emergencia.",
    placeholder: "Ej. 100000",
    resultLabel: "Aporte a emergencia"
  },
  "small-expense-limit": {
    title: "Define el límite mensual",
    prompt: "Escribe el límite que vas a probar para esta categoría.",
    placeholder: "Ej. 120000",
    resultLabel: "Límite mensual definido"
  },
  "redirect-small-expenses": {
    title: "Registra lo redirigido",
    prompt: "Anota cuánto vas a mover desde gastos pequeños hacia tu meta.",
    placeholder: "Ej. 40000",
    resultLabel: "Monto redirigido"
  },
  "set-goal-contribution": {
    title: "Registra el aporte",
    prompt: "Anota cuánto separaste o te comprometes a separar para esta meta.",
    placeholder: "Ej. 150000",
    resultLabel: "Aporte a meta"
  }
};

const detailEvidenceByActionId: Record<string, Omit<EvidenceConfig, "type"> & { type?: EvidenceConfig["type"] }> = {
  "debt-pressure-source": {
    title: "Identifica la deuda",
    prompt: "Escribe cuál deuda pesa más por pago, interés o urgencia.",
    placeholder: "Ej. Tarjeta de crédito",
    resultLabel: "Deuda priorizada"
  },
  "avoid-new-debt": {
    title: "Define una regla",
    prompt: "Anota qué compra o deuda vas a evitar este mes.",
    placeholder: "Ej. No financiar compras de ropa",
    resultLabel: "Regla definida",
    type: "decision"
  },
  "review-main-expenses": {
    title: "Registra categorías",
    prompt: "Anota las categorías principales que revisaste.",
    placeholder: "Ej. arriendo, transporte, alimentación",
    resultLabel: "Categorías revisadas",
    type: "category"
  },
  "separate-emergency-money": {
    title: "Define dónde guardarlo",
    prompt: "Anota dónde quedará separado ese dinero.",
    placeholder: "Ej. Bolsillo de ahorro / cuenta separada",
    resultLabel: "Lugar definido"
  },
  "protect-emergency-money": {
    title: "Define tu regla de uso",
    prompt: "Anota qué cuenta como emergencia para ti.",
    placeholder: "Ej. salud, reparación urgente o pérdida de ingreso",
    resultLabel: "Regla de emergencia",
    type: "decision"
  },
  "observe-small-expense-category": {
    title: "Elige una categoría",
    prompt: "Anota la categoría de gasto pequeño que observarás esta semana.",
    placeholder: "Ej. domicilios",
    resultLabel: "Categoría observada",
    type: "category"
  },
  "review-goal-target": {
    title: "Registra la decisión",
    prompt: "Anota si mantienes, bajas o ajustas el monto objetivo.",
    placeholder: "Ej. Mantengo la meta, pero amplio el plazo",
    resultLabel: "Decisión sobre meta",
    type: "decision"
  },
  "compare-goal-contribution": {
    title: "Registra el escenario",
    prompt: "Anota qué aporte comparaste y qué aprendiste.",
    placeholder: "Ej. Comparé 100k vs 180k al mes",
    resultLabel: "Escenario comparado"
  },
  "learn-risk-time": {
    title: "Registra el concepto",
    prompt: "Anota el concepto que entendiste mejor.",
    placeholder: "Ej. riesgo, plazo o liquidez",
    resultLabel: "Concepto aprendido",
    type: "note"
  },
  "define-investing-horizon": {
    title: "Define el horizonte",
    prompt: "Anota si esta meta es de corto, mediano o largo plazo.",
    placeholder: "Ej. Largo plazo, más de 3 años",
    resultLabel: "Horizonte definido",
    type: "decision"
  },
  "protect-emergency-before-investing": {
    title: "Registra la protección",
    prompt: "Anota qué dinero no vas a invertir porque lo necesitas disponible.",
    placeholder: "Ej. Fondo de emergencia separado",
    resultLabel: "Protección definida",
    type: "decision"
  },
  "review-financial-data": {
    title: "Registra qué revisaste",
    prompt: "Anota qué dato confirmaste o cambió este mes.",
    placeholder: "Ej. Mis gastos subieron por transporte",
    resultLabel: "Dato revisado"
  },
  "confirm-goal-priority": {
    title: "Confirma la prioridad",
    prompt: "Anota si tu meta sigue igual o si quieres cambiarla.",
    placeholder: "Ej. Sigue siendo vivienda",
    resultLabel: "Prioridad confirmada",
    type: "decision"
  },
  "complete-optional-data": {
    title: "Registra el dato agregado",
    prompt: "Anota qué dato completaste para mejorar el plan.",
    placeholder: "Ej. ingreso exacto o gasto mensual",
    resultLabel: "Dato completado"
  }
};

function getActionEvidenceConfig(action: MonthlyAction): EvidenceConfig {
  const amountConfig = amountEvidenceByActionId[action.id];

  if (amountConfig) {
    return {
      ...amountConfig,
      type: "amount"
    };
  }

  const detailConfig = detailEvidenceByActionId[action.id];

  if (detailConfig) {
    return {
      ...detailConfig,
      type: detailConfig.type ?? "note"
    };
  }

  return {
    type: "note",
    title: "Registra tu avance",
    prompt: "Anota qué hiciste para que la app pueda tenerlo en cuenta.",
    placeholder: "Ej. Revisé esta acción y definí el siguiente paso",
    resultLabel: "Avance registrado"
  };
}

function parseCOPInput(value: string) {
  const parsedValue = Number(value.replace(/\D/g, ""));

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function sanitizeCOPInput(value: string) {
  return value.replace(/\D/g, "");
}

function formatCOPInputValue(value: string) {
  const amount = parseCOPInput(value);

  return amount ? formatCOP(amount) : "";
}

function getEvidenceText(evidence: ActionProgressEvidence | undefined) {
  if (!evidence) {
    return null;
  }

  if (typeof evidence.amount === "number" && Number.isFinite(evidence.amount)) {
    return `${evidence.label ?? "Monto registrado"}: ${formatCOP(evidence.amount)}`;
  }

  const detail = evidence.detail?.trim();

  if (detail) {
    return `${evidence.label ?? "Registro"}: ${detail}`;
  }

  return null;
}

function getStatusLabel(status: ActionProgressStatus) {
  if (status === "completed") {
    return "Completada";
  }

  if (status === "in_progress") {
    return "En progreso";
  }

  if (status === "skipped") {
    return "Omitida este mes";
  }

  return "Pendiente";
}

function getStatusTone(status: ActionProgressStatus): ChipTone {
  if (status === "completed") {
    return "support";
  }

  if (status === "in_progress") {
    return "primary";
  }

  if (status === "skipped") {
    return "neutral";
  }

  return "warning";
}

function getEvidenceInputLabel(config: EvidenceConfig) {
  if (config.type === "amount") {
    return "Monto en COP";
  }

  if (config.type === "decision") {
    return "Decisión";
  }

  if (config.type === "category") {
    return "Categoría";
  }

  return "Nota breve";
}

function getEvidenceInputPlaceholder(config: EvidenceConfig) {
  return config.type === "amount" ? "$0" : "Escribe un registro corto";
}

function getEvidencePrompt(config: EvidenceConfig) {
  if (config.type === "amount") {
    return "Ingresa un monto real o aproximado.";
  }

  return "Una frase corta es suficiente.";
}

function Chip({ label, tone = "primary" }: { label: string; tone?: ChipTone }) {
  return (
    <View
      style={[
        styles.chip,
        tone === "support" && styles.chipSupport,
        tone === "warning" && styles.chipWarning,
        tone === "purple" && styles.chipPurple,
        tone === "neutral" && styles.chipNeutral
      ]}
    >
      <Text
        style={[
          styles.chipText,
          tone === "support" && styles.chipTextSupport,
          tone === "warning" && styles.chipTextWarning,
          tone === "purple" && styles.chipTextPurple,
          tone === "neutral" && styles.chipTextNeutral
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  tone = "primary"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: ChipTone;
}) {
  return (
    <View style={styles.summaryMetric}>
      <View
        style={[
          styles.summaryMetricIcon,
          tone === "support" && styles.summaryMetricIconSupport,
          tone === "warning" && styles.summaryMetricIconWarning,
          tone === "purple" && styles.summaryMetricIconPurple
        ]}
      >
        {icon}
      </View>
      <View style={styles.summaryMetricText}>
        <Text style={styles.summaryMetricLabel}>{label}</Text>
        <Text style={styles.summaryMetricValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionCard({
  action,
  actionNumber,
  expanded,
  impactItem,
  onProgressChange,
  onToggleExpanded,
  progress
}: {
  action: MonthlyAction;
  actionNumber: number;
  expanded: boolean;
  impactItem: MonthlyActionImpactItem | null;
  onProgressChange: (patch: ActionProgressPatch) => void;
  onToggleExpanded: () => void;
  progress: ActionProgressValue | undefined;
}) {
  const visual = getActionVisual(action.id);
  const Icon = visual.icon;
  const progressRecord = normalizeActionProgressRecord(progress);
  const status = progressRecord?.status ?? "pending";
  const completed = status === "completed";
  const evidenceConfig = getActionEvidenceConfig(action);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [amountText, setAmountText] = useState(
    progressRecord?.evidence?.amount ? `${progressRecord.evidence.amount}` : ""
  );
  const [detailText, setDetailText] = useState(progressRecord?.evidence?.detail ?? "");
  const amountValue = parseCOPInput(amountText);
  const detailValue = detailText.trim();
  const hasEvidence = evidenceConfig.type === "amount" ? amountValue !== null : detailValue.length > 0;
  const evidenceText = getEvidenceText(progressRecord?.evidence);
  const inputLabel = getEvidenceInputLabel(evidenceConfig);
  const inputPlaceholder = getEvidenceInputPlaceholder(evidenceConfig);
  const evidencePrompt = getEvidencePrompt(evidenceConfig);
  const inputValue = evidenceConfig.type === "amount" ? formatCOPInputValue(amountText) : detailText;
  const impactMessage = getActionImpactMessage(impactItem);
  const hasSavedProgress = Boolean(
    progressRecord && (progressRecord.status !== "pending" || progressRecord.evidence)
  );
  const registrationButtonLabel = evidenceText ? "Editar registro" : "Registrar avance";
  const handleEvidenceChange = (value: string) => {
    if (evidenceConfig.type === "amount") {
      setAmountText(sanitizeCOPInput(value));
      return;
    }

    setDetailText(value);
  };

  useEffect(() => {
    if (!expanded) {
      return;
    }

    setAmountText(progressRecord?.evidence?.amount ? `${progressRecord.evidence.amount}` : "");
    setDetailText(progressRecord?.evidence?.detail ?? "");
    setConfirmingDelete(false);
  }, [expanded, progressRecord?.evidence?.amount, progressRecord?.evidence?.detail]);

  const buildEvidence = (): ActionProgressEvidence => ({
    type: evidenceConfig.type,
    label: evidenceConfig.resultLabel,
    amount: evidenceConfig.type === "amount" ? amountValue : null,
    detail: evidenceConfig.type === "amount" ? null : detailValue
  });
  const closeModal = () => {
    setConfirmingDelete(false);
    onToggleExpanded();
  };
  const saveProgress = () => {
    onProgressChange({
      status: "completed",
      evidence: hasEvidence ? buildEvidence() : progressRecord?.evidence
    });
    closeModal();
  };
  const deleteProgress = () => {
    onProgressChange({
      status: "pending",
      clearEvidence: true
    });
    closeModal();
  };

  return (
    <View style={[styles.actionCard, completed && styles.actionCardCompleted]}>
      <View style={styles.actionTopRow}>
        <View style={styles.actionNumber}>
          <Text style={styles.actionNumberText}>{actionNumber}</Text>
        </View>
        <View style={[styles.actionIcon, { backgroundColor: visual.backgroundColor }]}>
          <Icon color={visual.color} size={25} strokeWidth={2.4} />
        </View>
        <View style={styles.actionMainText}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
        <View
          accessibilityLabel={`Estado de ${action.title}: ${getStatusLabel(status)}`}
          style={[
            styles.statusBadge,
            status === "completed" && styles.statusBadgeCompleted,
            status === "in_progress" && styles.statusBadgeInProgress,
            status === "skipped" && styles.statusBadgeSkipped
          ]}
        >
          {completed ? <Check color={colors.support} size={15} strokeWidth={3} /> : null}
          <Text
            style={[
              styles.statusBadgeText,
              status === "completed" && styles.statusBadgeTextCompleted
            ]}
          >
            {getStatusLabel(status)}
          </Text>
        </View>
      </View>

      <View style={styles.actionMetaRow}>
        <Chip label={action.category} tone={getCategoryTone(action.category)} />
        <Chip
          label={`Dificultad: ${action.difficulty}`}
          tone={action.difficulty === "Baja" ? "support" : "warning"}
        />
      </View>

      <View style={styles.actionReference}>
        <Text style={styles.actionReferenceLabel}>Guía</Text>
        <Text style={styles.actionReferenceText}>{action.estimatedImpact}</Text>
      </View>

      <View style={styles.actionFooter}>
        {evidenceText ? (
          <View style={styles.actionFooterTextGroup}>
            <Text style={styles.actionFooterLabel}>Registro guardado</Text>
            <Text style={styles.actionFooterHint}>{evidenceText}</Text>
            {impactMessage ? (
              <Text style={styles.actionFooterImpact}>{impactMessage}</Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={`${registrationButtonLabel} de ${action.title}`}
          accessibilityRole="button"
          onPress={onToggleExpanded}
          style={({ pressed }) => [
            styles.cardActionButton,
            pressed && styles.checkboxPressed
          ]}
        >
          <Text style={styles.cardActionButtonText}>{registrationButtonLabel}</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeModal}
        transparent
        visible={expanded}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Cerrar registro"
            accessibilityRole="button"
            onPress={closeModal}
            style={styles.modalBackdrop}
          />
          <ScrollView
            alwaysBounceVertical={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalKicker}>Acción {actionNumber}</Text>
                  <Text style={styles.modalTitle}>Registro de avance</Text>
                  <Text style={styles.modalSubtitle}>{action.title}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar registro"
                  accessibilityRole="button"
                  onPress={closeModal}
                  style={({ pressed }) => [styles.modalCloseButton, pressed && styles.checkboxPressed]}
                >
                  <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                </Pressable>
              </View>

              <View style={styles.microActionHeader}>
                <Text style={styles.microActionTitle}>{evidencePrompt}</Text>
                <Text style={styles.microActionSubtitle}>
                  Al guardar, esta acción quedará como completada para este mes.
                </Text>
              </View>

              <View style={styles.microActionField}>
                <Text style={styles.microActionLabel}>{inputLabel}</Text>
                <TextInput
                  autoCorrect={evidenceConfig.type !== "amount"}
                  inputMode={evidenceConfig.type === "amount" ? "numeric" : "text"}
                  keyboardType={evidenceConfig.type === "amount" ? "numeric" : "default"}
                  maxLength={evidenceConfig.type === "amount" ? 16 : 90}
                  onChangeText={handleEvidenceChange}
                  placeholder={inputPlaceholder}
                  placeholderTextColor={colors.textSubtle}
                  returnKeyType="done"
                  style={styles.microActionInput}
                  value={inputValue}
                />
              </View>

              {evidenceText ? (
                <View style={styles.savedEvidenceBox}>
                  <Text style={styles.savedEvidenceLabel}>Último registro</Text>
                  <Text style={styles.savedEvidenceText}>{evidenceText}</Text>
                  {impactMessage ? (
                    <Text style={styles.savedEvidenceHint}>{impactMessage}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.microActionControls}>
                <Pressable
                  accessibilityLabel={`Guardar avance de ${action.title}`}
                  accessibilityRole="button"
                  disabled={!hasEvidence}
                  onPress={saveProgress}
                  style={({ pressed }) => [
                    styles.saveActionButton,
                    !hasEvidence && styles.actionButtonDisabled,
                    pressed && hasEvidence && styles.checkboxPressed
                  ]}
                >
                  <Check color={hasEvidence ? colors.surface : colors.textSubtle} size={17} strokeWidth={2.8} />
                  <Text
                    style={[
                      styles.saveActionButtonText,
                      !hasEvidence && styles.actionButtonDisabledText
                    ]}
                  >
                    Guardar avance
                  </Text>
                </Pressable>
              </View>

              {hasSavedProgress ? (
                <View style={styles.deleteArea}>
                  {confirmingDelete ? (
                    <View style={styles.deleteConfirmBox}>
                      <Text style={styles.deleteConfirmTitle}>¿Eliminar este registro?</Text>
                      <Text style={styles.deleteConfirmText}>
                        La acción volverá a pendiente y dejará de contar en tu progreso.
                      </Text>
                      <View style={styles.deleteConfirmActions}>
                        <Pressable
                          accessibilityLabel="Cancelar eliminación"
                          accessibilityRole="button"
                          onPress={() => setConfirmingDelete(false)}
                          style={({ pressed }) => [styles.deleteCancelButton, pressed && styles.checkboxPressed]}
                        >
                          <Text style={styles.deleteCancelButtonText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Eliminar registro de ${action.title}`}
                          accessibilityRole="button"
                          onPress={deleteProgress}
                          style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.checkboxPressed]}
                        >
                          <Text style={styles.deleteConfirmButtonText}>Eliminar registro</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityLabel={`Eliminar registro de ${action.title}`}
                      accessibilityRole="button"
                      onPress={() => setConfirmingDelete(true)}
                      style={({ pressed }) => [styles.deleteTextButton, pressed && styles.checkboxPressed]}
                    >
                      <Text style={styles.deleteTextButtonText}>Eliminar registro</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default function ActionPlanScreen() {
  const router = useRouter();
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const { completedActions, planSyncError, planSyncStatus, updateActionProgress } = usePlan();
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const goals = useMemo(() => getOnboardingGoals(onboarding), [onboarding]);
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(onboarding, metrics.snapshot.cashflow.suggestedMonthlyContribution, exactValues),
    [exactValues, metrics.snapshot.cashflow.suggestedMonthlyContribution, onboarding]
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const monthlyGoalContext = useMemo<MonthlyGoalContext>(
    () => ({
      title: primaryGoalAllocation?.goal.title ?? data.financialGoal,
      monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
      estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null
    }),
    [
      data.financialGoal,
      primaryGoalAllocation?.estimatedMonthsToGoal,
      primaryGoalAllocation?.goal.title,
      primaryGoalAllocation?.monthlyContribution
    ]
  );
  const suggestedActions = useMemo(
    () => getMonthlyActions(data, metrics, undefined, monthlyGoalContext),
    [data, metrics, monthlyGoalContext]
  );
  const suggestedPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, suggestedActions),
    [metrics, suggestedActions]
  );
  const activePlanProgressKey = useMemo(
    () => getActiveMonthlyPlanProgressKey(completedActions, suggestedPlanProgressKey),
    [completedActions, suggestedPlanProgressKey]
  );
  const activePlanPriorityKey = getMonthlyPlanPriorityKey(activePlanProgressKey);
  const actions = useMemo(
    () => getMonthlyActions(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const focus = useMemo(
    () => getMonthlyFocus(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const planProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, actions, activePlanPriorityKey ?? undefined),
    [activePlanPriorityKey, actions, metrics]
  );
  const completedCount = actions.filter((action) =>
    isMonthlyActionCompleted({
      actionId: action.id,
      completedActions,
      planProgressKey
    })
  ).length;
  const inProgressCount = actions.filter(
    (action) =>
      getMonthlyActionProgressStatus({
        actionId: action.id,
        completedActions,
        planProgressKey
      }) === "in_progress"
  ).length;
  const actionCount = actions.length;
  const progressPercentage = actionCount > 0 ? Math.round((completedCount / actionCount) * 100) : 0;
  const engagedCount = completedCount + inProgressCount;
  const fallbackContributionLabel =
    metrics.balancedScenarioAmount > 0
      ? `${formatCOP(metrics.balancedScenarioAmount)} aprox.`
      : "Por definir";
  const contributionLabel =
    activePlanPriorityKey === "advance_goal" && primaryGoalAllocation
      ? formatGoalContribution(primaryGoalAllocation.monthlyContribution)
      : fallbackContributionLabel;
  const contributionMetricLabel =
    activePlanPriorityKey === "advance_goal" ? "Aporte a meta" : "Aporte posible";
  const shouldShowGoalContributionSummary =
    activePlanPriorityKey !== "advance_goal" && primaryGoalAllocation !== null;
  const goalContributionSummaryLabel =
    goalPlan.allocations.length > 1 ? "Aporte meta principal" : "Aporte meta";
  const goalContributionSummaryValue = primaryGoalAllocation
    ? formatGoalContribution(primaryGoalAllocation.monthlyContribution)
    : "Por definir";
  const primaryGoalTitle = primaryGoalAllocation?.goal.title ?? data.financialGoal;
  const impactSummary = useMemo(
    () =>
      getMonthlyActionImpactSummary(completedActions, {
        periodKey: getMonthlyPlanPeriodKey()
      }),
    [completedActions]
  );
  const impactHeadline = getMonthlyImpactHeadline(impactSummary);
  const nextPlanHint = getNextPlanAdjustmentHint(impactSummary);
  const realContributionLabel =
    impactSummary.realContributionTotal > 0 ? formatCOP(impactSummary.realContributionTotal) : "$0";
  const persistGoals = (nextGoals: FinancialGoal[]) => {
    const hasPrimaryGoal = nextGoals.some((goal) => goal.isPrimary);
    const normalizedGoals = nextGoals.map((goal, index) => ({
      ...goal,
      isPrimary: hasPrimaryGoal ? goal.isPrimary : index === 0,
      updatedAt: new Date().toISOString()
    }));
    const primaryGoal = normalizedGoals.find((goal) => goal.isPrimary) ?? normalizedGoals[0] ?? null;

    updateOnboarding({
      goals: normalizedGoals,
      ...getLegacyFieldsFromGoal(primaryGoal)
    });
  };
  const syncGoalContributionFromPlan = (
    action: MonthlyAction,
    actionProgressId: string,
    patch: ActionProgressPatch
  ) => {
    if (action.id !== "set-goal-contribution" && action.id !== "redirect-small-expenses") {
      return;
    }

    const goalId = primaryGoalAllocation?.goal.id;

    if (!goalId) {
      return;
    }

    if (patch.status === "completed" && typeof patch.evidence?.amount === "number") {
      persistGoals(
        applyGoalContribution(goals, goalId, {
          amount: patch.evidence.amount,
          source: "monthly_plan",
          sourceProgressId: actionProgressId
        })
      );
      return;
    }

    if (patch.clearEvidence || patch.status === "pending" || patch.status === "skipped") {
      persistGoals(removeGoalContributionBySource(goals, goalId, actionProgressId));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Plan mensual</Text>
              <Text style={styles.subtitle}>
                Convierte tu diagnóstico en pasos concretos para este mes.
              </Text>
            </View>
          </View>

          <View style={styles.planHeroCard}>
            <View style={styles.planHeroIcon}>
              <ClipboardCheck color={colors.primary} size={34} strokeWidth={2.4} />
            </View>

            <View style={styles.planHeroBody}>
              <Text style={styles.kickerPrimary}>Enfoque del mes</Text>
              <Text style={styles.planHeroTitle}>{focus.title}</Text>
              <Text style={styles.text}>{focus.text}</Text>

              {primaryGoalTitle ? (
                <View style={styles.goalPill}>
                  <Target color={colors.primary} size={16} strokeWidth={2.4} />
                  <Text style={styles.goalPillText}>Meta principal: {primaryGoalTitle}</Text>
                </View>
              ) : null}

              <View style={styles.heroProgressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>
                    {completedCount} de {actionCount} acciones completadas
                  </Text>
                  <Text style={styles.progressPercent}>{progressPercentage}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: toPercentWidth(progressPercentage) }]} />
                </View>
                <Text style={styles.progressHelper}>
                  El avance queda guardado para este mes y ayuda a ajustar tus próximas acciones.
                </Text>
                {planSyncStatus === "saving" ? (
                  <Text style={styles.syncText}>Guardando avance...</Text>
                ) : null}
                {planSyncStatus === "error" && planSyncError ? (
                  <Text style={styles.syncErrorText}>{planSyncError}</Text>
                ) : null}
                {completedCount === actionCount ? (
                  <Text style={styles.completedMessage}>
                    Buen trabajo. Completaste tu primer plan mensual.
                  </Text>
                ) : null}
              </View>

              <View style={styles.trustPill}>
                <ShieldCheck color={colors.support} size={17} strokeWidth={2.4} />
                <Text style={styles.supportText}>
                  Puedes ajustar este plan a tu realidad. La idea es avanzar con pasos pequeños y
                  sostenibles.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryMetric
              icon={<CalendarCheck color={colors.primary} size={20} strokeWidth={2.4} />}
              label="Acciones con avance"
              value={`${engagedCount} de ${actionCount}`}
            />
            <SummaryMetric
              icon={<HandCoins color={colors.support} size={20} strokeWidth={2.4} />}
              label="Avance real"
              tone="support"
              value={realContributionLabel}
            />
            <SummaryMetric
              icon={<Wallet color={colors.primary} size={20} strokeWidth={2.4} />}
              label={contributionMetricLabel}
              value={contributionLabel}
            />
            {shouldShowGoalContributionSummary ? (
              <SummaryMetric
                icon={<PiggyBank color="#7C3AED" size={20} strokeWidth={2.4} />}
                label={goalContributionSummaryLabel}
                tone="purple"
                value={goalContributionSummaryValue}
              />
            ) : null}
          </View>

          <View style={styles.impactSummaryCard}>
            <View style={styles.impactSummaryHeader}>
              <View style={styles.impactSummaryIcon}>
                <ChartColumnIncreasing color={colors.primary} size={21} strokeWidth={2.4} />
              </View>
              <View style={styles.impactSummaryCopy}>
                <Text style={styles.impactSummaryTitle}>Qué entendió la app</Text>
                <Text style={styles.impactSummaryText}>{impactHeadline}</Text>
              </View>
            </View>
            <View style={styles.impactSignalGrid}>
              <View style={styles.impactSignalPill}>
                <Text style={styles.impactSignalLabel}>Aportes reales</Text>
                <Text style={styles.impactSignalValue}>{impactSummary.realContributions.length}</Text>
              </View>
              <View style={styles.impactSignalPill}>
                <Text style={styles.impactSignalLabel}>Compromisos</Text>
                <Text style={styles.impactSignalValue}>{impactSummary.limitCommitments.length}</Text>
              </View>
              <View style={styles.impactSignalPill}>
                <Text style={styles.impactSignalLabel}>Señales</Text>
                <Text style={styles.impactSignalValue}>
                  {impactSummary.insightSignals.length + impactSummary.dataSignals.length}
                </Text>
              </View>
            </View>
            <Text style={styles.impactSummaryHint}>{nextPlanHint}</Text>
          </View>

          <Text style={styles.helperText}>{getFinancialDataSourceLabel({ onboarding, exactValues })}</Text>

          <View style={styles.sectionIntro}>
            <View style={styles.sectionIntroTextGroup}>
              <Text style={styles.sectionTitleStandalone}>Acciones del mes</Text>
              <Text style={styles.sectionIntroText}>
                Una señal concreta por acción es suficiente.
              </Text>
            </View>
            <View style={styles.sectionIntroIcon}>
              <ChartColumnIncreasing color={colors.primary} size={22} strokeWidth={2.4} />
            </View>
          </View>

          <View style={styles.actionsList}>
            {actions.map((action, index) => {
              const actionProgressId = getMonthlyActionProgressId(planProgressKey, action.id);
              const actionProgress = completedActions[actionProgressId];
              const impactItem = getActionProgressImpactItem(actionProgressId, actionProgress);

              return (
                <ActionCard
                  key={actionProgressId}
                  action={action}
                  actionNumber={index + 1}
                  expanded={expandedActionId === actionProgressId}
                  impactItem={impactItem}
                  onProgressChange={(patch) => {
                    updateActionProgress(actionProgressId, patch);
                    syncGoalContributionFromPlan(action, actionProgressId, patch);
                  }}
                  onToggleExpanded={() =>
                    setExpandedActionId((currentActionId) =>
                      currentActionId === actionProgressId ? null : actionProgressId
                    )
                  }
                  progress={actionProgress}
                />
              );
            })}
          </View>

          <View style={styles.guidanceCard}>
            <View style={styles.guidanceIcon}>
              <PenLine color="#B77900" size={26} strokeWidth={2.4} />
            </View>
            <View style={styles.guidanceTextGroup}>
              <Text style={styles.guidanceTitle}>Cómo usar este plan</Text>
              <Text style={styles.text}>
                No tienes que hacerlo perfecto. Prueba acciones pequeñas, revisa qué funcionó y
                ajusta el próximo mes.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Ir a mi inicio"
              iconPosition="right"
              onPress={() => router.push("/dashboard")}
              title="Ir a mi inicio"
            />
            <PrimaryButton
              accessibilityLabel="Volver a simulación"
              icon={null}
              onPress={() => router.push("/simulation")}
              title="Volver a simulación"
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 760,
    width: "100%"
  },
  header: {
    paddingBottom: spacing.xs
  },
  headerText: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.display
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  planHeroCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    padding: spacing.lg
  },
  planHeroIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 118,
    justifyContent: "center",
    width: 118
  },
  planHeroBody: {
    flexBasis: 320,
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  kickerPrimary: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  planHeroTitle: {
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  goalPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  goalPillText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  heroProgressBlock: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.md
  },
  trustPill: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  supportText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  summaryMetric: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 96,
    padding: spacing.md
  },
  summaryMetricIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  summaryMetricIconSupport: {
    backgroundColor: colors.supportSoft
  },
  summaryMetricIconWarning: {
    backgroundColor: colors.warningSoft
  },
  summaryMetricIconPurple: {
    backgroundColor: "#F1E8FF"
  },
  summaryMetricText: {
    flex: 1,
    gap: spacing.xs
  },
  summaryMetricLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  summaryMetricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  actionsList: {
    gap: spacing.md
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  actionCardCompleted: {
    backgroundColor: "#FBFFFC",
    borderColor: "#B9E9CD"
  },
  actionTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  actionNumber: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  actionNumberText: {
    color: colors.primary,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  actionMainText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  actionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  actionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.textSubtle,
    borderRadius: radius.sm,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  checkboxCompleted: {
    backgroundColor: colors.support,
    borderColor: colors.support
  },
  checkboxPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  statusBadgeCompleted: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD"
  },
  statusBadgeInProgress: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF"
  },
  statusBadgeSkipped: {
    backgroundColor: "#EEF2F7",
    borderColor: colors.border
  },
  statusBadgeText: {
    color: "#9A5B20",
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  statusBadgeTextCompleted: {
    color: colors.support
  },
  actionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipSupport: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD"
  },
  chipWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  chipPurple: {
    backgroundColor: "#F1E8FF",
    borderColor: "#D8C7FF"
  },
  chipNeutral: {
    backgroundColor: "#EEF2F7",
    borderColor: colors.border
  },
  chipText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  chipTextSupport: {
    color: colors.support
  },
  chipTextWarning: {
    color: "#9A5B20"
  },
  chipTextPurple: {
    color: "#6D28D9"
  },
  chipTextNeutral: {
    color: colors.textSubtle
  },
  actionReference: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  actionReferenceLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionReferenceText: {
    color: colors.support,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionFooter: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
    paddingTop: spacing.sm
  },
  actionFooterTextGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 190
  },
  actionFooterLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionFooterHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  actionFooterImpact: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  cardActionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  cardActionButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    flex: 1
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  modalCard: {
    ...shadows.card,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 520,
    padding: spacing.lg,
    width: "100%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  modalHeaderText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  modalKicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  modalCloseButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  microActionHeader: {
    gap: spacing.xs
  },
  microActionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  microActionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  microActionField: {
    gap: spacing.xs
  },
  microActionLabel: {
    color: colors.textSubtle,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  microActionInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  savedEvidenceBox: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  savedEvidenceLabel: {
    color: colors.support,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  savedEvidenceText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  savedEvidenceHint: {
    color: colors.support,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  microActionControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  saveActionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  saveActionButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionButtonDisabled: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1"
  },
  actionButtonDisabledText: {
    color: colors.textSubtle
  },
  deleteArea: {
    alignItems: "flex-start",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm
  },
  deleteTextButton: {
    paddingVertical: spacing.xs
  },
  deleteTextButtonText: {
    color: "#B42318",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  deleteConfirmBox: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: "100%"
  },
  deleteConfirmTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  deleteConfirmText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  deleteConfirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end"
  },
  deleteCancelButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  deleteCancelButtonText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  deleteConfirmButton: {
    alignItems: "center",
    backgroundColor: "#B42318",
    borderColor: "#B42318",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  deleteConfirmButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  sectionIntro: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.sm
  },
  sectionIntroTextGroup: {
    flex: 1,
    gap: spacing.xs
  },
  sectionTitleStandalone: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  sectionIntroText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  sectionIntroIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  impactSummaryCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  impactSummaryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  impactSummaryIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  impactSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  impactSummaryTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  impactSummaryText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  impactSignalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  impactSignalPill: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  impactSignalLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  impactSignalValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  impactSummaryHint: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  progressText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  progressPercent: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  progressTrack: {
    backgroundColor: "#DDEAF8",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  progressHelper: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  syncText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  syncErrorText: {
    color: "#B42318",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  completedMessage: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  guidanceCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  guidanceIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  guidanceTextGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  guidanceTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
