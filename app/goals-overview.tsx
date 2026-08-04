import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Baby,
  Bot,
  Calendar,
  Car,
  ChartColumnIncreasing,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BriefcaseBusiness,
  CreditCard,
  Dumbbell,
  Flag,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  House,
  LineChart,
  Minus,
  PenLine,
  PiggyBank,
  PieChart,
  Plane,
  Plus,
  RotateCcw,
  Sparkles,
  Store,
  Target,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { FinancialEducationModal } from "../components/FinancialEducationModal";
import { FinancialEducationStory } from "../components/FinancialEducationStory";
import {
  AppModal,
  AppModalAction,
  AppModalActions
} from "../components/ui/AppModal";
import { MonthYearPickerField } from "../components/ui/MonthYearPickerField";
import { OptionalTag } from "../components/ui/OptionalTag";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  getGoalTypeFromTitle,
  getLegacyFieldsFromGoal,
  getOnboardingGoals,
  isActionProgressCompleted,
  normalizeFinancialGuidanceMode,
  type FinancialGoal
} from "../types/financial";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import { applyGoalContribution, getGoalContributionPeriodSummary } from "../utils/goalContributions";
import {
  formatGoalContribution,
  getAllocationProgress,
  getGoalPlanFromOnboarding,
  getGoalTypeLabel,
  isEmergencyGoal,
  type GoalAllocation,
  type GoalViability
} from "../utils/goalPlanning";
import {
  getGoalContributionLabelForActionId,
  isGoalContributionActionId
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
  type MonthlyGoalContext
} from "../utils/monthlyPlan";
import {
  getPlanPreferenceGoalBudget,
  resolvePlanPreference
} from "../utils/planPreference";

type Tone = "primary" | "support" | "warning" | "danger" | "neutral" | "purple";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

type GoalVisualOption = {
  title: string;
  iconKey: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
};

type PendingConfirmation = {
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  message: string;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
};

const contributionStep = 10000;
const goalVisualOptions: GoalVisualOption[] = [
  {
    title: "Organizar mis gastos",
    iconKey: "expenses",
    icon: Wallet,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Crear un fondo de emergencia",
    iconKey: "emergency",
    icon: PiggyBank,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Pagar deudas",
    iconKey: "debt",
    icon: CreditCard,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Ahorrar para vivienda",
    iconKey: "home",
    icon: House,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Ahorrar para estudiar",
    iconKey: "education",
    icon: GraduationCap,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "Ahorrar para viajar",
    iconKey: "travel",
    icon: Plane,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Empezar a invertir",
    iconKey: "investment",
    icon: ChartColumnIncreasing,
    color: "#F59E0B",
    backgroundColor: colors.warningSoft
  },
  {
    title: "Ahorrar para un negocio",
    iconKey: "business",
    icon: Store,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Prepararme para el futuro",
    iconKey: "future",
    icon: UserRound,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  },
  {
    title: "Otro",
    iconKey: "other",
    icon: Sparkles,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  }
];
const customGoalIconOptions: GoalVisualOption[] = [
  {
    title: "Salud",
    iconKey: "custom-health",
    icon: HeartPulse,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Vehículo",
    iconKey: "custom-vehicle",
    icon: Car,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Celebración",
    iconKey: "custom-gift",
    icon: Gift,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  },
  {
    title: "Carrera",
    iconKey: "custom-career",
    icon: BriefcaseBusiness,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Bienestar",
    iconKey: "custom-wellness",
    icon: Dumbbell,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "Familia",
    iconKey: "custom-family",
    icon: Baby,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  }
];
const allGoalVisualOptions = [...goalVisualOptions, ...customGoalIconOptions];
const goalPriorities = ["Baja", "Media", "Alta", "Muy alta"];

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getCurrencyInputValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? formatCOP(value) : "";
}

function getGoalVisual(goal: FinancialGoal) {
  return (
    allGoalVisualOptions.find((option) => option.iconKey === goal.iconKey) ??
    goalVisualOptions.find((option) => option.title === goal.title) ??
    goalVisualOptions[goalVisualOptions.length - 1]
  );
}

function getGoalOptionKey(goal: FinancialGoal) {
  const predefinedGoal = goalVisualOptions.find(
    (option) => option.title === goal.title && option.iconKey !== "other"
  );

  return predefinedGoal?.iconKey ?? "other";
}

function getParsedCurrencyInput(value: string) {
  return parseCOPInput(value);
}

function getMarginPercentage(amount: number | null | undefined, monthlyMargin: number | null) {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    monthlyMargin === null ||
    !Number.isFinite(monthlyMargin) ||
    monthlyMargin <= 0
  ) {
    return null;
  }

  return Math.round((amount / monthlyMargin) * 100);
}

function getBudgetMarginShortLabel(amount: number, monthlyMargin: number | null) {
  const percentage = getMarginPercentage(amount, monthlyMargin);

  return percentage === null ? null : `${percentage}% de tu margen`;
}

function getBudgetMarginTone(percentage: number | null): Tone {
  if (percentage === null) {
    return "neutral";
  }

  if (percentage > 100) {
    return "danger";
  }

  if (percentage >= 70) {
    return "warning";
  }

  if (percentage >= 20) {
    return "support";
  }

  return "neutral";
}

function getBudgetMarginFeedback({
  amount,
  isInputPreview,
  monthlyMargin
}: {
  amount: number | null;
  isInputPreview: boolean;
  monthlyMargin: number | null;
}) {
  if (monthlyMargin === null || !Number.isFinite(monthlyMargin) || monthlyMargin <= 0) {
    return {
      label: "Necesitamos ingresos y salidas mensuales para calcular qué porcentaje representa.",
      percentage: null
    };
  }

  const percentage = getMarginPercentage(amount, monthlyMargin);

  if (percentage === null) {
    return {
      label: "Escribe una bolsa para ver que porcentaje representa sobre tu margen mensual.",
      percentage: null
    };
  }

  const prefix = isInputPreview ? "Esta bolsa" : "La bolsa actual";
  const baseLabel = `${prefix} equivale al ${percentage}% de tu margen mensual estimado de ${formatCOP(monthlyMargin)}.`;

  if (percentage > 100) {
    return {
      label: `${baseLabel} Supera tu margen disponible.`,
      percentage
    };
  }

  if (percentage >= 70) {
    return {
      label: `${baseLabel} Revisa que no presione tus gastos esenciales.`,
      percentage
    };
  }

  return {
    label: baseLabel,
    percentage
  };
}

function getFormattedDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short"
  });
}

function getContributionPaceProgress(allocation: GoalAllocation) {
  if (allocation.viability === "completed") {
    return 100;
  }

  if (allocation.viability === "paused") {
    return 0;
  }

  if (
    allocation.requiredMonthlyContribution === null ||
    allocation.requiredMonthlyContribution <= 0
  ) {
    return allocation.monthlyContribution > 0 ? 100 : 0;
  }

  return Math.max(
    0,
    Math.min(
      (allocation.monthlyContribution / allocation.requiredMonthlyContribution) * 100,
      100
    )
  );
}

function getContributionPaceLabel(allocation: GoalAllocation) {
  if (allocation.viability === "completed") {
    return "Meta completada.";
  }

  if (allocation.viability === "paused") {
    return "Esta meta no recibe aporte mensual por ahora.";
  }

  if (
    allocation.requiredMonthlyContribution === null ||
    allocation.requiredMonthlyContribution <= 0
  ) {
    return allocation.monthlyContribution > 0
      ? "Aporte mensual definido, sin ritmo necesario calculado."
      : "Define objetivo y horizonte para calcular el ritmo mensual.";
  }

  const pacePercentage = Math.round(
    (allocation.monthlyContribution / allocation.requiredMonthlyContribution) * 100
  );
  const estimatedTimeDetail =
    allocation.estimatedMonthsToGoal !== null
      ? ` Con este aporte mensual tomaría ${allocation.estimatedMonthsToGoal} meses aprox.`
      : "";

  if (pacePercentage >= 100) {
    return `Cubre el aporte mensual necesario para cumplirlo en el tiempo deseado.${estimatedTimeDetail}`;
  }

  return `Cubre cerca del ${pacePercentage}% del aporte mensual necesario para cumplirlo en el tiempo deseado.${estimatedTimeDetail}`;
}

