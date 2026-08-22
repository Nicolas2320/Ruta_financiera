import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  CalendarCheck,
  ChartColumnIncreasing,
  Check,
  ClipboardCheck,
  CreditCard,
  HandCoins,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { FinancialDataStatusScreen } from "../components/FinancialDataStatusScreen";
import {
  AppModal,
  AppModalAction,
  AppModalActions
} from "../components/ui/AppModal";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  normalizeActionProgressRecord,
  type ActionProgressEvidence,
  type ActionProgressPatch,
  type ActionProgressStatus,
  type ActionProgressValue
} from "../types/financial";
import { formatCOP } from "../utils/financialRanges";
import { getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import {
  getActionImpactMessage,
  getActionProgressImpactItem,
  type MonthlyActionImpactItem
} from "../utils/actionProgressImpact";
import {
  getEffectiveMonthlyPlanProgress,
  isGoalContributionActionId,
  removeStoredGoalContributionActionsForPeriod
} from "../utils/monthlyPlanProgress";
import {
  getActiveMonthlyPlanProgressKey,
  getMonthlyActions,
  getMonthlyActionProgressId,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanPeriodKey,
  getMonthlyPlanPriorityKey,
  getMonthlyPlanProgressKey,
  type MonthlyAction,
  type MonthlyGoalContext
} from "../utils/monthlyPlan";
import {
  getPlanPreferenceGoalBudget,
  getPlanPreferenceGoalPlanOptions,
  getPlanPreferencePreferredGoalId,
  resolvePlanPreference
} from "../utils/planPreference";

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

  if (actionId === "register-debt-payments") {
    return { icon: CreditCard, color: "#F97316", backgroundColor: "#FFF1E7" };
  }

  if (actionId === "register-debts" || actionId === "compare-debt-strategies") {
    return { icon: Wallet, color: "#F97316", backgroundColor: "#FFF1E7" };
  }

  if (actionId === "confirm-monthly-income") {
    return { icon: Wallet, color: colors.support, backgroundColor: colors.supportSoft };
  }

  if (
    actionId === "confirm-monthly-expenses" ||
    actionId === "select-expense-categories" ||
    actionId === "enter-category-amounts"
  ) {
    return { icon: Search, color: "#B77900", backgroundColor: colors.warningSoft };
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
  options?: string[];
};

const amountEvidenceByActionId: Record<string, Omit<EvidenceConfig, "type">> = {
  "small-expense-limit": {
    title: "Define el límite mensual",
    prompt: "Escribe el límite que vas a probar para esta categoría.",
    placeholder: "",
    resultLabel: "Límite mensual definido"
  },
  "redirect-small-expenses": {
    title: "Registra lo redirigido",
    prompt: "Anota cuánto vas a mover desde gastos pequeños hacia tu meta.",
    placeholder: "",
    resultLabel: "Monto redirigido"
  },
  "set-goal-contribution": {
    title: "Registra el aporte",
    prompt: "Anota cuánto separaste o te comprometes a separar para tus metas.",
    placeholder: "",
    resultLabel: "Aporte a metas"
  }
};

const detailEvidenceByActionId: Record<string, Omit<EvidenceConfig, "type"> & { type?: EvidenceConfig["type"] }> = {
  "observe-small-expense-category": {
    title: "Elige una categoría",
    prompt: "Anota la categoría de gasto pequeño que observarás esta semana.",
    placeholder: "Ej. domicilios",
    resultLabel: "Categoría observada",
    type: "category"
  },
  "compare-goal-contribution": {
    title: "Registra la estrategia revisada",
    prompt: "¿Qué forma de repartir el dinero revisaste?",
    placeholder: "Selecciona una opción",
    resultLabel: "Estrategia revisada",
    type: "decision",
    options: ["Sin repartición", "Solo deudas", "Solo metas", "Deudas y metas"]
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
    placeholder: "Ej. ingreso exacto o gastos mensuales",
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

function getEvidenceInputLabel(config: EvidenceConfig) {
  if (config.type === "amount") {
    return "Monto";
  }

  if (config.options && config.options.length > 0) {
    return "Escenario";
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
  return config.placeholder || (config.type === "amount" ? "$0" : "Escribe un registro corto");
}

function getEvidencePrompt(config: EvidenceConfig) {
  return config.prompt || (config.type === "amount" ? "Ingresa un monto real o aproximado." : "Una frase corta es suficiente.");
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

function ActionCard({
  action,
  actionNumber,
  expanded,
  impactItem,
  onOpenDebts,
  onOpenExpenses,
  onOpenGoals,
  onOpenGoalsOverview,
  onOpenIncome,
  onOpenSimulation,
  onOpenSpendingCategories,
  onProgressChange,
  onToggleExpanded,
  progress,
  compact = false
}: {
  action: MonthlyAction;
  actionNumber: number;
  expanded: boolean;
  impactItem: MonthlyActionImpactItem | null;
  onOpenDebts: () => void;
  onOpenExpenses: () => void;
  onOpenGoals: () => void;
  onOpenGoalsOverview: () => void;
  onOpenIncome: () => void;
  onOpenSimulation: () => void;
  onOpenSpendingCategories: () => void;
  onProgressChange: (patch: ActionProgressPatch) => void;
  onToggleExpanded: () => void;
  progress: ActionProgressValue | undefined;
  compact?: boolean;
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
  const hasOptions = Boolean(evidenceConfig.options && evidenceConfig.options.length > 0);
  const isScenarioComparisonAction =
    action.id === "compare-goal-contribution" || action.id === "compare-debt-strategies";
  const isDebtDetailsAction =
    action.id === "register-debts" || action.id === "register-debt-payments";
  const isIncomeDetailsAction = action.id === "confirm-monthly-income";
  const isExpensesDetailsAction = action.id === "confirm-monthly-expenses";
  const isExpenseCategoriesAction =
    action.id === "select-expense-categories" || action.id === "enter-category-amounts";
  const isCreateEmergencyGoalAction = action.id === "create-emergency-goal";
  const isGoalContributionAction = isGoalContributionActionId(action.id);
  const hasSavedProgress = Boolean(
    progressRecord && (progressRecord.status !== "pending" || progressRecord.evidence)
  );
  const registrationButtonLabel = evidenceText
    ? "Editar registro"
    : isScenarioComparisonAction
      ? "Registrar acción"
      : "Registrar avance";
  const renderStatusBadge = () => (
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
          status === "completed" && styles.statusBadgeTextCompleted,
          status === "in_progress" && styles.statusBadgeTextInProgress,
          status === "skipped" && styles.statusBadgeTextSkipped
        ]}
      >
        {getStatusLabel(status)}
      </Text>
    </View>
  );
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
    <View
      style={[
        styles.actionCard,
        compact && styles.actionCardPhone,
        completed && styles.actionCardCompleted
      ]}
    >
      <View style={styles.actionTopRow}>
        <View style={styles.actionNumber}>
          <Text style={styles.actionNumberText}>{actionNumber}</Text>
        </View>
        <View style={[styles.actionIcon, { backgroundColor: visual.backgroundColor }]}>
          <Icon color={visual.color} size={25} strokeWidth={2.4} />
        </View>
        <View style={styles.actionMainText}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          {!compact ? <Text style={styles.actionDescription}>{action.description}</Text> : null}
        </View>
        {!compact ? renderStatusBadge() : null}
      </View>

      {compact ? (
        <View style={styles.actionMobileDetails}>
          {renderStatusBadge()}
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
      ) : null}

      <View style={styles.actionMetaRow}>
        <Chip label={action.category} tone={getCategoryTone(action.category)} />
        <Chip
          label={`Dificultad: ${action.difficulty}`}
          tone={action.difficulty === "Baja" ? "support" : "warning"}
        />
      </View>

      <View style={styles.actionReference}>
        <View style={styles.actionReferenceIcon}>
          <Sparkles color="#7C3AED" size={19} strokeWidth={2.5} />
        </View>
        <View style={styles.actionReferenceCopy}>
          <Text style={styles.actionReferenceLabel}>Guía</Text>
          <Text style={styles.actionReferenceText}>{action.estimatedImpact}</Text>
        </View>
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
        {isScenarioComparisonAction ? (
          <Pressable
            accessibilityLabel="Ver simulación"
            accessibilityRole="button"
            onPress={onOpenSimulation}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Ver simulación</Text>
          </Pressable>
        ) : null}
        {isDebtDetailsAction ? (
          <Pressable
            accessibilityLabel="Abrir mis deudas"
            accessibilityRole="button"
            onPress={onOpenDebts}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Ver mis deudas</Text>
          </Pressable>
        ) : null}
        {isIncomeDetailsAction ? (
          <Pressable
            accessibilityLabel="Ingresar cifra de ingresos mensuales"
            accessibilityRole="button"
            onPress={onOpenIncome}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Ingresar cifra</Text>
          </Pressable>
        ) : null}
        {isExpensesDetailsAction ? (
          <Pressable
            accessibilityLabel="Ingresar cifra de gastos mensuales"
            accessibilityRole="button"
            onPress={onOpenExpenses}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Ingresar cifra</Text>
          </Pressable>
        ) : null}
        {isExpenseCategoriesAction ? (
          <Pressable
            accessibilityLabel="Abrir categorías principales de gasto"
            accessibilityRole="button"
            onPress={onOpenSpendingCategories}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Ver categorías</Text>
          </Pressable>
        ) : null}
        {isCreateEmergencyGoalAction ? (
          <Pressable
            accessibilityLabel="Crear fondo de emergencia en Metas"
            accessibilityRole="button"
            onPress={onOpenGoals}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>Crear en Metas</Text>
          </Pressable>
        ) : null}
        {isGoalContributionAction ? (
          <Pressable
            accessibilityLabel={`Registrar aporte de ${action.title} en Metas`}
            accessibilityRole="button"
            onPress={onOpenGoalsOverview}
            style={({ pressed }) => [
              styles.cardActionButton,
              pressed && styles.checkboxPressed
            ]}
          >
            <Text style={styles.cardActionButtonText}>
              {completed ? "Ver en Metas" : "Registrar en Metas"}
            </Text>
          </Pressable>
        ) : !isScenarioComparisonAction &&
          !isDebtDetailsAction &&
          !isIncomeDetailsAction &&
          !isExpensesDetailsAction &&
          !isExpenseCategoriesAction &&
          !isCreateEmergencyGoalAction ? (
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
        ) : null}
      </View>

      <AppModal
        closeAccessibilityLabel="Cerrar registro de avance"
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={closeModal}
              variant="secondary"
            />
            <AppModalAction
              disabled={!hasEvidence}
              icon={
                <Check
                  color={hasEvidence ? colors.surface : colors.textSubtle}
                  size={18}
                  strokeWidth={2.8}
                />
              }
              label="Guardar avance"
              onPress={saveProgress}
            />
          </AppModalActions>
        }
        icon={<ClipboardCheck color={colors.primary} size={23} strokeWidth={2.4} />}
        onClose={closeModal}
        scrollable
        subtitle={action.title}
        title="Registro de avance"
        visible={expanded}
      >

        <View style={styles.microActionHero}>
          <View
            style={[
              styles.microActionPromptIcon,
              { backgroundColor: visual.backgroundColor }
            ]}
          >
            <Icon color={visual.color} size={24} strokeWidth={2.4} />
          </View>
          <View style={styles.microActionHeader}>
            <Text style={styles.microActionKicker}>TU DECISIÓN DE ESTE MES</Text>
            <Text style={styles.microActionTitle}>{evidencePrompt}</Text>
            <Text style={styles.microActionSubtitle}>
              Al guardarla, esta acción quedará completada para este mes.
            </Text>
          </View>
        </View>

        <View style={styles.microActionField}>
                <Text style={styles.microActionLabel}>{inputLabel}</Text>
                {hasOptions ? (
                  <View style={styles.optionGrid}>
                    {evidenceConfig.options?.map((option) => {
                      const selected = detailValue === option;

                      return (
                        <Pressable
                          accessibilityLabel={`Seleccionar escenario ${option}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          key={option}
                          onPress={() => setDetailText(option)}
                          style={({ pressed }) => [
                            styles.optionButton,
                            selected && styles.optionButtonSelected,
                            pressed && styles.checkboxPressed
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionButtonText,
                              selected && styles.optionButtonTextSelected
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
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
                )}
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
      </AppModal>
    </View>
  );
}

export default function ActionPlanScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const { exactValues, onboarding } = useOnboarding();
  const { completedActions, planSyncError, planSyncStatus, updateActionProgress } = usePlan();
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const periodKey = getMonthlyPlanPeriodKey();
  const planPreference = useMemo(
    () => resolvePlanPreference({ exactValues, onboarding }),
    [exactValues, onboarding]
  );
  const preferredGoalId = getPlanPreferencePreferredGoalId({
    onboarding,
    preference: planPreference
  });
  const preferredPlanPriorityKey =
    planPreference.hasExplicitPreference && planPreference.isApplicable
      ? planPreference.priorityKey
      : null;
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(
      onboarding,
      getPlanPreferenceGoalBudget({
        fallbackMonthlyBudget: metrics.snapshot.cashflow.suggestedMonthlyContribution,
        preference: planPreference,
        preferredGoalId
      }),
      exactValues,
      getPlanPreferenceGoalPlanOptions(planPreference, preferredGoalId)
    ),
    [exactValues, metrics.snapshot.cashflow.suggestedMonthlyContribution, onboarding, planPreference, preferredGoalId]
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.id === preferredGoalId) ??
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const activeGoalAllocations = goalPlan.allocations.filter(
    (allocation) =>
      allocation.goal.status !== "completed" && allocation.goal.status !== "paused"
  );
  const monthlyGoalContext = useMemo<MonthlyGoalContext>(
    () => ({
      activeGoalCount: activeGoalAllocations.length,
      title: primaryGoalAllocation?.goal.title ?? data.financialGoal,
      monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
      monthlyContributionTotal: goalPlan.monthlyContributionTotal,
      estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null,
      hasRegisteredContribution: activeGoalAllocations.some(
        (allocation) => allocation.currentAmount > 0
      )
    }),
    [
      activeGoalAllocations,
      data.financialGoal,
      goalPlan.monthlyContributionTotal,
      primaryGoalAllocation?.estimatedMonthsToGoal,
      primaryGoalAllocation?.goal.title,
      primaryGoalAllocation?.monthlyContribution
    ]
  );
  const completedActionsForPlanSelection = useMemo(
    () => removeStoredGoalContributionActionsForPeriod(completedActions, periodKey),
    [completedActions, periodKey]
  );
  const suggestedActions = useMemo(
    () => getMonthlyActions(data, metrics, preferredPlanPriorityKey ?? undefined, monthlyGoalContext),
    [data, metrics, monthlyGoalContext, preferredPlanPriorityKey]
  );
  const suggestedPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, suggestedActions, preferredPlanPriorityKey ?? undefined),
    [metrics, preferredPlanPriorityKey, suggestedActions]
  );
  const activePlanProgressKey = useMemo(
    () => getActiveMonthlyPlanProgressKey(completedActionsForPlanSelection, suggestedPlanProgressKey),
    [completedActionsForPlanSelection, suggestedPlanProgressKey]
  );
  const activePlanPriorityKey =
    preferredPlanPriorityKey ?? getMonthlyPlanPriorityKey(activePlanProgressKey);
  const actions = useMemo(
    () => getMonthlyActions(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const planProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, actions, activePlanPriorityKey ?? undefined),
    [activePlanPriorityKey, actions, metrics]
  );
  const monthlyPlanProgress = useMemo(
    () =>
      getEffectiveMonthlyPlanProgress({
        actions,
        completedActions: completedActionsForPlanSelection,
        debts: data.debts,
        goalAllocations: goalPlan.allocations,
        periodKey,
        planProgressKey,
        simulationPlanPreference: onboarding.simulationPlanPreference
      }),
    [
      actions,
      completedActionsForPlanSelection,
      data.debts,
      goalPlan.allocations,
      onboarding.simulationPlanPreference,
      periodKey,
      planProgressKey
    ]
  );
  const { completedCount, effectiveCompletedActions } = monthlyPlanProgress;
  const actionCount = actions.length;
  const progressPercentage = actionCount > 0 ? Math.round((completedCount / actionCount) * 100) : 0;
  const isPlanComplete = actionCount === 0 || completedCount === actionCount;
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.screenHeroCard, isPhone && styles.cardPhone]}>
            <View style={styles.screenHeroIcon}>
              <CalendarCheck color={colors.primary} size={28} strokeWidth={2.4} />
            </View>
            <View style={styles.screenHeroTextGroup}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>Plan mensual</Text>
            </View>
          </View>

          <View style={[styles.planProgressCard, isPhone && styles.cardPhone]}>
            <View style={styles.heroProgressBlock}>
              {actionCount > 0 ? (
                <>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressText}>
                      {completedCount} de {actionCount} acciones completadas
                    </Text>
                    <Text style={styles.progressPercent}>{progressPercentage}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: toPercentWidth(progressPercentage) }]}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.progressText}>¡Estás al día!</Text>
                  <Text style={styles.progressHelper}>
                    Tu plan está actualizado. Volveremos a evaluarlo cuando cambien tus datos o comience un nuevo mes.
                  </Text>
                </>
              )}
              {planSyncStatus === "saving" ? (
                <Text style={styles.syncText}>Guardando avance...</Text>
              ) : null}
              {planSyncStatus === "error" && planSyncError ? (
                <Text style={styles.syncErrorText}>{planSyncError}</Text>
              ) : null}
              {actionCount > 0 && completedCount === actionCount ? (
                <Text style={styles.completedMessage}>
                  ¡Buen trabajo! Completaste todas las acciones de este mes y tu plan está al día.
                </Text>
              ) : null}
            </View>

            <View style={styles.trustPill}>
              <ShieldCheck color={colors.support} size={17} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes ajustar este plan a tu realidad. Prueba acciones pequeñas, revisa qué funcionó
                y ajusta el próximo mes.
              </Text>
            </View>
          </View>

          <View style={styles.sectionIntro}>
            <View style={styles.sectionIntroTextGroup}>
              <Text style={styles.sectionTitleStandalone}>Acciones del mes</Text>
            </View>
            <View style={styles.sectionIntroIcon}>
              <ChartColumnIncreasing color={colors.primary} size={22} strokeWidth={2.4} />
            </View>
          </View>

          <View style={styles.actionsList}>
            {actions.length > 0 && !isPlanComplete ? (
              actions.map((action, index) => {
                const actionProgressId = getMonthlyActionProgressId(planProgressKey, action.id);
                const actionProgress = effectiveCompletedActions[actionProgressId];
                const impactItem = getActionProgressImpactItem(actionProgressId, actionProgress);

                return (
                  <ActionCard
                    compact={isPhone}
                    key={actionProgressId}
                    action={action}
                    actionNumber={index + 1}
                    expanded={expandedActionId === actionProgressId}
                    impactItem={impactItem}
                    onOpenDebts={() => router.push("/debts")}
                    onOpenExpenses={() =>
                      router.push({ pathname: "/expenses", params: { source: "action-plan" } })
                    }
                    onOpenGoals={() =>
                      router.push({
                        pathname: "/goals",
                        params: {
                          mode: "add",
                          suggestedTargetAmount:
                            metrics.snapshot.emergencyFund.targetThreeMonths === null
                              ? ""
                              : `${metrics.snapshot.emergencyFund.targetThreeMonths}`,
                          template: "emergency"
                        }
                      })
                    }
                    onOpenGoalsOverview={() => router.push("/goals-overview")}
                    onOpenIncome={() =>
                      router.push({ pathname: "/income", params: { source: "action-plan" } })
                    }
                    onOpenSimulation={() => router.push("/simulation")}
                    onOpenSpendingCategories={() =>
                      router.push({ pathname: "/spending", params: { focus: "categories" } })
                    }
                    onProgressChange={(patch) => updateActionProgress(actionProgressId, patch)}
                    onToggleExpanded={() =>
                      setExpandedActionId((currentActionId) =>
                        currentActionId === actionProgressId ? null : actionProgressId
                      )
                    }
                    progress={actionProgress}
                  />
                );
              })
            ) : (
              <View style={[styles.guidanceCard, isPhone && styles.cardPhone]}>
                <View style={styles.guidanceIcon}>
                  <CalendarCheck color={colors.primary} size={26} strokeWidth={2.4} />
                </View>
                <View style={styles.guidanceTextGroup}>
                  <Text style={styles.guidanceTitle}>¡Estás al día!</Text>
                  <Text style={styles.text}>
                    {actionCount > 0
                      ? "Completaste todas las acciones de este mes. ¡Buen trabajo!"
                      : "No tienes acciones pendientes. El motor mostrará el siguiente paso cuando sea necesario."}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Volver al dashboard"
              icon={null}
              onPress={() => router.replace("/dashboard")}
              style={styles.secondaryButton}
              title="Volver"
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
  screenHeroCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg
  },
  screenHeroIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  screenHeroTextGroup: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  titlePhone: {
    fontSize: typography.heroTitle,
    lineHeight: typography.lineHeight.heroTitle
  },
  cardPhone: {
    padding: spacing.md
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  planProgressCard: {
    ...shadows.card,
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
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
  actionCardPhone: {
    paddingHorizontal: spacing.sm
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
  actionMobileDetails: {
    alignItems: "flex-start",
    gap: spacing.sm
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
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
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
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  statusBadgeSkipped: {
    backgroundColor: "#EEF2F7",
    borderColor: colors.border
  },
  statusBadgeText: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  statusBadgeTextCompleted: {
    color: colors.support
  },
  statusBadgeTextInProgress: {
    color: "#B45309"
  },
  statusBadgeTextSkipped: {
    color: colors.textMuted
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
    alignItems: "flex-start",
    backgroundColor: "#F6F1FF",
    borderColor: "#D8C7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  actionReferenceIcon: {
    alignItems: "center",
    backgroundColor: "#E9DDFF",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actionReferenceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  actionReferenceLabel: {
    color: "#6D28D9",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionReferenceText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
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
    height: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    width: 180
  },
  cardActionButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  cardSecondaryActionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  cardSecondaryActionButtonText: {
    color: colors.primary,
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
    flex: 1,
    gap: spacing.xs
  },
  microActionHero: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  microActionPromptIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  microActionKicker: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    letterSpacing: 0.4,
    lineHeight: typography.lineHeight.badge
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
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 130,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  optionButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  optionButtonTextSelected: {
    color: colors.surface
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
    alignItems: "stretch",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm
  },
  deleteTextButton: {
    alignItems: "center",
    backgroundColor: "#B42318",
    borderColor: "#B42318",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  deleteTextButtonText: {
    color: colors.surface,
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
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  }
});
