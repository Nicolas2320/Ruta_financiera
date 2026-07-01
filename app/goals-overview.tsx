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
  Wallet,
  X
} from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { getMonthlyActionImpactSummary } from "../utils/actionProgressImpact";
import {
  getGoalTypeFromTitle,
  getLegacyFieldsFromGoal,
  getOnboardingGoals,
  type FinancialGoal
} from "../types/financial";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";
import {
  formatGoalContribution,
  getAllocationProgress,
  getGoalPlanFromOnboarding,
  getGoalTypeLabel,
  type GoalAllocation,
  type GoalViability
} from "../utils/goalPlanning";
import { getMonthlyPlanData, getMonthlyPlanMetrics, getMonthlyPlanPeriodKey } from "../utils/monthlyPlan";

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
  confirmLabel: string;
  destructive?: boolean;
  message: string;
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
    title: "Vehiculo",
    iconKey: "custom-vehicle",
    icon: Car,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Celebracion",
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
const goalHorizons = [
  "Menos de 6 meses",
  "6 - 12 meses",
  "1 - 3 anos",
  "3 - 5 anos",
  "Mas de 5 anos",
  "No estoy seguro"
];
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
      label: "Necesitamos ingresos y gastos para calcular que porcentaje representa.",
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

function isEmergencyGoal(allocation: GoalAllocation) {
  const normalizedTitle = allocation.goal.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    allocation.goal.type === "security" ||
    normalizedTitle.includes("emergencia") ||
    normalizedTitle.includes("imprevisto")
  );
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

  if (pacePercentage >= 100) {
    return "Cubre el aporte mensual necesario para este horizonte.";
  }

  return `Cubre cerca del ${pacePercentage}% del aporte mensual necesario.`;
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
  label,
  onChangeText,
  placeholder = "$0",
  value
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
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
  canMarkPrimary,
  canDelete,
  onActivate,
  onComplete,
  onDecrease,
  onDelete,
  onIncrease,
  onRegisterContribution,
  recordedPlanContribution,
  onSetPrimary,
  onPause,
  onReset,
  onUpdateGoal
}: {
  allocation: GoalAllocation;
  canMarkPrimary: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onComplete: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onIncrease: () => void;
  onRegisterContribution: (amount: number) => void;
  recordedPlanContribution: number;
  onSetPrimary: () => void;
  onPause: () => void;
  onReset: () => void;
  onUpdateGoal: (updates: Partial<FinancialGoal>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGoalOptionKey, setSelectedGoalOptionKey] = useState(getGoalOptionKey(allocation.goal));
  const [selectedIconKey, setSelectedIconKey] = useState(allocation.goal.iconKey ?? getGoalVisual(allocation.goal).iconKey);
  const [titleInput, setTitleInput] = useState(allocation.goal.title);
  const [targetInput, setTargetInput] = useState(
    getCurrencyInputValue(allocation.goal.targetAmount ?? allocation.targetAmount)
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
  const [selectedHorizon, setSelectedHorizon] = useState(allocation.goal.horizon ?? "");
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
  const observedCurrentAmount = allocation.currentAmount + recordedPlanContribution;
  const observedProgressPercentage =
    allocation.targetAmount !== null && allocation.targetAmount > 0
      ? Math.min((observedCurrentAmount / allocation.targetAmount) * 100, 100)
      : null;
  const observedProgressLabel =
    observedProgressPercentage !== null ? `${Math.round(observedProgressPercentage)}%` : "Por medir";
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
  const quickContribution =
    getParsedCurrencyInput(contributionInput) ??
    (allocation.monthlyContribution > 0 ? allocation.monthlyContribution : contributionStep);
  const isCompletedGoal = allocation.goal.status === "completed";
  const remainingContributionAmount =
    allocation.remainingAmount !== null ? Math.max(0, allocation.remainingAmount) : null;

  useEffect(() => {
    const nextGoalOptionKey = getGoalOptionKey(allocation.goal);
    const nextGoalVisual = getGoalVisual(allocation.goal);
    setSelectedGoalOptionKey(nextGoalOptionKey);
    setSelectedIconKey(allocation.goal.iconKey ?? nextGoalVisual.iconKey);
    setTitleInput(allocation.goal.title);
    setTargetInput(getCurrencyInputValue(allocation.goal.targetAmount ?? allocation.targetAmount));
    setCurrentInput(getCurrencyInputValue(allocation.currentAmount));
    setContributionInput("");
    setSelectedHorizon(allocation.goal.horizon ?? "");
    setSelectedPriority(allocation.goal.priority ?? "");
  }, [
    allocation.currentAmount,
    allocation.goal.horizon,
    allocation.goal.iconKey,
    allocation.goal.priority,
    allocation.goal.targetAmount,
    allocation.goal.title,
    allocation.targetAmount
  ]);

  const handleCurrencyInputChange = (
    value: string,
    setter: (nextValue: string) => void
  ) => {
    const parsedValue = getParsedCurrencyInput(value);
    setter(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleSaveDetails = () => {
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

    onUpdateGoal({
      title: cleanTitle,
      iconKey: nextIconKey,
      type: getGoalTypeFromTitle(cleanTitle),
      horizon: selectedHorizon || null,
      priority: selectedPriority || null,
      targetAmount,
      currentAmount,
      status: nextStatus
    });

    if (
      allocation.goal.status === "completed" &&
      nextStatus === "completed" &&
      reactivationMessage !== null
    ) {
      setReactivationMessage(
        `Para reactivar esta meta, el monto objetivo debe ser mayor que el ahorro actual (${formatCOP(currentAmount)}).`
      );
      return;
    }

    setReactivationMessage(null);
    setIsEditing(false);
  };

  const handleRegisterContribution = () => {
    if (quickContribution <= 0) {
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
    setReactivationMessage(
      "Para reactivar esta meta, aumenta el monto objetivo por encima del ahorro actual o ajusta el ahorro guardado."
    );
    setIsEditing(true);
  };

  const openDetailsEditor = () => {
    setReactivationMessage(null);
    setIsEditing(true);
  };

  const closeDetailsEditor = () => {
    setReactivationMessage(null);
    setIsEditing(false);
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
    <View style={styles.goalCard}>
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

      {recordedPlanContribution > 0 ? (
        <View style={styles.planContributionBox}>
          <View style={styles.planContributionHeader}>
            <Text style={styles.planContributionLabel}>Registro del plan mensual</Text>
            <Chip label="Vista del mes" tone="support" />
          </View>
          <Text style={styles.planContributionValue}>
            {formatCOP(recordedPlanContribution)} sumados como avance observado
          </Text>
          <Text style={styles.planContributionText}>
            Con este registro: {formatCOP(observedCurrentAmount)} de {targetLabel} ({observedProgressLabel}).
            Para hacerlo permanente, registra el aporte directamente en esta meta.
          </Text>
        </View>
      ) : null}

      <View style={styles.goalMetaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Objetivo</Text>
          <Text style={styles.metaValue}>{targetLabel}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Horizonte</Text>
          <Text style={styles.metaValue}>{allocation.goal.horizon ?? "No definido"}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Necesario</Text>
          <Text style={styles.metaValue}>{requiredLabel}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Tiempo</Text>
          <Text style={styles.metaValue}>{estimatedTime}</Text>
        </View>
      </View>

      {!isCompletedGoal ? (
        <View style={styles.registerBox}>
          <View style={styles.contributionHeader}>
            <View>
              <Text style={styles.contributionLabel}>Registrar aporte</Text>
              <Text style={styles.registerHint}>
                {latestContribution
                  ? `Ultimo: ${formatCOP(latestContribution.amount)} el ${getFormattedDate(latestContribution.date)}`
                  : "Aun no registras aportes para esta meta."}
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
        </View>
      ) : null}

      <View style={styles.contributionBox}>
        <View style={styles.contributionHeader}>
          <View>
            <Text style={styles.contributionLabel}>Aporte mensual asignado</Text>
            <Text style={styles.contributionValue}>
              {formatGoalContribution(allocation.monthlyContribution)}
            </Text>
          </View>
          <Chip
            label={allocation.contributionMode === "manual" ? "Manual" : "Recomendado"}
            tone={allocation.contributionMode === "manual" ? "warning" : "support"}
          />
        </View>

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

        {!isCompletedGoal ? (
          <View style={styles.adjustRow}>
            <IconButton
              accessibilityLabel={`Reducir aporte para ${allocation.goal.title}`}
              disabled={allocation.monthlyContribution <= 0}
              icon={<Minus color={colors.primary} size={18} strokeWidth={2.6} />}
              onPress={onDecrease}
            />
            <IconButton
              accessibilityLabel={`Aumentar aporte para ${allocation.goal.title}`}
              icon={<Plus color={colors.primary} size={18} strokeWidth={2.6} />}
              onPress={onIncrease}
            />
            <Pressable
              accessibilityRole="button"
              onPress={onPause}
              style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
            >
              <Text style={styles.smallActionText}>Pausar</Text>
            </Pressable>
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
            {allocation.goal.status === "paused" ? (
              <Pressable
                accessibilityRole="button"
                onPress={onActivate}
                style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
              >
                <Text style={styles.smallActionText}>Activar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

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

      <Modal
        animationType="fade"
        onRequestClose={closeDetailsEditor}
        transparent
        visible={isEditing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar meta</Text>
                <Text style={styles.modalSubtitle}>
                  Ajusta el tipo, icono y datos principales de esta meta.
                </Text>
              </View>
              <IconButton
                accessibilityLabel="Cerrar edición"
                icon={<X color={colors.primary} size={18} strokeWidth={2.6} />}
                onPress={closeDetailsEditor}
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
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
                  label="Monto objetivo"
                  onChangeText={(value) => handleCurrencyInputChange(value, setTargetInput)}
                  value={targetInput}
                />
                <CurrencyInputField
                  label="Ahorro actual"
                  onChangeText={(value) => handleCurrencyInputChange(value, setCurrentInput)}
                  value={currentInput}
                />
              </View>
              {reactivationMessage ? (
                <View style={styles.editNotice}>
                  <AlertCircle color="#B45309" size={17} strokeWidth={2.4} />
                  <Text style={styles.editNoticeText}>{reactivationMessage}</Text>
                </View>
              ) : null}
              <View style={styles.editGroup}>
                <Text style={styles.inputLabel}>Horizonte</Text>
                <View style={styles.choiceRow}>
                  {goalHorizons.map((horizon) => (
                    <ChoicePill
                      key={horizon}
                      label={horizon}
                      onPress={() => setSelectedHorizon(horizon)}
                      selected={selectedHorizon === horizon}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.editGroup}>
                <Text style={styles.inputLabel}>Importancia</Text>
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
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveDetails}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                <CheckCircle2 color={colors.surface} size={18} strokeWidth={2.4} />
                <Text style={styles.saveButtonText}>Guardar cambios</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={closeDetailsEditor}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setExcessContribution(null)}
        transparent
        visible={excessContribution !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Este aporte supera lo necesario</Text>
            <Text style={styles.confirmMessage}>
              Solo faltan {excessContribution ? formatCOP(excessContribution.remainingAmount) : "$0"} para completar
              esta meta. Escribiste {excessContribution ? formatCOP(excessContribution.amount) : "$0"}.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExcessContribution(null)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Editar monto</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setExcessContribution(null);
                  setReactivationMessage(
                    "Aumenta el monto objetivo si quieres registrar un aporte mayor sin completar esta meta."
                  );
                  setIsEditing(true);
                }}
                style={({ pressed }) => [styles.confirmButtonSecondary, pressed && styles.pressed]}
              >
                <Text style={styles.confirmButtonSecondaryText}>Aumentar objetivo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={registerRemainingContribution}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
              >
                <Text style={styles.confirmButtonText}>
                  Registrar {excessContribution ? formatCOP(excessContribution.remainingAmount) : "$0"} y completar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function GoalsOverviewScreen() {
  const router = useRouter();
  const navigate = (route: Route) => router.push(route);
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const { completedActions } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data, exactValues), [data, exactValues]);
  const goals = useMemo(() => getOnboardingGoals(onboarding), [onboarding]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [budgetInput, setBudgetInput] = useState(
    getCurrencyInputValue(onboarding.goalMonthlyBudget)
  );
  const goalPlan = useMemo(
    () => getGoalPlanFromOnboarding(onboarding, metrics.snapshot.cashflow.suggestedMonthlyContribution, exactValues),
    [exactValues, metrics.snapshot.cashflow.suggestedMonthlyContribution, onboarding]
  );
  const hasManualAdjustments = goalPlan.allocations.some(
    (allocation) => allocation.contributionMode === "manual"
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const impactSummary = useMemo(
    () =>
      getMonthlyActionImpactSummary(completedActions, {
        periodKey: getMonthlyPlanPeriodKey()
      }),
    [completedActions]
  );
  const primaryGoalPlanContribution =
    primaryGoalAllocation !== null
      ? impactSummary.goalContributionTotal +
        (isEmergencyGoal(primaryGoalAllocation) ? impactSummary.emergencyContributionTotal : 0)
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
  const budgetLabel =
    goalPlan.monthlyGoalBudget > 0
      ? `${formatCOP(goalPlan.monthlyGoalBudget)} aprox.`
      : "Por definir";
  const budgetMarginLabel = getBudgetMarginShortLabel(goalPlan.monthlyGoalBudget, monthlyMargin);
  const recommendedBudgetLabel =
    metrics.snapshot.cashflow.suggestedMonthlyContribution > 0
      ? `${formatCOP(metrics.snapshot.cashflow.suggestedMonthlyContribution)} aprox.`
      : "Por definir";
  const recommendedBudgetMarginLabel = getBudgetMarginShortLabel(
    metrics.snapshot.cashflow.suggestedMonthlyContribution,
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

  const registerGoalContribution = (goalId: string, amount: number) => {
    persistGoals(
      goals.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }

        const currentBeforeContribution = Math.max(0, goal.currentAmount ?? 0);
        const remainingAmount =
          goal.targetAmount !== null && goal.targetAmount !== undefined
            ? Math.max(goal.targetAmount - currentBeforeContribution, 0)
            : null;
        const appliedAmount =
          remainingAmount !== null && remainingAmount > 0
            ? Math.min(amount, remainingAmount)
            : remainingAmount === 0
              ? 0
              : amount;
        if (appliedAmount <= 0) {
          return goal;
        }

        const currentAmount = currentBeforeContribution + appliedAmount;
        const contributions = [
          {
            id: `contribution-${Date.now()}`,
            amount: appliedAmount,
            date: new Date().toISOString()
          },
          ...(goal.contributions ?? [])
        ];
        const status =
          goal.targetAmount !== null &&
          goal.targetAmount !== undefined &&
          currentAmount >= goal.targetAmount
            ? "completed"
            : "active";

        return {
          ...goal,
          currentAmount,
          contributions,
          manualMonthlyContribution:
            status === "completed" ? 0 : goal.manualMonthlyContribution,
          status
        };
      })
    );
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
    setPendingConfirmation(null);
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
        "La meta se marcara como completada, saldra de la bolsa mensual y podras reactivarla.",
      onConfirm: () => completeGoal(allocation.goal.id),
      title: `Completar ${allocation.goal.title}`
    });
  };

  const confirmRemoveGoal = (allocation: GoalAllocation) => {
    confirmGoalAction({
      confirmLabel: "Eliminar",
      destructive: true,
      message: "Esta meta se quitara de tu lista y la bolsa mensual se redistribuira entre las metas restantes.",
      onConfirm: () => removeGoal(allocation.goal.id),
      title: `Eliminar ${allocation.goal.title}`
    });
  };

  const confirmSetPrimaryGoal = (allocation: GoalAllocation) => {
    confirmGoalAction({
      confirmLabel: "Hacer principal",
      message:
        "Dashboard, simulacion y plan mensual se enfocaran en esta meta como prioridad principal.",
      onConfirm: () => setPrimaryGoal(allocation.goal.id),
      title: `Hacer principal ${allocation.goal.title}`
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Target color={colors.primary} size={30} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Mis metas</Text>
              <Text style={styles.subtitle}>
                Reparte tu bolsa mensual entre metas con distinta importancia, horizonte y viabilidad.
              </Text>
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
              value={primaryGoalPlanContribution > 0 ? formatCOP(primaryGoalPlanContribution) : "$0"}
            />
          </View>

          {primaryGoalIsCompleted ? (
            <View style={styles.primaryCompletedCard}>
              <AlertCircle color="#B45309" size={22} strokeWidth={2.4} />
              <View style={styles.primaryCompletedCopy}>
                <Text style={styles.primaryCompletedTitle}>Tu meta principal esta completada</Text>
                <Text style={styles.primaryCompletedText}>
                  Puedes mantenerla como referencia historica o elegir otra meta activa para que
                  Dashboard, simulacion y plan mensual se enfoquen en el siguiente objetivo.
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

          <View style={[styles.budgetCard, goalPlan.isOverBudget && styles.budgetCardWarning]}>
            <View style={styles.budgetHeader}>
              <View>
                <Text style={styles.sectionKicker}>Bolsa para metas</Text>
                <Text style={styles.sectionTitle}>
                  {goalPlan.monthlyContributionTotal > 0
                    ? `${formatCOP(goalPlan.monthlyContributionTotal)} asignados`
                    : "Sin aporte asignado"}
                </Text>
              </View>
              <Chip
                label={remainingLabel}
                tone={goalPlan.isOverBudget ? "danger" : goalPlan.remainingBudget > 0 ? "support" : "primary"}
              />
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
                    : "La bolsa se calcula desde tu margen mensual sugerido. Puedes ajustar aportes sin cambiar tus respuestas financieras."}
                </Text>
              </View>
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
            </View>
          </View>

          <View style={styles.quickCreateCard}>
            <View style={styles.quickCreateCopy}>
              <Text style={styles.quickCreateTitle}>Agregar otra meta</Text>
              <Text style={styles.quickCreateText}>
                Suma un objetivo nuevo y la bolsa mensual se repartira con tus prioridades actuales.
              </Text>
            </View>
            <PrimaryButton
              accessibilityLabel="Crear nueva meta"
              icon={Plus}
              onPress={navigateToNewGoal}
              style={styles.quickCreateButton}
              title="Nueva meta"
            />
          </View>

          {goalPlan.allocations.length > 0 ? (
            <View style={styles.goalsList}>
              {goalPlan.allocations.map((allocation) => (
                <GoalCard
                  key={allocation.goal.id}
                  allocation={allocation}
                  canMarkPrimary={
                    allocation.goal.isPrimary !== true &&
                    allocation.goal.status !== "completed" &&
                    allocation.goal.status !== "paused" &&
                    allocation.viability !== "completed"
                  }
                  canDelete={goals.length > 1 && allocation.goal.isPrimary !== true}
                  onActivate={() => activateGoal(allocation)}
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
                  recordedPlanContribution={
                    allocation.goal.id === primaryGoalAllocation?.goal.id ? primaryGoalPlanContribution : 0
                  }
                  onReset={() => setGoalContribution(allocation.goal.id, null)}
                  onSetPrimary={() => confirmSetPrimaryGoal(allocation)}
                  onUpdateGoal={(updates) => updateGoal(allocation.goal.id, updates)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Calendar color={colors.primary} size={28} strokeWidth={2.4} />
              <Text style={styles.emptyTitle}>Aun no tienes metas</Text>
              <Text style={styles.emptyText}>
                Crea una primera meta para calcular aportes sugeridos con tu margen mensual.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={closeConfirmation}
        transparent
        visible={pendingConfirmation !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{pendingConfirmation?.title}</Text>
            <Text style={styles.confirmMessage}>{pendingConfirmation?.message}</Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeConfirmation}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={runPendingConfirmation}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pendingConfirmation?.destructive && styles.confirmButtonDanger,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.confirmButtonText}>{pendingConfirmation?.confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  quickCreateCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220
  },
  quickCreateTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  quickCreateText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  quickCreateButton: {
    flexGrow: 1,
    minWidth: 170
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
  planContributionBox: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  planContributionHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  planContributionLabel: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    minWidth: 160
  },
  planContributionValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  planContributionText: {
    color: colors.textMuted,
    fontSize: typography.caption,
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
  inputLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
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