function getToneColors(tone: Tone) {
  if (tone === "support") {
    return {
      background: colors.supportSoft,
      border: "#B9E9CD",
      text: colors.support
    };
  }

  if (tone === "warning") {
    return {
      background: colors.warningSoft,
      border: "#FED7AA",
      text: "#B45309"
    };
  }

  if (tone === "danger") {
    return {
      background: "#FFF0F1",
      border: "#F7D0D4",
      text: "#C2410C"
    };
  }

  if (tone === "purple") {
    return {
      background: "#F1E8FF",
      border: "#D8C7FF",
      text: "#6D28D9"
    };
  }

  if (tone === "neutral") {
    return {
      background: "#EEF2F7",
      border: colors.border,
      text: colors.textSubtle
    };
  }

  return {
    background: colors.primarySoft,
    border: "#CFE0FF",
    text: colors.primary
  };
}

function getViabilityTone(viability: GoalViability): Tone {
  if (viability === "ready" || viability === "possible" || viability === "completed") {
    return "support";
  }

  if (viability === "stretched" || viability === "paused") {
    return "warning";
  }

  if (viability === "needs_adjustment") {
    return "danger";
  }

  return "neutral";
}

function Chip({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <Text style={[styles.chipText, { color: toneColors.text }]}>{label}</Text>
    </View>
  );
}

function IconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  tone = "primary"
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress: () => void;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabledButton
      ]}
    >
      {icon}
    </Pressable>
  );
}

function StatCard({
  helper,
  icon,
  label,
  value,
  tone = "primary"
}: {
  helper?: string | null;
  icon: ReactNode;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View style={[styles.statCard, { borderColor: toneColors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: toneColors.background }]}>{icon}</View>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: toneColors.text }]}>{value}</Text>
        {helper ? <Text style={styles.statHelper}>{helper}</Text> : null}
      </View>
    </View>
  );
}

function ChoicePill({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choicePill,
        selected && styles.choicePillSelected,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.choicePillText, selected && styles.choicePillTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomNavItem({
  title,
  route,
  icon: Icon,
  active,
  onNavigate
}: {
  title: string;
  route: Route;
  icon: ComponentType<IconProps>;
  active?: boolean;
  onNavigate: (route: Route) => void;
}) {
  const color = active ? colors.primary : colors.textSubtle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onNavigate(route)}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
    >
      {active ? <View style={styles.navActiveLine} /> : null}
      <Icon color={color} size={23} strokeWidth={2.4} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{title}</Text>
    </Pressable>
  );
}

function GoalOptionTile({
  option,
  selected,
  onPress
}: {
  option: GoalVisualOption;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = option.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.goalOptionTile,
        selected && styles.goalOptionTileSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.goalOptionIcon, { backgroundColor: option.backgroundColor }]}>
        <Icon color={option.color} size={22} strokeWidth={2.4} />
      </View>
      <Text style={[styles.goalOptionText, selected && styles.goalOptionTextSelected]}>
        {option.title}
      </Text>
    </Pressable>
  );
}

function GoalIconChoice({
  option,
  selected,
  onPress
}: {
  option: GoalVisualOption;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = option.icon;

  return (
    <Pressable
      accessibilityLabel={`Icono ${option.title}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.goalIconChoice,
        selected && styles.goalIconChoiceSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.goalOptionIcon, { backgroundColor: option.backgroundColor }]}>
        <Icon color={option.color} size={22} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

function CurrencyInputField({
  helper,
  label,
  onChangeText,
  optional = false,
  placeholder = "$0",
  value
}: {
  helper?: string;
  label: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {optional ? <OptionalTag /> : null}
      </View>
      {helper ? <Text style={styles.inputHelperText}>{helper}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        inputMode="numeric"
        keyboardType="numeric"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        returnKeyType="done"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function GoalCard({
  allocation,
  assignableSavingsAmount,
  canMarkPrimary,
  canDelete,
  onActivate,
  onAssignCurrentSavings,
  onComplete,
  onDecrease,
  onDelete,
  onIncrease,
  onRegisterContribution,
  onRequestConfirmation,
  onSetPrimary,
  onPause,
  onReset,
  onUpdateGoal,
  compact = false
}: {
  allocation: GoalAllocation;
  assignableSavingsAmount?: number | null;
  canMarkPrimary: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onAssignCurrentSavings?: () => void;
  onComplete: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onIncrease: () => void;
  onRegisterContribution: (amount: number) => void;
  onRequestConfirmation: (confirmation: PendingConfirmation) => void;
  onSetPrimary: () => void;
  onPause: () => void;
  onReset: () => void;
  onUpdateGoal: (updates: Partial<FinancialGoal>) => void;
  compact?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGoalOptionKey, setSelectedGoalOptionKey] = useState(getGoalOptionKey(allocation.goal));
  const [selectedIconKey, setSelectedIconKey] = useState(allocation.goal.iconKey ?? getGoalVisual(allocation.goal).iconKey);
  const [titleInput, setTitleInput] = useState(allocation.goal.title);
  const [targetInput, setTargetInput] = useState(
    getCurrencyInputValue(allocation.goal.targetAmount ?? allocation.targetAmount)
  );
  const [targetMonth, setTargetMonth] = useState<string | null>(
    allocation.goal.targetMonth ?? null
  );
  const [currentInput, setCurrentInput] = useState(
    getCurrencyInputValue(allocation.currentAmount)
  );
  const [contributionInput, setContributionInput] = useState("");
  const [reactivationMessage, setReactivationMessage] = useState<string | null>(null);
  const [excessContribution, setExcessContribution] = useState<{
    amount: number;
    remainingAmount: number;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(allocation.goal.priority ?? "");
  const viabilityTone = getViabilityTone(allocation.viability);
  const goalVisual = getGoalVisual(allocation.goal);
  const GoalIcon = goalVisual.icon;
  const progress = getAllocationProgress(allocation);
  const contributionPaceProgress = getContributionPaceProgress(allocation);
  const contributionPaceLabel = getContributionPaceLabel(allocation);
  const estimatedTime =
    allocation.estimatedMonthsToGoal !== null
      ? `${allocation.estimatedMonthsToGoal} meses aprox.`
      : "Por calcular";
  const targetLabel =
    allocation.targetAmount !== null
      ? `${formatCOP(allocation.targetAmount)} aprox.`
      : allocation.goal.amountRange ?? "Sin monto";
  const requiredLabel =
    allocation.requiredMonthlyContribution !== null
      ? `${formatCOP(allocation.requiredMonthlyContribution)} / mes`
      : "Sin referencia";
  const currentLabel = allocation.currentAmount > 0 ? formatCOP(allocation.currentAmount) : "$0";
  const progressLabel =
    allocation.progressPercentage !== null
      ? `${Math.round(allocation.progressPercentage)}%`
      : "Por medir";
  const remainingLabel =
    allocation.remainingAmount !== null
      ? `${formatCOP(allocation.remainingAmount)} restantes`
      : "Define un objetivo";
  const latestContribution = allocation.goal.contributions?.[0];
  const contributionCount = allocation.goal.contributions?.length ?? 0;
  const isPausedGoal = allocation.goal.status === "paused";
  const quickContribution =
    getParsedCurrencyInput(contributionInput) ??
    (isPausedGoal
      ? 0
      : allocation.monthlyContribution > 0
        ? allocation.monthlyContribution
        : contributionStep);
  const isCompletedGoal = allocation.goal.status === "completed";
  const remainingContributionAmount =
    allocation.remainingAmount !== null ? Math.max(0, allocation.remainingAmount) : null;
  const canAssignCurrentSavings =
    typeof assignableSavingsAmount === "number" &&
    assignableSavingsAmount > allocation.currentAmount &&
    !isCompletedGoal &&
    !isPausedGoal &&
    Boolean(onAssignCurrentSavings);
  const parsedEditorTargetAmount = getParsedCurrencyInput(targetInput);
  const hasValidEditorTargetMonth = targetMonth !== null;

  const resetEditorFields = () => {
    const nextGoalOptionKey = getGoalOptionKey(allocation.goal);
    const nextGoalVisual = getGoalVisual(allocation.goal);

    setSelectedGoalOptionKey(nextGoalOptionKey);
    setSelectedIconKey(allocation.goal.iconKey ?? nextGoalVisual.iconKey);
    setTitleInput(allocation.goal.title);
    setTargetInput(
      getCurrencyInputValue(allocation.goal.targetAmount ?? allocation.targetAmount)
    );
    setTargetMonth(allocation.goal.targetMonth ?? null);
    setCurrentInput(getCurrencyInputValue(allocation.currentAmount));
    setSelectedPriority(allocation.goal.priority ?? "");
  };

  useEffect(() => {
    resetEditorFields();
    setContributionInput("");
  }, [
    allocation.currentAmount,
    allocation.goal.iconKey,
    allocation.goal.priority,
    allocation.goal.targetMonth,
    allocation.goal.targetAmount,
    allocation.goal.title,
    allocation.targetAmount
  ]);

  useEffect(() => {
    setShowDetails(false);
  }, [allocation.goal.id]);

  const handleCurrencyInputChange = (
    value: string,
    setter: (nextValue: string) => void
  ) => {
    const parsedValue = getParsedCurrencyInput(value);
    setter(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const persistGoalDetails = ({
    currentAmount,
    goalUpdates,
    nextStatus
  }: {
    currentAmount: number;
    goalUpdates: Partial<FinancialGoal>;
    nextStatus: FinancialGoal["status"];
  }) => {
    onUpdateGoal(goalUpdates);

    if (
      allocation.goal.status === "completed" &&
      nextStatus === "completed" &&
      reactivationMessage !== null
    ) {
      setReactivationMessage(
        `Para reactivar esta meta, el monto objetivo debe ser mayor que el ahorro actual (${formatCOP(currentAmount)}).`
      );
      setIsEditing(true);
      return;
    }

    setReactivationMessage(null);
    setIsEditing(false);
  };

  const handleSaveDetails = () => {
    if (!hasValidEditorTargetMonth) {
      return;
    }

    const selectedOption =
      goalVisualOptions.find((option) => option.iconKey === selectedGoalOptionKey) ??
      goalVisualOptions[goalVisualOptions.length - 1];
    const isCustomGoal = selectedOption.iconKey === "other";
    const cleanTitle = isCustomGoal
      ? titleInput.trim() || allocation.goal.title
      : selectedOption.title;
    const nextIconKey = isCustomGoal
      ? selectedIconKey ?? customGoalIconOptions[0]?.iconKey ?? "other"
      : selectedOption.iconKey;
    const targetAmount = getParsedCurrencyInput(targetInput);
    const currentAmount = getParsedCurrencyInput(currentInput) ?? 0;
    const nextStatus =
      targetAmount !== null && currentAmount >= targetAmount
        ? "completed"
        : allocation.goal.status === "completed"
          ? "active"
          : allocation.goal.status;

    const goalUpdates: Partial<FinancialGoal> = {
      title: cleanTitle,
      iconKey: nextIconKey,
      type: getGoalTypeFromTitle(cleanTitle),
      priority: selectedPriority || null,
      targetAmount,
      targetMonth,
      currentAmount,
      ...(currentAmount <= 0 ? { contributions: [] } : {}),
      status: nextStatus
    };

    if (allocation.goal.status === "completed" && nextStatus === "active") {
      goalUpdates.manualMonthlyContribution = null;
    }

    const changesPrimaryGoalType =
      allocation.goal.isPrimary === true &&
      selectedGoalOptionKey !== getGoalOptionKey(allocation.goal);

    if (changesPrimaryGoalType) {
      setIsEditing(false);
      onRequestConfirmation({
        cancelLabel: "Volver",
        confirmLabel: "Cambiar meta",
        message: `Tu meta principal pasará de “${allocation.goal.title}” a “${cleanTitle}”. Esto puede cambiar cómo se recomienda distribuir tu bolsa mensual. No moveremos tus ahorros registrados.`,
        onCancel: () => setIsEditing(true),
        onConfirm: () =>
          persistGoalDetails({
            currentAmount,
            goalUpdates,
            nextStatus
          }),
        title: "¿Cambiar la meta principal?"
      });
      return;
    }

    persistGoalDetails({
      currentAmount,
      goalUpdates,
      nextStatus
    });
  };

  const handleRegisterContribution = () => {
    if (isPausedGoal || quickContribution <= 0) {
      return;
    }

    if (
      remainingContributionAmount !== null &&
      remainingContributionAmount > 0 &&
      quickContribution > remainingContributionAmount
    ) {
      setExcessContribution({
        amount: quickContribution,
        remainingAmount: remainingContributionAmount
      });
      return;
    }

    onRegisterContribution(quickContribution);
    setContributionInput("");
  };

  const openReactivationEditor = () => {
    resetEditorFields();
    setReactivationMessage(
      "Para reactivar esta meta, aumenta el monto objetivo por encima del ahorro actual o ajusta el ahorro guardado."
    );
    setIsEditing(true);
  };

  const openDetailsEditor = () => {
    resetEditorFields();
    setReactivationMessage(null);
    setIsEditing(true);
  };

  const closeDetailsEditor = () => {
    resetEditorFields();
    setReactivationMessage(null);
    setIsEditing(false);
  };

  const handlePauseGoal = () => {
    setShowDetails(false);
    onPause();
  };

  const registerRemainingContribution = () => {
    if (!excessContribution) {
      return;
    }

    onRegisterContribution(excessContribution.remainingAmount);
    setContributionInput("");
    setExcessContribution(null);
  };

  return (
    <View style={[styles.goalCard, compact && styles.cardPhone]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalHeaderIcon, { backgroundColor: goalVisual.backgroundColor }]}>
          <GoalIcon color={goalVisual.color} size={26} strokeWidth={2.4} />
        </View>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.goalTitle}>{allocation.goal.title}</Text>
          <View style={styles.chipRow}>
            {allocation.goal.isPrimary ? <Chip label="Principal" tone="primary" /> : null}
            <Chip label={getGoalTypeLabel(allocation.goal.type)} tone="purple" />
            <Chip label={allocation.viabilityLabel} tone={viabilityTone} />
          </View>
        </View>
        {canDelete ? (
          <IconButton
            accessibilityLabel={`Eliminar ${allocation.goal.title}`}
            icon={<Trash2 color="#C2410C" size={18} strokeWidth={2.4} />}
            onPress={onDelete}
            tone="danger"
          />
        ) : null}
      </View>

      <View style={styles.progressSummary}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>Progreso individual</Text>
            <Text style={styles.progressValue}>{progressLabel}</Text>
          </View>
          <Text style={styles.progressDetail}>{remainingLabel}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: toPercentWidth(progress) }]} />
        </View>
        <Text style={styles.helperText}>
          Guardado: {currentLabel} de {targetLabel}
        </Text>
      </View>

      {canAssignCurrentSavings ? (
        <View style={styles.assignSavingsBox}>
          <View style={styles.assignSavingsTextGroup}>
            <Text style={styles.contributionLabel}>Ahorros actuales sin asignar</Text>
            <Text style={styles.registerHint}>
              Puedes contar {formatCOP(assignableSavingsAmount ?? 0)} como avance de esta meta si ese dinero ya hace parte de tu fondo de emergencia.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onAssignCurrentSavings}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
          >
            <Text style={styles.smallActionText}>Asignar ahorros</Text>
          </Pressable>
        </View>
      ) : null}

      {!isCompletedGoal && !isPausedGoal ? (
        <View style={styles.registerBox}>
          <View style={styles.contributionHeader}>
            <View>
              <Text style={styles.contributionLabel}>Registrar aporte</Text>
              <Text style={styles.registerHint}>
                {latestContribution
                  ? `Último: ${formatCOP(latestContribution.amount)} el ${getFormattedDate(latestContribution.date)}`
                  : "Aún no registras aportes para esta meta."}
              </Text>
            </View>
            <Chip label={`${contributionCount} aportes`} tone={contributionCount > 0 ? "support" : "neutral"} />
          </View>
          <View style={styles.registerRow}>
            <CurrencyInputField
              label="Monto del aporte"
              onChangeText={(value) => handleCurrencyInputChange(value, setContributionInput)}
              placeholder={formatCOP(quickContribution)}
              value={contributionInput}
            />
            <Pressable
              accessibilityRole="button"
              onPress={handleRegisterContribution}
              style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]}
            >
              <CheckCircle2 color={colors.surface} size={18} strokeWidth={2.4} />
              <Text style={styles.registerButtonText}>Registrar</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>
            Registrar suma este monto al ahorro actual de la meta y recalcula el tiempo restante.
            No modifica el aporte mensual asignado.
          </Text>
        </View>
      ) : isPausedGoal ? (
        <View style={styles.pausedContributionBox}>
          <AlertCircle color="#B45309" size={19} strokeWidth={2.4} />
          <View style={styles.pausedContributionCopy}>
            <Text style={styles.pausedContributionTitle}>Meta pausada</Text>
            <Text style={styles.pausedContributionText}>
              Activa esta meta para registrar aportes o ajustar su aporte mensual.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onActivate}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
          >
            <Text style={styles.smallActionText}>Activar</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowDetails((current) => !current)}
        style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
      >
        <Text style={styles.detailsToggleText}>{showDetails ? "Ocultar detalles" : "Ver detalles"}</Text>
        {showDetails ? (
          <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
        ) : (
          <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
        )}
      </Pressable>

      {showDetails ? (
        <View style={styles.detailsPanel}>
          <View style={styles.goalMetaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Monto objetivo</Text>
              <Text style={styles.metaValue}>{targetLabel}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Fecha objetivo</Text>
              <Text style={styles.metaValue}>
                {allocation.goal.targetMonth
                  ? formatTargetMonth(allocation.goal.targetMonth)
                  : "No definida"}
              </Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Aporte necesario</Text>
              <Text style={styles.metaValue}>{requiredLabel}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Tiempo con aporte actual</Text>
              <Text style={styles.metaValue}>{estimatedTime}</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Tiempo estimado = monto restante ÷ aporte mensual, redondeado al mes siguiente.
          </Text>

          <View style={styles.contributionBox}>
            <View style={styles.contributionHeader}>
              <View>
                <Text style={styles.contributionLabel}>Aporte mensual asignado</Text>
                <Text style={styles.contributionValue}>
                  {formatGoalContribution(allocation.monthlyContribution)}
                </Text>
              </View>
              {!isPausedGoal ? (
                <Chip
                  label={allocation.contributionMode === "manual" ? "Manual" : "Recomendado"}
                  tone={allocation.contributionMode === "manual" ? "warning" : "support"}
                />
              ) : null}
            </View>

            <View style={styles.contributionAdjustInline}>
              {allocation.goal.status !== "paused" && !isCompletedGoal ? (
                <IconButton
                  accessibilityLabel={`Reducir aporte para ${allocation.goal.title}`}
                  disabled={allocation.monthlyContribution <= 0}
                  icon={<Minus color={colors.primary} size={18} strokeWidth={2.6} />}
                  onPress={onDecrease}
                />
              ) : null}
              <View style={styles.contributionProgressArea}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      styles.contributionProgressFill,
                      { width: toPercentWidth(contributionPaceProgress) }
                    ]}
                  />
                </View>
                <Text style={styles.helperText}>{contributionPaceLabel}</Text>
              </View>
              {allocation.goal.status !== "paused" && !isCompletedGoal ? (
                <IconButton
                  accessibilityLabel={`Aumentar aporte para ${allocation.goal.title}`}
                  icon={<Plus color={colors.primary} size={18} strokeWidth={2.6} />}
                  onPress={onIncrease}
                />
              ) : null}
            </View>

            {!isCompletedGoal ? (
              <View style={styles.adjustRow}>
                {allocation.goal.status === "paused" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onActivate}
                    style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.smallActionText}>Activar</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handlePauseGoal}
                    style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.smallActionText}>Pausar meta</Text>
                  </Pressable>
                )}
                {allocation.contributionMode === "manual" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onReset}
                    style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
                  >
                    <RotateCcw color={colors.primary} size={15} strokeWidth={2.4} />
                    <Text style={styles.smallActionText}>Recomendada</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.secondaryActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (isEditing) {
              closeDetailsEditor();
              return;
            }

            openDetailsEditor();
          }}
          style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
        >
          <PenLine color={colors.primary} size={15} strokeWidth={2.4} />
          <Text style={styles.smallActionText}>{isEditing ? "Cerrar edicion" : "Editar meta"}</Text>
        </Pressable>
        {canMarkPrimary ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSetPrimary}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
          >
            <Flag color={colors.primary} size={15} strokeWidth={2.4} />
            <Text style={styles.smallActionText}>Hacer principal</Text>
          </Pressable>
        ) : null}
        {allocation.goal.status !== "completed" ? (
          <Pressable
            accessibilityRole="button"
            onPress={onComplete}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
          >
            <CheckCircle2 color={colors.primary} size={15} strokeWidth={2.4} />
            <Text style={styles.smallActionText}>Completar</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={openReactivationEditor}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
          >
            <Text style={styles.smallActionText}>Reactivar</Text>
          </Pressable>
        )}
      </View>

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={closeDetailsEditor}
              variant="secondary"
            />
            <AppModalAction
              disabled={!hasValidEditorTargetMonth}
              icon={<CheckCircle2 color={colors.surface} size={19} strokeWidth={2.4} />}
              label="Guardar cambios"
              onPress={handleSaveDetails}
            />
          </AppModalActions>
        }
        icon={<Target color={colors.primary} size={23} strokeWidth={2.4} />}
        onClose={closeDetailsEditor}
        scrollable
        size="wide"
        subtitle={allocation.goal.title}
        title="Editar meta"
        visible={isEditing}
      >
              <View style={styles.editGroup}>
                <Text style={styles.inputLabel}>Tipo de meta</Text>
                <ScrollView
                  contentContainerStyle={styles.goalOptionSlider}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {goalVisualOptions.map((option) => (
                    <GoalOptionTile
                      key={option.iconKey}
                      onPress={() => {
                        setSelectedGoalOptionKey(option.iconKey);
                        if (option.iconKey !== "other") {
                          setTitleInput(option.title);
                          setSelectedIconKey(option.iconKey);
                          return;
                        }

                        if (!customGoalIconOptions.some((customOption) => customOption.iconKey === selectedIconKey)) {
                          setSelectedIconKey(customGoalIconOptions[0]?.iconKey ?? "other");
                        }
                      }}
                      option={option}
                      selected={selectedGoalOptionKey === option.iconKey}
                    />
                  ))}
                </ScrollView>
              </View>

              {selectedGoalOptionKey === "other" ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre de la meta</Text>
                    <TextInput
                      accessibilityLabel="Nombre de la meta"
                      onChangeText={setTitleInput}
                      placeholder="Ej. Salud, mudanza, computador"
                      placeholderTextColor={colors.textSubtle}
                      returnKeyType="done"
                      style={styles.input}
                      value={titleInput}
                    />
                  </View>
                  <View style={styles.editGroup}>
                    <Text style={styles.inputLabel}>Icono</Text>
                    <View style={styles.customIconGrid}>
                      {customGoalIconOptions.map((option) => (
                        <GoalIconChoice
                          key={option.iconKey}
                          onPress={() => setSelectedIconKey(option.iconKey)}
                          option={option}
                          selected={selectedIconKey === option.iconKey}
                        />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.inputGrid}>
                <CurrencyInputField
                  label="¿Cuánto quieres reunir?"
                  onChangeText={(value) => handleCurrencyInputChange(value, setTargetInput)}
                  value={targetInput}
                />
                <CurrencyInputField
                  label="Dinero ya separado para esta meta"
                  onChangeText={(value) => handleCurrencyInputChange(value, setCurrentInput)}
                  value={currentInput}
                />
              </View>
              <View style={styles.editGroup}>
                <MonthYearPickerField
                  helper="Puedes cambiar el mes sin modificar el dinero ya registrado."
                  label="¿Cuándo quieres alcanzarla?"
                  onChange={setTargetMonth}
                  value={targetMonth}
                />
              </View>
              {reactivationMessage ? (
                <View style={styles.editNotice}>
                  <AlertCircle color="#B45309" size={17} strokeWidth={2.4} />
                  <Text style={styles.editNoticeText}>{reactivationMessage}</Text>
                </View>
              ) : null}
              <View style={styles.editGroup}>
                <Text style={styles.inputLabel}>Prioridad frente a tus otras metas</Text>
                <View style={styles.choiceRow}>
                  {goalPriorities.map((priority) => (
                    <ChoicePill
                      key={priority}
                      label={priority}
                      onPress={() => setSelectedPriority(priority)}
                      selected={selectedPriority === priority}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.editSummary}>
                <View style={styles.editSummaryIcon}>
                  <Sparkles color={colors.support} size={18} strokeWidth={2.4} />
                </View>
                <View style={styles.editSummaryCopy}>
                  <Text style={styles.editSummaryTitle}>Qué pasará al guardar</Text>
                  <Text style={styles.editSummaryText}>
                    Recalcularemos el aporte recomendado y el tiempo estimado. Si
                    tienes varias metas, el tipo y la prioridad pueden cambiar cómo
                    se reparte la bolsa. No moveremos dinero.
                  </Text>
                </View>
              </View>
      </AppModal>
      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Editar monto"
              onPress={() => setExcessContribution(null)}
              variant="secondary"
            />
            <AppModalAction
              label="Aumentar objetivo"
              onPress={() => {
                setExcessContribution(null);
                setReactivationMessage(
                  "Aumenta el monto objetivo si quieres registrar un aporte mayor sin completar esta meta."
                );
                setIsEditing(true);
              }}
              variant="secondary"
            />
            <AppModalAction
              label={`Registrar ${
                excessContribution
                  ? formatCOP(excessContribution.remainingAmount)
                  : "$0"
              } y completar`}
              onPress={registerRemainingContribution}
            />
          </AppModalActions>
        }
        icon={<AlertCircle color="#B45309" size={23} strokeWidth={2.4} />}
        onClose={() => setExcessContribution(null)}
        title="Este aporte supera lo necesario"
        visible={excessContribution !== null}
      >
        <Text style={styles.confirmMessage}>
          Solo faltan{" "}
          {excessContribution
            ? formatCOP(excessContribution.remainingAmount)
            : "$0"}{" "}
          para completar esta meta. Escribiste{" "}
          {excessContribution ? formatCOP(excessContribution.amount) : "$0"}.
        </Text>
      </AppModal>
    </View>
  );
}

export default function GoalsOverviewScreen() {
  const router = useRouter();
  const { isPhone, screenPadding } = useResponsiveLayout();
  const navigate = (route: Route) => router.push(route);
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const guidanceMode = normalizeFinancialGuidanceMode(
    onboarding.financialGuidanceMode
  );
  const { completedActions, updateActionProgress } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const goals = useMemo(() => getOnboardingGoals(onboarding), [onboarding]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    getCurrencyInputValue(onboarding.goalMonthlyBudget)
  );
  const planPreference = useMemo(
    () => resolvePlanPreference({ exactValues, onboarding }),
    [exactValues, onboarding]
  );
  const preferredGoalId =
    planPreference.hasExplicitPreference &&
    planPreference.isApplicable &&
    planPreference.strategy === "prioritize_goal"
      ? planPreference.goalId
      : null;
  const preferredPlanPriorityKey =
    planPreference.hasExplicitPreference && planPreference.isApplicable
      ? planPreference.priorityKey
      : null;
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(
      onboarding,
      getPlanPreferenceGoalBudget({
        fallbackMonthlyBudget: metrics.snapshot.cashflow.suggestedMonthlyContribution,
        preference: planPreference
      }),
      exactValues,
      { preferredGoalId }
    ),
    [exactValues, metrics.snapshot.cashflow.suggestedMonthlyContribution, onboarding, planPreference, preferredGoalId]
  );
  const hasManualAdjustments = goalPlan.allocations.some(
    (allocation) => allocation.contributionMode === "manual"
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.id === preferredGoalId) ??
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
    () => getMonthlyActions(data, metrics, preferredPlanPriorityKey ?? undefined, monthlyGoalContext),
    [data, metrics, monthlyGoalContext, preferredPlanPriorityKey]
  );
  const suggestedPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, suggestedActions, preferredPlanPriorityKey ?? undefined),
    [metrics, preferredPlanPriorityKey, suggestedActions]
  );
  const activePlanProgressKey = useMemo(
    () => getActiveMonthlyPlanProgressKey(completedActions, suggestedPlanProgressKey),
    [completedActions, suggestedPlanProgressKey]
  );
  const activePlanPriorityKey =
    preferredPlanPriorityKey ?? getMonthlyPlanPriorityKey(activePlanProgressKey);
  const monthlyActions = useMemo(
    () => getMonthlyActions(data, metrics, activePlanPriorityKey ?? undefined, monthlyGoalContext),
    [activePlanPriorityKey, data, metrics, monthlyGoalContext]
  );
  const monthlyPlanProgressKey = useMemo(
    () => getMonthlyPlanProgressKey(metrics, monthlyActions, activePlanPriorityKey ?? undefined),
    [activePlanPriorityKey, monthlyActions, metrics]
  );
  const primaryGoalContributionAction =
    monthlyActions.find((action) => {
      if (!isGoalContributionActionId(action.id)) {
        return false;
      }

      return action.id !== "initial-emergency-contribution" || isEmergencyGoal(primaryGoalAllocation?.goal);
    }) ?? null;
  const primaryGoalContributionProgressId = primaryGoalContributionAction
    ? getMonthlyActionProgressId(monthlyPlanProgressKey, primaryGoalContributionAction.id)
    : null;
  const periodKey = getMonthlyPlanPeriodKey();
  const primaryGoalContributionThisMonthSummary = useMemo(
    () => getGoalContributionPeriodSummary(primaryGoalAllocation?.goal, periodKey),
    [periodKey, primaryGoalAllocation?.goal]
  );
  const primaryGoalContributionThisMonth =
    primaryGoalAllocation !== null
      ? Math.min(
          primaryGoalContributionThisMonthSummary.amount,
          Math.max(primaryGoalAllocation.currentAmount, 0)
        )
      : 0;
  const isCompletedAllocation = (allocation: GoalAllocation) =>
    allocation.viability === "completed" || allocation.goal.status === "completed";
  const isPausedAllocation = (allocation: GoalAllocation) =>
    allocation.goal.status === "paused";
  const activeGoalsCount = goalPlan.allocations.filter(
    (allocation) => !isCompletedAllocation(allocation) && !isPausedAllocation(allocation)
  ).length;
  const completedGoalsCount = goalPlan.allocations.filter(isCompletedAllocation).length;
  const pausedGoalsCount = goalPlan.allocations.filter(isPausedAllocation).length;
  const primaryGoalIsCompleted =
    primaryGoalAllocation !== null && isCompletedAllocation(primaryGoalAllocation);
  const nextActivePrimaryCandidate = goalPlan.allocations.find(
    (allocation) =>
      allocation.goal.id !== primaryGoalAllocation?.goal.id &&
      !isCompletedAllocation(allocation) &&
      !isPausedAllocation(allocation)
  );
  const totalInvestedInGoals = goalPlan.allocations.reduce(
    (total, allocation) => total + allocation.currentAmount,
    0
  );
  const investedInGoalsLabel =
    totalInvestedInGoals > 0 ? formatCOP(totalInvestedInGoals) : "$0";
  const monthlyMargin = metrics.snapshot.cashflow.monthlyMargin;
  const currentSavingsForEmergency = metrics.snapshot.values.currentSavings;
  const selectedReferenceMonthlyBudget = getPlanPreferenceGoalBudget({
    fallbackMonthlyBudget: metrics.snapshot.cashflow.suggestedMonthlyContribution,
    preference: planPreference
  });
  const budgetLabel =
    goalPlan.monthlyGoalBudget > 0
      ? `${formatCOP(goalPlan.monthlyGoalBudget)} aprox.`
      : "Por definir";
  const budgetMarginLabel = getBudgetMarginShortLabel(goalPlan.monthlyGoalBudget, monthlyMargin);
  const recommendedBudgetLabel =
    selectedReferenceMonthlyBudget > 0
      ? `${formatCOP(selectedReferenceMonthlyBudget)} aprox.`
      : "Por definir";
  const recommendedBudgetMarginLabel = getBudgetMarginShortLabel(
    selectedReferenceMonthlyBudget,
    monthlyMargin
  );
  const recommendedBudgetDetailLabel = recommendedBudgetMarginLabel
    ? `${recommendedBudgetLabel} (${recommendedBudgetMarginLabel})`
    : recommendedBudgetLabel;
  const parsedBudgetInput = getParsedCurrencyInput(budgetInput);
  const hasBudgetInput = budgetInput.trim().length > 0;
  const budgetMarginFeedback = getBudgetMarginFeedback({
    amount: hasBudgetInput ? parsedBudgetInput : goalPlan.monthlyGoalBudget,
    isInputPreview: hasBudgetInput,
    monthlyMargin
  });
  const budgetMarginFeedbackTone = getBudgetMarginTone(budgetMarginFeedback.percentage);
  const budgetMarginFeedbackColors = getToneColors(budgetMarginFeedbackTone);
  const remainingLabel = goalPlan.isOverBudget
    ? `${formatCOP(Math.abs(goalPlan.remainingBudget))} por encima`
    : goalPlan.remainingBudget > 0
      ? `${formatCOP(goalPlan.remainingBudget)} libres`
      : "Total asignado";
  const planReferenceOverrideNote =
    goalPlan.monthlyGoalBudgetMode === "manual"
      ? `Tu bolsa manual de ${formatCOP(goalPlan.monthlyGoalBudget)} tiene prioridad sobre esta referencia.`
      : hasManualAdjustments
        ? "Los aportes manuales definidos dentro de tus metas tienen prioridad sobre esta referencia."
        : null;

  useEffect(() => {
    setBudgetInput(getCurrencyInputValue(onboarding.goalMonthlyBudget));
  }, [onboarding.goalMonthlyBudget]);

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

  const updateGoalContribution = (goalId: string, delta: number) => {
    const allocation = goalPlan.allocations.find((currentAllocation) => currentAllocation.goal.id === goalId);
    const currentContribution = allocation?.monthlyContribution ?? 0;

    persistGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              manualMonthlyContribution: Math.max(0, currentContribution + delta)
            }
          : goal
      )
    );
  };

  const setGoalContribution = (goalId: string, value: number | null) => {
    persistGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              manualMonthlyContribution: value
            }
          : goal
      )
    );
  };

  const updateGoal = (goalId: string, updates: Partial<FinancialGoal>) => {
    persistGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              ...updates
            }
          : goal
      )
    );
  };

  const assignCurrentSavingsToGoal = (allocation: GoalAllocation, amount: number) => {
    const nextStatus =
      allocation.targetAmount !== null && amount >= allocation.targetAmount
        ? "completed"
        : "active";

    updateGoal(allocation.goal.id, {
      currentAmount: amount,
      status: nextStatus
    });
  };

  const registerGoalContribution = (goalId: string, amount: number) => {
    const shouldCompletePlanAction =
      goalId === primaryGoalAllocation?.goal.id &&
      primaryGoalContributionAction !== null &&
      primaryGoalContributionProgressId !== null &&
      !isActionProgressCompleted(completedActions[primaryGoalContributionProgressId]);
    const sourceProgressId = shouldCompletePlanAction ? primaryGoalContributionProgressId : null;

    persistGoals(
      applyGoalContribution(goals, goalId, {
        amount,
        source: "manual",
        sourceProgressId
      })
    );

    if (shouldCompletePlanAction && primaryGoalContributionProgressId) {
      updateActionProgress(primaryGoalContributionProgressId, {
        status: "completed",
        evidence: {
          type: "amount",
          label: getGoalContributionLabelForActionId(primaryGoalContributionAction.id),
          amount,
          detail: null
        }
      });
    }
  };

  const setPrimaryGoal = (goalId: string) => {
    persistGoals(
      goals.map((goal) => ({
        ...goal,
        isPrimary: goal.id === goalId
      }))
    );
  };

  const saveManualBudget = () => {
    const parsedBudget = getParsedCurrencyInput(budgetInput);

    updateOnboarding({
      goalMonthlyBudget: parsedBudget,
      goals
    });
  };

  const resetManualBudget = () => {
    updateOnboarding({
      goalMonthlyBudget: null,
      goals
    });
  };

  const removeGoal = (goalId: string) => {
    persistGoals(goals.filter((goal) => goal.id !== goalId));
  };

  const resetRecommendedDistribution = () => {
    persistGoals(goals.map((goal) => ({ ...goal, manualMonthlyContribution: null })));
  };

  const navigateToNewGoal = () => {
    router.push("/goals?mode=add");
  };

  const confirmGoalAction = (confirmation: PendingConfirmation) => {
    setPendingConfirmation(confirmation);
  };

  const closeConfirmation = () => {
    const cancelAction = pendingConfirmation?.onCancel;
    setPendingConfirmation(null);
    cancelAction?.();
  };

  const runPendingConfirmation = () => {
    const action = pendingConfirmation?.onConfirm;
    setPendingConfirmation(null);
    action?.();
  };

  const activateGoal = (allocation: GoalAllocation) => {
    updateGoal(allocation.goal.id, {
      manualMonthlyContribution: null,
      status: "active"
    });
  };

  const completeGoal = (goalId: string) => {
    updateGoal(goalId, {
      manualMonthlyContribution: 0,
      status: "completed"
    });
  };

  const confirmCompleteGoal = (allocation: GoalAllocation) => {
    confirmGoalAction({
      confirmLabel: "Completar",
      message:
        "La meta se marcará como completada, saldrá de la bolsa mensual y podrás reactivarla.",
      onConfirm: () => completeGoal(allocation.goal.id),
      title: `Completar ${allocation.goal.title}`
    });
  };

  const confirmRemoveGoal = (allocation: GoalAllocation) => {
    confirmGoalAction({
      confirmLabel: "Eliminar",
      destructive: true,
      message: "Esta meta se quitará de tu lista y la bolsa mensual se redistribuirá entre las metas restantes.",
      onConfirm: () => removeGoal(allocation.goal.id),
      title: `Eliminar ${allocation.goal.title}`
    });
  };

  const confirmSetPrimaryGoal = (allocation: GoalAllocation) => {
    confirmGoalAction({
      confirmLabel: "Hacer principal",
      message:
        "Dashboard, simulación y plan mensual se enfocarán en esta meta como prioridad principal.",
      onConfirm: () => setPrimaryGoal(allocation.goal.id),
      title: `Hacer principal ${allocation.goal.title}`
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.heroCard, isPhone && styles.cardPhone]}>
            <View style={styles.heroIcon}>
              <Target color={colors.primary} size={30} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>Mis metas</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<Wallet color={colors.primary} size={20} strokeWidth={2.4} />}
              helper={budgetMarginLabel}
              label="Bolsa mensual"
              value={budgetLabel}
              tone={goalPlan.monthlyGoalBudgetMode === "manual" ? "warning" : "primary"}
            />
            <StatCard
              icon={<Flag color={colors.support} size={20} strokeWidth={2.4} />}
              label="Metas activas"
              tone="support"
              value={activeGoalsCount.toString()}
            />
            <StatCard
              icon={<CheckCircle2 color={colors.support} size={20} strokeWidth={2.4} />}
              label="Completadas"
              tone="support"
              value={completedGoalsCount.toString()}
            />
            <StatCard
              icon={<Calendar color="#B45309" size={20} strokeWidth={2.4} />}
              label="Pausadas"
              tone="warning"
              value={pausedGoalsCount.toString()}
            />
            <StatCard
              icon={<ChartColumnIncreasing color="#7C3AED" size={20} strokeWidth={2.4} />}
              label="Invertido en metas"
              tone="purple"
              value={investedInGoalsLabel}
            />
            <StatCard
              icon={<PiggyBank color={colors.support} size={20} strokeWidth={2.4} />}
              label="Registrado este mes"
              tone="support"
              value={primaryGoalContributionThisMonth > 0 ? formatCOP(primaryGoalContributionThisMonth) : "$0"}
            />
          </View>

          {primaryGoalIsCompleted ? (
            <View style={styles.primaryCompletedCard}>
              <AlertCircle color="#B45309" size={22} strokeWidth={2.4} />
              <View style={styles.primaryCompletedCopy}>
                <Text style={styles.primaryCompletedTitle}>Tu meta principal está completada</Text>
                <Text style={styles.primaryCompletedText}>
                  Puedes mantenerla como referencia histórica o elegir otra meta activa para que
                  el dashboard, la simulación y el plan mensual se enfoquen en el siguiente objetivo.
                </Text>
                {nextActivePrimaryCandidate ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirmSetPrimaryGoal(nextActivePrimaryCandidate)}
                    style={({ pressed }) => [styles.primaryCompletedButton, pressed && styles.pressed]}
                  >
                    <Flag color={colors.primary} size={16} strokeWidth={2.4} />
                    <Text style={styles.primaryCompletedButtonText}>
                      Hacer principal: {nextActivePrimaryCandidate.goal.title}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {planPreference.hasExplicitPreference ? (
            <View
              style={[
                styles.planReferenceCard,
                !planPreference.isApplicable && styles.planReferenceCardWarning
              ]}
            >
              <View style={styles.planReferenceIcon}>
                <Sparkles color={colors.primary} size={20} strokeWidth={2.5} />
              </View>
              <View style={styles.planReferenceCopy}>
                <Text style={styles.planReferenceKicker}>
                  REFERENCIA ELEGIDA EN SIMULACIÓN
                </Text>
                <Text style={styles.planReferenceTitle}>{planPreference.label}</Text>
                <Text style={styles.planReferenceText}>
                  {planPreference.isApplicable
                    ? `${formatCOP(planPreference.monthlyReference)} al mes como referencia recalculada.`
                    : "Esta elección ya no puede aplicarse con los datos actuales; usamos la recomendación automática."}
                </Text>
                {planReferenceOverrideNote ? (
                  <Text style={styles.planReferenceOverride}>
                    {planReferenceOverrideNote}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.budgetCard,
              isPhone && styles.cardPhone,
              goalPlan.isOverBudget && styles.budgetCardWarning
            ]}
          >
            <View style={styles.budgetHeader}>
              <View>
                <Text style={styles.sectionKicker}>Bolsa para metas</Text>
                <Text style={styles.sectionTitle}>
                  {goalPlan.monthlyContributionTotal > 0
                    ? `${formatCOP(goalPlan.monthlyContributionTotal)} asignados`
                    : "Sin aporte asignado"}
                </Text>
              </View>
              <View style={styles.budgetHeaderActions}>
                <FinancialEducationModal
                  accessibilityLabel="Explicar la bolsa para metas"
                  guidanceMode={guidanceMode}
                  icon={<Wallet color={colors.primary} size={23} strokeWidth={2.4} />}
                  title="Cómo funciona tu bolsa para metas"
                >
                  <FinancialEducationStory
                    calculationItems={[
                      {
                        label: "Bolsa mensual",
                        value: budgetLabel
                      },
                      {
                        label: "Aportes asignados",
                        operator: "−",
                        value: formatCOP(goalPlan.monthlyContributionTotal)
                      },
                      {
                        emphasis: true,
                        label: goalPlan.isOverBudget ? "Exceso" : "Disponible",
                        operator: "=",
                        value: formatCOP(Math.abs(goalPlan.remainingBudget))
                      }
                    ]}
                    calculationTitle="Cómo se reparte tu bolsa"
                    definition="La bolsa para metas es el presupuesto mensual que puedes distribuir entre una o varias metas. Sale de la referencia activa de tu plan o del monto manual que definas."
                    estimateLabel={
                      goalPlan.monthlyGoalBudgetMode === "manual"
                        ? "Bolsa definida por ti"
                        : planPreference.hasExplicitPreference && planPreference.isApplicable
                          ? "Referencia elegida en simulación"
                          : "Bolsa recomendada desde tu margen"
                    }
                    guidanceMode={guidanceMode}
                    plainLanguage={
                      goalPlan.monthlyContributionTotal > 0
                        ? `Has repartido ${formatCOP(
                            goalPlan.monthlyContributionTotal
                          )} de una bolsa de ${formatCOP(
                            goalPlan.monthlyGoalBudget
                          )}. Lo disponible es presupuesto todavía sin asignar dentro del plan; no es saldo en tu cuenta y la app no mueve dinero.`
                        : `Tienes una referencia de ${formatCOP(
                            goalPlan.monthlyGoalBudget
                          )} para tus metas, pero todavía no has indicado cuánto irá a cada una. Esta referencia no es dinero en tu cuenta y la app no mueve dinero.`
                    }
                    plainLanguageBadge={
                      goalPlan.monthlyContributionTotal > 0 ? "✓" : "$0"
                    }
                    resultDescription={
                      goalPlan.isOverBudget
                        ? "Tus aportes asignados superan la bolsa mensual definida."
                        : goalPlan.monthlyContributionTotal > 0
                          ? "La cifra asignada es la suma de los aportes mensuales de tus metas."
                          : "Aún no has repartido tu bolsa mensual entre las metas."
                    }
                    resultLabel={
                      goalPlan.monthlyContributionTotal > 0
                        ? "Aportes mensuales asignados"
                        : "Sin aporte asignado"
                    }
                    resultValue={formatCOP(goalPlan.monthlyContributionTotal)}
                    tone={
                      goalPlan.isOverBudget
                        ? "critical"
                        : goalPlan.monthlyContributionTotal > 0
                          ? "positive"
                          : "neutral"
                    }
                  />
                </FinancialEducationModal>
                <Chip
                  label={remainingLabel}
                  tone={
                    goalPlan.isOverBudget
                      ? "danger"
                      : goalPlan.remainingBudget > 0
                        ? "support"
                        : "primary"
                  }
                />
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  goalPlan.isOverBudget && styles.progressFillWarning,
                  {
                    width: toPercentWidth(
                      goalPlan.monthlyGoalBudget > 0
                        ? (goalPlan.monthlyContributionTotal / goalPlan.monthlyGoalBudget) * 100
                        : 0
                    )
                  }
                ]}
              />
            </View>

            <View style={styles.budgetFooter}>
              <View style={styles.warningLine}>
                <AlertCircle
                  color={goalPlan.isOverBudget ? "#C2410C" : colors.textSubtle}
                  size={17}
                  strokeWidth={2.4}
                />
                <Text style={[styles.helperText, goalPlan.isOverBudget && styles.warningText]}>
                  {goalPlan.isOverBudget
                    ? "Tus aportes manuales superan la bolsa sugerida. Puedes reducir alguna meta o volver a la recomendacion."
                    : planPreference.hasExplicitPreference && planPreference.isApplicable
                      ? "La bolsa parte de la referencia que elegiste en Simulación. Puedes ajustar aportes sin cambiar tus respuestas financieras."
                      : "La bolsa se calcula desde tu margen mensual sugerido. Puedes ajustar aportes sin cambiar tus respuestas financieras."}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowBudgetSettings((current) => !current)}
                style={({ pressed }) => [styles.detailsToggle, styles.budgetToggle, pressed && styles.pressed]}
              >
                <Text style={styles.detailsToggleText}>
                  {showBudgetSettings ? "Ocultar ajuste de bolsa" : "Ajustar bolsa"}
                </Text>
                {showBudgetSettings ? (
                  <ChevronUp color={colors.primary} size={18} strokeWidth={2.5} />
                ) : (
                  <ChevronDown color={colors.primary} size={18} strokeWidth={2.5} />
                )}
              </Pressable>
              {showBudgetSettings ? (
                <>
              <View style={styles.budgetSettings}>
                <View style={styles.budgetSettingCopy}>
                  <Text style={styles.inputLabel}>Bolsa mensual manual</Text>
                  <Text style={styles.helperText}>
                    Recomendada actual: {recommendedBudgetDetailLabel}. Puedes fijar otra bolsa si prefieres decidir el monto.
                  </Text>
                </View>
                <View style={styles.budgetInputRow}>
                  <CurrencyInputField
                    label="Nueva bolsa"
                    onChangeText={(value) => {
                      const parsedValue = getParsedCurrencyInput(value);
                      setBudgetInput(parsedValue === null ? "" : formatCOP(parsedValue));
                    }}
                    placeholder={recommendedBudgetLabel}
                    value={budgetInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={saveManualBudget}
                    style={({ pressed }) => [styles.saveBudgetButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.saveBudgetButtonText}>Aplicar</Text>
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.budgetFeedback,
                    {
                      backgroundColor: budgetMarginFeedbackColors.background,
                      borderColor: budgetMarginFeedbackColors.border
                    }
                  ]}
                >
                  <AlertCircle color={budgetMarginFeedbackColors.text} size={16} strokeWidth={2.4} />
                  <Text style={[styles.budgetFeedbackText, { color: budgetMarginFeedbackColors.text }]}>
                    {budgetMarginFeedback.label}
                  </Text>
                </View>
                {goalPlan.monthlyGoalBudgetMode === "manual" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetManualBudget}
                    style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
                  >
                    <RotateCcw color={colors.primary} size={17} strokeWidth={2.4} />
                    <Text style={styles.resetButtonText}>Volver a bolsa recomendada</Text>
                  </Pressable>
                ) : null}
              </View>
              {hasManualAdjustments ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={resetRecommendedDistribution}
                  style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
                >
                  <RotateCcw color={colors.primary} size={17} strokeWidth={2.4} />
                  <Text style={styles.resetButtonText}>Usar recomendada</Text>
                </Pressable>
              ) : null}
                </>
              ) : null}
            </View>
          </View>

          <View style={[styles.quickCreateCard, isPhone && styles.cardPhone]}>
            <View style={styles.quickCreateCopy}>
              <Text style={styles.quickCreateTitle}>Agregar otra meta</Text>
              <Text style={styles.quickCreateText}>
                Crea otro objetivo y la app ajustará la bolsa mensual según su prioridad, horizonte y avance actual.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Crear nueva meta"
              accessibilityRole="button"
              onPress={navigateToNewGoal}
              style={({ pressed }) => [styles.quickCreateButton, pressed && styles.pressed]}
            >
              <Text style={styles.quickCreateButtonText}>Nueva meta</Text>
              <Plus color={colors.surface} size={21} strokeWidth={2.6} />
            </Pressable>
          </View>

          {goalPlan.allocations.length > 0 ? (
            <View style={styles.goalsList}>
              {goalPlan.allocations.map((allocation) => (
                <GoalCard
                  compact={isPhone}
                  key={allocation.goal.id}
                  allocation={allocation}
                  assignableSavingsAmount={
                    isEmergencyGoal(allocation.goal) ? currentSavingsForEmergency : null
                  }
                  canMarkPrimary={
                    allocation.goal.isPrimary !== true &&
                    allocation.goal.status !== "completed" &&
                    allocation.goal.status !== "paused" &&
                    allocation.viability !== "completed"
                  }
                  canDelete={goals.length > 1 && allocation.goal.isPrimary !== true}
                  onActivate={() => activateGoal(allocation)}
                  onAssignCurrentSavings={
                    currentSavingsForEmergency !== null
                      ? () => assignCurrentSavingsToGoal(allocation, currentSavingsForEmergency)
                      : undefined
                  }
                  onComplete={() => confirmCompleteGoal(allocation)}
                  onDecrease={() => updateGoalContribution(allocation.goal.id, -contributionStep)}
                  onDelete={() => confirmRemoveGoal(allocation)}
                  onIncrease={() => updateGoalContribution(allocation.goal.id, contributionStep)}
                  onPause={() =>
                    updateGoal(allocation.goal.id, {
                      manualMonthlyContribution: 0,
                      status: "paused"
                    })
                  }
                  onRegisterContribution={(amount) => registerGoalContribution(allocation.goal.id, amount)}
                  onRequestConfirmation={confirmGoalAction}
                  onReset={() => setGoalContribution(allocation.goal.id, null)}
                  onSetPrimary={() => confirmSetPrimaryGoal(allocation)}
                  onUpdateGoal={(updates) => updateGoal(allocation.goal.id, updates)}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, isPhone && styles.cardPhone]}>
              <Calendar color={colors.primary} size={28} strokeWidth={2.4} />
              <Text style={styles.emptyTitle}>Aún no tienes metas</Text>
              <Text style={styles.emptyText}>
                Crea una primera meta para calcular aportes sugeridos con tu margen mensual.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label={pendingConfirmation?.cancelLabel ?? "Cancelar"}
              onPress={closeConfirmation}
              variant="secondary"
            />
            <AppModalAction
              label={pendingConfirmation?.confirmLabel ?? "Confirmar"}
              onPress={runPendingConfirmation}
              variant={pendingConfirmation?.destructive ? "danger" : "primary"}
            />
          </AppModalActions>
        }
        icon={
          pendingConfirmation?.destructive ? (
            <Trash2 color="#DC2626" size={22} strokeWidth={2.4} />
          ) : (
            <CheckCircle2 color={colors.primary} size={22} strokeWidth={2.4} />
          )
        }
        onClose={closeConfirmation}
        size="compact"
        title={pendingConfirmation?.title ?? "Confirmar acción"}
        visible={pendingConfirmation !== null}
      >
        <Text style={styles.confirmMessage}>{pendingConfirmation?.message}</Text>
      </AppModal>

      <BottomNavigation activeRoute="/goals-overview" />
      <View style={styles.hidden}>
        <BottomNavItem icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
        <BottomNavItem icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
        <BottomNavItem active icon={Flag} onNavigate={navigate} route="/goals-overview" title="Metas" />
        <BottomNavItem icon={LineChart} onNavigate={navigate} route="/simulation" title="Simulación" />
        <BottomNavItem icon={Bot} onNavigate={navigate} route="/assistant" title="Asistente" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 760,
    width: "100%"
  },
  heroCard: {
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
  heroIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "31%",
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 74,
    minWidth: 170,
    padding: spacing.md
  },
  statIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  statCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  statValue: {
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  statHelper: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  primaryCompletedCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  primaryCompletedCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  primaryCompletedTitle: {
    color: "#B45309",
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  primaryCompletedText: {
    color: "#92400E",
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  primaryCompletedButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: "#FED7AA",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  primaryCompletedButtonText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  planReferenceCard: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  planReferenceCardWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  planReferenceIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  planReferenceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  planReferenceKicker: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.small
  },
  planReferenceTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  planReferenceText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  planReferenceOverride: {
    color: "#B45309",
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xs
  },
  goalOptionSlider: {
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  goalOptionTile: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 96,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: 116
  },
  goalOptionTileSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  goalIconChoice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  goalIconChoiceSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  goalOptionIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  goalOptionText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  goalOptionTextSelected: {
    color: colors.primary
  },
  budgetCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  budgetCardWarning: {
    borderColor: "#F7D0D4"
  },
  budgetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  budgetHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionKicker: {
    color: colors.textMuted,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge,
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  progressTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: radius.pill,
    height: 10,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  contributionProgressFill: {
    backgroundColor: colors.support
  },
  progressFillWarning: {
    backgroundColor: "#C2410C"
  },
  budgetFooter: {
    gap: spacing.sm
  },
  budgetToggle: {
    alignSelf: "flex-start"
  },
  budgetSettings: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  budgetSettingCopy: {
    gap: spacing.xs
  },
  budgetInputRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  budgetFeedback: {
    alignItems: "flex-start",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  budgetFeedbackText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  saveBudgetButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  saveBudgetButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  warningLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  helperText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  warningText: {
    color: "#C2410C",
    fontWeight: typography.weight.semibold
  },
  resetButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  resetButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  quickCreateCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    justifyContent: "space-between",
    padding: spacing.lg
  },
  quickCreateCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 230
  },
  quickCreateTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  quickCreateText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  quickCreateButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  quickCreateButtonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  goalsList: {
    gap: spacing.md
  },
  goalCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  cardPhone: {
    padding: spacing.md
  },
  goalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  goalHeaderIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  goalTitleBlock: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  goalTitle: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
  },
  progressSummary: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  progressHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  progressValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  progressDetail: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  chipText: {
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  detailsToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  detailsToggleText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  detailsPanel: {
    gap: spacing.md
  },
  goalMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaBox: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 3,
    minHeight: 68,
    minWidth: 150,
    padding: spacing.sm
  },
  metaLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  metaValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  contributionBox: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  registerBox: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  assignSavingsBox: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#BFDBFE",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md
  },
  assignSavingsTextGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 190
  },
  registerHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  registerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  registerButton: {
    alignItems: "center",
    backgroundColor: colors.support,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  registerButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  pausedContributionBox: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md
  },
  pausedContributionCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180
  },
  pausedContributionTitle: {
    color: "#92400E",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  pausedContributionText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  contributionAdjustInline: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  contributionProgressArea: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
    paddingTop: 14
  },
  contributionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  contributionLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  contributionValue: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  adjustRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  smallAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  smallActionText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  modalCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxHeight: "92%",
    maxWidth: 720,
    padding: spacing.lg,
    width: "100%"
  },
  modalCardPhone: {
    borderRadius: radius.md,
    padding: spacing.md
  },
  confirmCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 460,
    padding: spacing.lg,
    width: "100%"
  },
  confirmTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  confirmMessage: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end"
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: spacing.lg
  },
  confirmButtonSecondary: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: spacing.lg
  },
  confirmButtonSecondaryText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  confirmButtonDanger: {
    backgroundColor: "#C2410C"
  },
  confirmButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  modalScrollContent: {
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm
  },
  customIconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  inputGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180
  },
  inputHelperText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  inputErrorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  editGroup: {
    gap: spacing.sm
  },
  editNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm
  },
  editNoticeText: {
    color: "#92400E",
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  editSummary: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderColor: "#BFE8D0",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  editSummaryIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  editSummaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  editSummaryTitle: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  editSummaryText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  choicePill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  choicePillSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  choicePillText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  choicePillTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.black
  },
  saveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  emptyCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    textAlign: "center"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
  },
  bottomNav: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 760,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    width: "100%"
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minHeight: 68,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    position: "relative"
  },
  navActiveLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    position: "absolute",
    top: -spacing.xs,
    width: "100%"
  },
  navText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  navTextActive: {
    color: colors.primary
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  hidden: {
    display: "none"
  },
  disabledButton: {
    opacity: 0.45
  }
});
