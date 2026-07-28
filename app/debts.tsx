import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  CreditCard,
  GraduationCap,
  Landmark,
  PencilLine,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { FinancialEducationModal } from "../components/FinancialEducationModal";
import { FinancialEducationStory } from "../components/FinancialEducationStory";
import {
  SpendingSectionContent,
  SpendingSectionTabs
} from "../components/SpendingSectionTabs";
import {
  AppModal,
  AppModalAction,
  AppModalActions
} from "../components/ui/AppModal";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  normalizeFinancialGuidanceMode,
  type DebtPaymentStatus,
  type DebtRecord
} from "../types/financial";
import {
  debtPaymentStatusLabels,
  evaluateNewDebt,
  getDebtRatioLabel,
  getDebtTotalLabel,
  getRegisteredDebtSummary,
  type DebtLevel,
  type NewDebtViability
} from "../utils/debtCalculations";
import { calculateFinancialSnapshot } from "../utils/financialCalculations";
import { formatCOP, formatSignedCOP, parseCOPInput } from "../utils/financialRanges";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Tone = "primary" | "support" | "warning" | "purple" | "neutral" | "danger";

type DebtTypeOption = {
  icon: ComponentType<IconProps>;
  label: string;
  text: string;
  tone: Tone;
};

type DebtFormState = {
  annualInterestRate: string;
  lender: string;
  monthlyPayment: string;
  name: string;
  paymentDay: string;
  remainingAmount: string;
  status: DebtPaymentStatus;
  type: string;
};

type MonthYearValue = {
  month: number;
  year: number;
};

const debtTypeOptions: DebtTypeOption[] = [
  {
    icon: CreditCard,
    label: "Tarjeta de crédito",
    text: "Pago mínimo, compras diferidas o saldo usado.",
    tone: "warning"
  },
  {
    icon: Landmark,
    label: "Préstamo personal",
    text: "También puede ser libre inversión.",
    tone: "primary"
  },
  {
    icon: Car,
    label: "Vehículo",
    text: "Carro, moto o transporte a cuotas.",
    tone: "purple"
  },
  {
    icon: GraduationCap,
    label: "Educación",
    text: "Estudio, posgrado, curso o universidad.",
    tone: "support"
  },
  {
    icon: WalletCards,
    label: "Compra a cuotas",
    text: "Celular, electrodoméstico u otra compra.",
    tone: "neutral"
  },
  {
    icon: Users,
    label: "Familiar o informal",
    text: "Dinero prestado por persona cercana.",
    tone: "neutral"
  }
];

const debtStatusOptions: Array<{
  status: DebtPaymentStatus;
  helper: string;
  tone: Tone;
}> = [
  {
    status: "on_track",
    helper: "La cuota cabe en tu mes.",
    tone: "support"
  },
  {
    status: "sometimes_heavy",
    helper: "Algunos meses se siente ajustada.",
    tone: "warning"
  },
  {
    status: "overdue",
    helper: "Hay pagos atrasados o pendientes.",
    tone: "danger"
  },
  {
    status: "not_sure",
    helper: "No tienes claro el estado.",
    tone: "purple"
  }
];

const emptyDebtForm: DebtFormState = {
  annualInterestRate: "",
  lender: "",
  monthlyPayment: "",
  name: "",
  paymentDay: "",
  remainingAmount: "",
  status: "on_track",
  type: debtTypeOptions[0].label
};

const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

function getCurrentMonthYear(): MonthYearValue {
  const date = new Date();

  return {
    month: date.getMonth(),
    year: date.getFullYear()
  };
}

function isBeforeMonthYear(value: MonthYearValue, minimum: MonthYearValue) {
  return value.year < minimum.year || (value.year === minimum.year && value.month < minimum.month);
}

function getFutureMonthYear(value: MonthYearValue) {
  const currentMonthYear = getCurrentMonthYear();

  return isBeforeMonthYear(value, currentMonthYear) ? currentMonthYear : value;
}

function formatMonthYear(value: MonthYearValue) {
  return `${monthLabels[value.month]} ${value.year}`;
}

const DEBT_EXPENSE_CATEGORY = "Deudas";
const dangerRed = "#DC2626";
const dangerRedSoft = "#FEF2F2";
const dangerRedBorder = "#FECACA";

function getSyncedDebtExpenseData({
  debts,
  expenseCategories,
  expenseCategoryAmounts
}: {
  debts: DebtRecord[];
  expenseCategories: string[];
  expenseCategoryAmounts: Record<string, number>;
}) {
  const monthlyDebtTotal = debts.reduce(
    (total, debt) => total + Math.max(0, debt.monthlyPayment),
    0
  );
  const nextExpenseCategoryAmounts = {
    ...expenseCategoryAmounts
  };
  const nextExpenseCategories = expenseCategories.includes(DEBT_EXPENSE_CATEGORY)
    ? expenseCategories
    : [...expenseCategories, DEBT_EXPENSE_CATEGORY];

  if (monthlyDebtTotal > 0) {
    nextExpenseCategoryAmounts[DEBT_EXPENSE_CATEGORY] = monthlyDebtTotal;
  } else {
    delete nextExpenseCategoryAmounts[DEBT_EXPENSE_CATEGORY];
  }

  return {
    expenseCategories: monthlyDebtTotal > 0 ? nextExpenseCategories : expenseCategories,
    expenseCategoryAmounts: nextExpenseCategoryAmounts
  };
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

  if (tone === "purple") {
    return {
      background: "#F1E8FF",
      border: "#D8C7FF",
      text: "#6D28D9"
    };
  }

  if (tone === "danger") {
    return {
      background: dangerRedSoft,
      border: dangerRedBorder,
      text: dangerRed
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

function getDebtTone(level: DebtLevel): Tone {
  if (level === "none") {
    return "support";
  }

  if (level === "low") {
    return "support";
  }

  if (level === "medium" || level === "unknown") {
    return "warning";
  }

  return "danger";
}

function getViabilityTone(viability: NewDebtViability): Tone {
  if (viability === "possible") {
    return "support";
  }

  if (viability === "tight") {
    return "warning";
  }

  if (viability === "risky") {
    return "danger";
  }

  return "neutral";
}

function getDebtTypeOption(type: string) {
  const normalizedType = type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    debtTypeOptions.find(
      (option) =>
        option.label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase() === normalizedType
    ) ?? debtTypeOptions[0]
  );
}

function getFormattedCurrencyInput(value: string) {
  const parsedValue = parseCOPInput(value);
  return parsedValue === null ? "" : formatCOP(parsedValue);
}

function getFormattedDayInput(value: string) {
  const parsedValue = Number(value.replace(/\D/g, ""));

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "";
  }

  return `${Math.min(parsedValue, 31)}`;
}

function getFormattedInterestRateInput(value: string) {
  const normalizedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = normalizedValue.split(".");
  const decimal = decimalParts.join("").slice(0, 2);

  return decimalParts.length > 0 ? `${whole.slice(0, 3)}.${decimal}` : whole.slice(0, 3);
}

function parseInterestRateInput(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 100
    ? parsedValue
    : null;
}

function getInterestRateLabel(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value}% E.A.` : "No indicada";
}

function getDebtTitle(debt: DebtRecord) {
  return debt.name?.trim() || getDebtTypeOption(debt.type).label;
}

function getOptionalAmountLabel(value: number | null | undefined) {
  return value !== null && value !== undefined ? formatCOP(value) : "No indicado";
}

function getPaymentDayLabel(value: number | null | undefined) {
  return value ? `Día ${value}` : "Sin fecha";
}

function getDebtInsight({
  count,
  level,
  monthlyPaymentTotal,
  source
}: {
  count: number;
  level: DebtLevel;
  monthlyPaymentTotal: number;
  source: string;
}) {
  if (source === "category" && monthlyPaymentTotal > 0) {
    return `Usamos ${formatCOP(monthlyPaymentTotal)} que registraste en gastos como Deudas. Puedes agregar el detalle cuando lo tengas.`;
  }

  if (source === "reported") {
    return monthlyPaymentTotal > 0
      ? "Esta cifra es una referencia calculada desde el rango que reportaste, no una cuota confirmada."
      : "Conservamos el rango que reportaste; falta una referencia de ingresos para convertirlo en un monto.";
  }

  if (count === 0) {
    return "Aún no tenemos una cuota mensual detallada.";
  }

  if (level === "high") {
    return "Antes de asumir una nueva cuota, conviene revisar qué deuda genera más presión.";
  }

  if (level === "medium" || level === "unknown") {
    return "Tus pagos de deuda ya ocupan una parte que conviene observar con calma.";
  }

  return `Tus cuotas registradas suman ${formatCOP(monthlyPaymentTotal)} al mes. Puedes monitorearlas antes de tomar nuevos compromisos.`;
}

function IconBubble({
  icon,
  tone = "primary",
  size = "medium"
}: {
  icon: ReactNode;
  tone?: Tone;
  size?: "small" | "medium" | "large";
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.iconBubble,
        size === "small" && styles.iconBubbleSmall,
        size === "large" && styles.iconBubbleLarge,
        { backgroundColor: toneColors.background }
      ]}
    >
      {icon}
    </View>
  );
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

function SectionCard({
  title,
  subtitle,
  icon,
  actionLabel,
  onActionPress,
  headerAction,
  children,
  compact = false
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  headerAction?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.sectionCard, compact && styles.cardPhone]}>
      <View style={styles.sectionHeader}>
        <IconBubble icon={icon} size="small" />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
          >
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        {headerAction}
      </View>
      {children}
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.summaryMetric,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={[styles.summaryMetricValue, { color: toneColors.text }]}>{value}</Text>
    </View>
  );
}

function CurrencyInput({
  label,
  value,
  onChangeText,
  optional
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <InputLabel label={label} optional={optional} />
      <TextInput
        keyboardType="number-pad"
        onChangeText={(text) => onChangeText(getFormattedCurrencyInput(text))}
        placeholderTextColor={colors.textSubtle}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  optional
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <InputLabel label={label} optional={optional} />
      <TextInput
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSubtle}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function PercentageInput({
  label,
  value,
  onChangeText,
  optional
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <InputLabel label={label} optional={optional} />
      <TextInput
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={(text) => onChangeText(getFormattedInterestRateInput(text))}
        placeholder="Ej. 24.5"
        placeholderTextColor={colors.textSubtle}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function InputLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={styles.inputLabelRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      {optional ? (
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalBadgeText}>Opcional</Text>
        </View>
      ) : null}
    </View>
  );
}

function DebtTypeButton({
  option,
  selected,
  onPress
}: {
  option: DebtTypeOption;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = option.icon;
  const toneColors = getToneColors(option.tone);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.debtTypeButton,
        selected && styles.debtTypeButtonSelected,
        pressed && styles.pressed
      ]}
    >
      <IconBubble
        icon={<Icon color={toneColors.text} size={20} strokeWidth={2.4} />}
        size="small"
        tone={option.tone}
      />
      <View style={styles.debtTypeCopy}>
        <Text style={[styles.debtTypeLabel, selected && styles.debtTypeLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.debtTypeText}>{option.text}</Text>
      </View>
    </Pressable>
  );
}

function StatusButton({
  helper,
  label,
  selected,
  tone,
  onPress
}: {
  helper: string;
  label: string;
  selected: boolean;
  tone: Tone;
  onPress: () => void;
}) {
  const toneColors = getToneColors(tone);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusButton,
        selected && { backgroundColor: toneColors.background, borderColor: toneColors.border },
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.statusLabel, selected && { color: toneColors.text }]}>{label}</Text>
      <Text style={styles.statusHelper}>{helper}</Text>
    </Pressable>
  );
}

function MonthYearField({
  value,
  onPress
}: {
  value: MonthYearValue;
  onPress: () => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <InputLabel label="Primer mes de pago" optional />
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.monthYearField, pressed && styles.pressed]}
      >
        <CalendarDays color={colors.primary} size={20} strokeWidth={2.4} />
        <Text style={styles.monthYearFieldText}>{formatMonthYear(value)}</Text>
        <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function MonthYearSelectionModal({
  visible,
  value,
  onChange,
  onClose,
  onConfirm
}: {
  visible: boolean;
  value: MonthYearValue;
  onChange: (value: MonthYearValue) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const minimumMonthYear = getCurrentMonthYear();
  const canSelectPreviousYear = value.year > minimumMonthYear.year;

  return (
    <AppModal
      footer={
        <AppModalActions>
          <AppModalAction label="Cancelar" onPress={onClose} variant="secondary" />
          <AppModalAction
            icon={<CheckCircle2 color={colors.surface} size={19} strokeWidth={2.5} />}
            label="Usar fecha"
            onPress={onConfirm}
          />
        </AppModalActions>
      }
      icon={<CalendarDays color={colors.primary} size={23} strokeWidth={2.4} />}
      onClose={onClose}
      size="compact"
      title="Primer mes de pago"
      visible={visible}
    >
          <View style={styles.monthYearPreview}>
            <CalendarDays color={colors.primary} size={22} strokeWidth={2.4} />
            <Text style={styles.monthYearPreviewText}>{formatMonthYear(value)}</Text>
          </View>

          <View style={styles.monthYearControlRow}>
            <Text style={styles.modalSectionLabel}>Ano</Text>
            <View style={styles.yearControls}>
              <Pressable
                accessibilityLabel="Ano anterior"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSelectPreviousYear }}
                disabled={!canSelectPreviousYear}
                onPress={() => onChange({ ...value, year: value.year - 1 })}
                style={({ pressed }) => [
                  styles.yearButton,
                  !canSelectPreviousYear && styles.yearButtonDisabled,
                  pressed && canSelectPreviousYear && styles.pressed
                ]}
              >
                <ChevronLeft
                  color={canSelectPreviousYear ? colors.primary : colors.textSubtle}
                  size={18}
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text style={styles.yearValue}>{value.year}</Text>
              <Pressable
                accessibilityLabel="Ano siguiente"
                accessibilityRole="button"
                onPress={() => onChange({ ...value, year: value.year + 1 })}
                style={({ pressed }) => [styles.yearButton, pressed && styles.pressed]}
              >
                <ChevronRight color={colors.primary} size={18} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.modalSectionLabel}>Mes</Text>
          <View style={styles.monthGrid}>
            {monthLabels.map((monthLabel, monthIndex) => {
              const selected = value.month === monthIndex;
              const disabled = isBeforeMonthYear(
                { month: monthIndex, year: value.year },
                minimumMonthYear
              );

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled, selected }}
                  disabled={disabled}
                  key={monthLabel}
                  onPress={() => onChange({ ...value, month: monthIndex })}
                  style={({ pressed }) => [
                    styles.monthButton,
                    selected && styles.monthButtonSelected,
                    disabled && styles.monthButtonDisabled,
                    pressed && !disabled && styles.pressed
                  ]}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      selected && styles.monthButtonTextSelected,
                      disabled && styles.monthButtonTextDisabled
                    ]}
                  >
                    {monthLabel.slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

    </AppModal>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <IconBubble
        icon={<CreditCard color={colors.primary} size={34} strokeWidth={2.4} />}
        size="large"
      />
      <View style={styles.emptyStateCopy}>
        <Text style={styles.emptyStateTitle}>Aún no hay deudas registradas</Text>
        <Text style={styles.text}>
          Agrega la cuota mensual y, si los conoces, el saldo, la tasa anual y el estado del pago.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>Agregar deuda</Text>
        <Plus color={colors.surface} size={20} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function DebtCard({
  debt,
  onEdit,
  onDelete
}: {
  debt: DebtRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeOption = getDebtTypeOption(debt.type);
  const Icon = typeOption.icon;
  const statusTone =
    debt.status === "on_track"
      ? "support"
      : debt.status === "overdue"
        ? "danger"
        : debt.status === "not_sure"
          ? "purple"
          : "warning";
  const typeToneColors = getToneColors(typeOption.tone);

  return (
    <View style={styles.debtCard}>
      <View style={styles.debtCardHeader}>
        <IconBubble
          icon={<Icon color={typeToneColors.text} size={22} strokeWidth={2.4} />}
          tone={typeOption.tone}
        />
        <View style={styles.debtCardTitleGroup}>
          <Text style={styles.debtCardTitle}>{getDebtTitle(debt)}</Text>
          <Text style={styles.debtCardSubtitle}>
            {debt.name ? typeOption.label : "Deuda registrada"}
            {debt.lender ? ` · ${debt.lender}` : ""}
          </Text>
        </View>
        <Chip label={debtPaymentStatusLabels[debt.status]} tone={statusTone} />
      </View>

      <View style={styles.debtCardMetrics}>
        <SummaryMetric label="Cuota mensual" tone="primary" value={formatCOP(debt.monthlyPayment)} />
        <SummaryMetric
          label="Falta por pagar"
          tone="warning"
          value={getOptionalAmountLabel(debt.remainingAmount)}
        />
        <SummaryMetric
          label="Día límite"
          tone="neutral"
          value={getPaymentDayLabel(debt.paymentDay)}
        />
        <SummaryMetric
          label="Tasa anual"
          tone="purple"
          value={getInterestRateLabel(debt.annualInterestRate)}
        />
      </View>

      <View style={styles.debtCardActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.secondaryInlineButton, pressed && styles.pressed]}
        >
          <PencilLine color={colors.primary} size={18} strokeWidth={2.4} />
          <Text style={styles.secondaryInlineButtonText}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [styles.dangerInlineButton, pressed && styles.pressed]}
        >
          <Trash2 color={dangerRed} size={18} strokeWidth={2.4} />
          <Text style={styles.dangerInlineButtonText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DebtFormContent({
  debtForm,
  onUpdate
}: {
  debtForm: DebtFormState;
  onUpdate: (patch: Partial<DebtFormState>) => void;
}) {
  return (
    <>
      <Text style={styles.text}>
        Elige la opción más parecida al tipo de deuda que tienes.
      </Text>
      <View style={styles.debtTypeGrid}>
        {debtTypeOptions.map((option) => (
          <DebtTypeButton
            key={option.label}
            onPress={() => onUpdate({ type: option.label })}
            option={option}
            selected={debtForm.type === option.label}
          />
        ))}
      </View>

      <View style={styles.inputGrid}>
        <TextField
          label="Nombre para reconocerla"
          onChangeText={(value) => onUpdate({ name: value })}
          optional
          value={debtForm.name}
        />
        <CurrencyInput
          label="Cuánto falta por pagar"
          onChangeText={(value) => onUpdate({ remainingAmount: value })}
          optional
          value={debtForm.remainingAmount}
        />
        <CurrencyInput
          label="Cuánto pagas al mes"
          onChangeText={(value) => onUpdate({ monthlyPayment: value })}
          value={debtForm.monthlyPayment}
        />
        <TextField
          label="A quién le pagas"
          onChangeText={(value) => onUpdate({ lender: value })}
          optional
          value={debtForm.lender}
        />
        <PercentageInput
          label="Tasa de interés anual (E.A.)"
          onChangeText={(value) => onUpdate({ annualInterestRate: value })}
          optional
          value={debtForm.annualInterestRate}
        />
        <View style={styles.inputGroup}>
          <InputLabel label="Día límite de pago" optional />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => onUpdate({ paymentDay: getFormattedDayInput(value) })}
            placeholderTextColor={colors.textSubtle}
            style={styles.textInput}
            value={debtForm.paymentDay}
          />
        </View>
      </View>

      <View style={styles.statusGrid}>
        {debtStatusOptions.map((option) => (
          <StatusButton
            helper={option.helper}
            key={option.status}
            label={debtPaymentStatusLabels[option.status]}
            onPress={() => onUpdate({ status: option.status })}
            selected={debtForm.status === option.status}
            tone={option.tone}
          />
        ))}
      </View>
    </>
  );
}

export default function DebtsScreen() {
  const { isPhone, screenPadding } = useResponsiveLayout();
  const { exactValues, onboarding, updateOnboarding } = useOnboarding();
  const guidanceMode = normalizeFinancialGuidanceMode(
    onboarding.financialGuidanceMode
  );
  const debts = onboarding.debts;
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtForm, setDebtForm] = useState<DebtFormState>(emptyDebtForm);
  const [newDebtPurpose, setNewDebtPurpose] = useState(debtTypeOptions[3].label);
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtPayment, setNewDebtPayment] = useState("");
  const [newDebtStart, setNewDebtStart] = useState<MonthYearValue>(() => getCurrentMonthYear());
  const [draftNewDebtStart, setDraftNewDebtStart] = useState<MonthYearValue>(() =>
    getCurrentMonthYear()
  );
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [debtPendingDelete, setDebtPendingDelete] = useState<DebtRecord | null>(null);
  const snapshot = useMemo(
    () => calculateFinancialSnapshot({ onboarding, exactValues }),
    [exactValues, onboarding]
  );
  const debtSummary = useMemo(
    () =>
      getRegisteredDebtSummary({
        debts,
        debtPaymentShare: onboarding.debtPaymentShare,
        expenseCategoryAmounts: onboarding.expenseCategoryAmounts,
        monthlyIncome: snapshot.cashflow.monthlyIncome
      }),
    [
      debts,
      onboarding.debtPaymentShare,
      onboarding.expenseCategoryAmounts,
      snapshot.cashflow.monthlyIncome
    ]
  );
  const newDebtPaymentValue = parseCOPInput(newDebtPayment);
  const newDebtEvaluation = useMemo(
    () =>
      evaluateNewDebt({
        currentMonthlyDebtPayment: debtSummary.monthlyPaymentTotal,
        monthlyIncome: snapshot.cashflow.monthlyIncome,
        monthlyMargin: snapshot.cashflow.monthlyMargin,
        newMonthlyPayment: newDebtPaymentValue
      }),
    [
      debtSummary.monthlyPaymentTotal,
      newDebtPaymentValue,
      snapshot.cashflow.monthlyIncome,
      snapshot.cashflow.monthlyMargin
    ]
  );
  const summaryTone = getDebtTone(debtSummary.level);
  const canSaveDebt = Boolean(parseCOPInput(debtForm.monthlyPayment));

  const updateDebtForm = (patch: Partial<DebtFormState>) => {
    setDebtForm((current) => ({
      ...current,
      ...patch
    }));
  };

  const updateDebts = (nextDebts: DebtRecord[]) => {
    updateOnboarding({
      debts: nextDebts,
      ...getSyncedDebtExpenseData({
        debts: nextDebts,
        expenseCategories: onboarding.expenseCategories,
        expenseCategoryAmounts: onboarding.expenseCategoryAmounts
      })
    });
  };

  const startNewDebt = () => {
    setEditingDebtId(null);
    setDebtForm(emptyDebtForm);
    setShowDebtForm(true);
  };

  const startEditDebt = (debt: DebtRecord) => {
    setEditingDebtId(debt.id);
    setDebtForm({
      annualInterestRate:
        debt.annualInterestRate !== null && debt.annualInterestRate !== undefined
          ? `${debt.annualInterestRate}`
          : "",
      lender: debt.lender ?? "",
      monthlyPayment: formatCOP(debt.monthlyPayment),
      name: debt.name ?? "",
      paymentDay: debt.paymentDay ? `${debt.paymentDay}` : "",
      remainingAmount:
        debt.remainingAmount !== null && debt.remainingAmount !== undefined
          ? formatCOP(debt.remainingAmount)
          : "",
      status: debt.status,
      type: getDebtTypeOption(debt.type).label
    });
    setShowDebtForm(true);
  };

  const cancelDebtForm = () => {
    setEditingDebtId(null);
    setDebtForm(emptyDebtForm);
    setShowDebtForm(false);
  };

  const saveDebt = () => {
    const monthlyPayment = parseCOPInput(debtForm.monthlyPayment);

    if (!monthlyPayment || monthlyPayment <= 0) {
      return;
    }

    const now = new Date().toISOString();
    const existingDebt = debts.find((debt) => debt.id === editingDebtId);
    const paymentDay = Number(debtForm.paymentDay);
    const normalizedPaymentDay =
      Number.isInteger(paymentDay) && paymentDay >= 1 && paymentDay <= 31 ? paymentDay : null;
    const nextDebt: DebtRecord = {
      id: editingDebtId ?? `debt-${Date.now()}`,
      type: debtForm.type,
      name: debtForm.name.trim() || null,
      lender: debtForm.lender.trim() || null,
      remainingAmount: parseCOPInput(debtForm.remainingAmount),
      monthlyPayment,
      annualInterestRate: parseInterestRateInput(debtForm.annualInterestRate),
      status: debtForm.status,
      paymentDay: normalizedPaymentDay,
      createdAt: existingDebt?.createdAt ?? now,
      updatedAt: now
    };
    const nextDebts = editingDebtId
      ? debts.map((debt) => (debt.id === editingDebtId ? nextDebt : debt))
      : [nextDebt, ...debts];

    updateDebts(nextDebts);
    setEditingDebtId(null);
    setDebtForm(emptyDebtForm);
    setShowDebtForm(false);
  };

  const deleteDebt = (debtId: string) => {
    updateDebts(debts.filter((debt) => debt.id !== debtId));
  };

  const requestDeleteDebt = (debt: DebtRecord) => {
    setDebtPendingDelete(debt);
  };

  const confirmDeleteDebt = () => {
    if (!debtPendingDelete) {
      return;
    }

    deleteDebt(debtPendingDelete.id);
    setDebtPendingDelete(null);
  };

  const openStartPicker = () => {
    setDraftNewDebtStart(getFutureMonthYear(newDebtStart));
    setIsStartPickerOpen(true);
  };

  const confirmStartPicker = () => {
    setNewDebtStart(getFutureMonthYear(draftNewDebtStart));
    setIsStartPickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.headerCard, isPhone && styles.cardPhone]}>
            <View style={styles.headerIcon}>
              <CreditCard color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, isPhone && styles.titlePhone]}>Tus deudas</Text>
            </View>
          </View>

          <SpendingSectionTabs activeTab="debts" />

          <SpendingSectionContent activeTab="debts">
          <View style={[styles.heroCard, isPhone && styles.cardPhone]}>
            <View style={styles.heroTextGroup}>
              <Text style={styles.heroKicker}>Pagas al mes en deudas</Text>
              <Text style={[styles.heroAmount, { color: getToneColors(summaryTone).text }]}>
                {debtSummary.source === "reported" && debtSummary.monthlyPaymentTotal > 0
                  ? `${formatCOP(debtSummary.monthlyPaymentTotal)} aprox.`
                  : getDebtTotalLabel(debtSummary.monthlyPaymentTotal)}
              </Text>
              <Text style={styles.heroInsight}>
                {getDebtInsight({
                  count: debtSummary.count,
                  level: debtSummary.level,
                  monthlyPaymentTotal: debtSummary.monthlyPaymentTotal,
                  source: debtSummary.source
                })}
              </Text>
              <View style={styles.guidanceNote}>
                <Text style={styles.guidanceNoteText}>
                  {debtSummary.source === "reported"
                    ? "Usamos tu rango mientras no registres cuotas. Puedes mantenerlo así o agregar detalles para mejorar la precisión."
                    : "Agrega tus cuotas para evaluar mejor si una nueva obligación cabe en tu presupuesto."}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryMetric
              label="Relación deudas vs ingresos"
              tone={summaryTone}
              value={getDebtRatioLabel(
                debtSummary.debtToIncomeRatio,
                debtSummary.source === "reported"
                  ? debtSummary.reportedPaymentShare
                  : null
              )}
            />
            <SummaryMetric
              label="Saldo registrado"
              tone="warning"
              value={getOptionalAmountLabel(debtSummary.remainingTotal)}
            />
            <SummaryMetric
              label="Margen actual"
              tone={
                snapshot.cashflow.monthlyMargin !== null && snapshot.cashflow.monthlyMargin > 0
                  ? "support"
                  : "warning"
              }
              value={
                snapshot.cashflow.monthlyMargin !== null
                  ? formatSignedCOP(snapshot.cashflow.monthlyMargin)
                  : "Por calcular"
              }
            />
          </View>

          <SectionCard
            compact={isPhone}
            icon={<ReceiptText color={colors.primary} size={20} strokeWidth={2.4} />}
            title="Deudas registradas"
          >
            {!showDebtForm && debts.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={startNewDebt}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Agregar deuda +</Text>
              </Pressable>
            ) : null}

            {debts.length > 0 ? (
              <View style={styles.debtList}>
                {debts.map((debt) => (
                  <DebtCard
                    debt={debt}
                    key={debt.id}
                    onDelete={() => requestDeleteDebt(debt)}
                    onEdit={() => startEditDebt(debt)}
                  />
                ))}
              </View>
            ) : !showDebtForm ? (
              <EmptyState onPress={startNewDebt} />
            ) : null}
          </SectionCard>

          <SectionCard
            compact={isPhone}
            headerAction={
              <FinancialEducationModal
                accessibilityLabel="Explicar cómo se evalúa una nueva cuota"
                guidanceMode={guidanceMode}
                icon={<Banknote color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Cómo evaluamos una nueva cuota"
              >
                <FinancialEducationStory
                  calculationItems={[
                    {
                      label: "Cuotas actuales",
                      value: formatCOP(debtSummary.monthlyPaymentTotal)
                    },
                    {
                      label: "Nueva cuota",
                      operator: "+",
                      value:
                        newDebtPaymentValue !== null
                          ? formatCOP(newDebtPaymentValue)
                          : "Por indicar"
                    },
                    {
                      emphasis: true,
                      label: "Deuda mensual total",
                      operator: "=",
                      value:
                        newDebtEvaluation.totalDebtPayment !== null
                          ? formatCOP(newDebtEvaluation.totalDebtPayment)
                          : "Por calcular"
                    }
                  ]}
                  calculationTitle="Qué sumamos antes de evaluar"
                  definition="Comparamos todas tus cuotas mensuales con tus ingresos y revisamos cuánto margen quedaría después de agregar la nueva cuota."
                  estimateLabel="Orientación educativa"
                  guidanceMode={guidanceMode}
                  plainLanguage={
                    newDebtEvaluation.marginAfterNewPayment !== null
                      ? `Después de incluir esta cuota, te quedarían cerca de ${formatSignedCOP(
                          newDebtEvaluation.marginAfterNewPayment
                        )} de margen mensual.`
                      : "Indica una cuota mensual para ver cómo cambiarían tu margen y el peso de tus deudas."
                  }
                  plainLanguageBadge={
                    newDebtEvaluation.totalDebtToIncomeRatio !== null
                      ? getDebtRatioLabel(
                          newDebtEvaluation.totalDebtToIncomeRatio
                        )
                      : "?"
                  }
                  resultDescription={newDebtEvaluation.message}
                  resultLabel={newDebtEvaluation.label}
                  resultValue={getDebtRatioLabel(
                    newDebtEvaluation.totalDebtToIncomeRatio
                  )}
                  tone={
                    newDebtEvaluation.viability === "possible"
                      ? "positive"
                      : newDebtEvaluation.viability === "risky"
                        ? "critical"
                        : newDebtEvaluation.viability === "tight"
                          ? "warning"
                          : "neutral"
                  }
                />
              </FinancialEducationModal>
            }
            icon={<Banknote color={colors.primary} size={20} strokeWidth={2.4} />}
            title="Evaluar nueva cuota"
            subtitle="Útil para estudio, vehículo u otra obligación antes de decidir."
          >
            <View style={styles.evaluationIntro}>
              <AlertCircle color={colors.support} size={20} strokeWidth={2.4} />
              <Text style={styles.evaluationIntroText}>
                Esto no compara bancos ni reemplaza asesoría. Solo estima si una nueva cuota cabe
                dentro de tu mes con los datos actuales.
              </Text>
            </View>

            <View style={styles.debtTypeGrid}>
              {debtTypeOptions.slice(1, 5).map((option) => (
                <DebtTypeButton
                  key={option.label}
                  onPress={() => setNewDebtPurpose(option.label)}
                  option={option}
                  selected={newDebtPurpose === option.label}
                />
              ))}
            </View>

            <View style={styles.inputGrid}>
              <CurrencyInput
                label="Cuánto necesitas"
                onChangeText={setNewDebtAmount}
                optional
                value={newDebtAmount}
              />
              <CurrencyInput
                label="Cuota mensual estimada"
                onChangeText={setNewDebtPayment}
                value={newDebtPayment}
              />
              <MonthYearField onPress={openStartPicker} value={newDebtStart} />
            </View>

            <View
              style={[
                styles.evaluationResult,
                {
                  backgroundColor: getToneColors(getViabilityTone(newDebtEvaluation.viability)).background,
                  borderColor: getToneColors(getViabilityTone(newDebtEvaluation.viability)).border
                }
              ]}
            >
              <View style={styles.evaluationHeader}>
                <IconBubble
                  icon={
                    newDebtEvaluation.viability === "missing" ? (
                      <CircleQuestionMark
                        color={getToneColors(getViabilityTone(newDebtEvaluation.viability)).text}
                        size={20}
                        strokeWidth={2.4}
                      />
                    ) : (
                      <ShieldCheck
                        color={getToneColors(getViabilityTone(newDebtEvaluation.viability)).text}
                        size={20}
                        strokeWidth={2.4}
                      />
                    )
                  }
                  size="small"
                  tone={getViabilityTone(newDebtEvaluation.viability)}
                />
                <View style={styles.evaluationTitleGroup}>
                  <Text
                    style={[
                      styles.evaluationTitle,
                      {
                        color: getToneColors(getViabilityTone(newDebtEvaluation.viability)).text
                      }
                    ]}
                  >
                    {newDebtEvaluation.label}
                  </Text>
                  <Text style={styles.evaluationText}>{newDebtEvaluation.message}</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <SummaryMetric
                  label="Deuda total mensual"
                  tone={getViabilityTone(newDebtEvaluation.viability)}
                  value={
                    newDebtEvaluation.totalDebtPayment !== null
                      ? formatCOP(newDebtEvaluation.totalDebtPayment)
                      : "Por calcular"
                  }
                />
                <SummaryMetric
                  label="Relación deudas vs ingresos"
                  tone={getViabilityTone(newDebtEvaluation.viability)}
                  value={getDebtRatioLabel(newDebtEvaluation.totalDebtToIncomeRatio)}
                />
                <SummaryMetric
                  label="Primer mes de pago"
                  tone="neutral"
                  value={formatMonthYear(newDebtStart)}
                />
                <SummaryMetric
                  label="Margen después"
                  tone={getViabilityTone(newDebtEvaluation.viability)}
                  value={
                    newDebtEvaluation.marginAfterNewPayment !== null
                      ? formatCOP(newDebtEvaluation.marginAfterNewPayment)
                      : "Por calcular"
                  }
                />
              </View>
            </View>
          </SectionCard>
          </SpendingSectionContent>
        </View>
      </ScrollView>

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={cancelDebtForm}
              variant="secondary"
            />
            <AppModalAction
              disabled={!canSaveDebt}
              icon={
                <CheckCircle2
                  color={canSaveDebt ? colors.surface : colors.textSubtle}
                  size={19}
                  strokeWidth={2.5}
                />
              }
              label={editingDebtId ? "Guardar cambios" : "Guardar deuda"}
              onPress={saveDebt}
            />
          </AppModalActions>
        }
        icon={<CreditCard color={colors.primary} size={23} strokeWidth={2.4} />}
        onClose={cancelDebtForm}
        scrollable
        size="wide"
        subtitle="Registra la información que tengas clara; los datos marcados son opcionales."
        title={editingDebtId ? "Editar deuda" : "Agregar una deuda"}
        visible={showDebtForm}
      >
        <DebtFormContent debtForm={debtForm} onUpdate={updateDebtForm} />
      </AppModal>

      <MonthYearSelectionModal
        onChange={setDraftNewDebtStart}
        onClose={() => setIsStartPickerOpen(false)}
        onConfirm={confirmStartPicker}
        value={draftNewDebtStart}
        visible={isStartPickerOpen}
      />

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={() => setDebtPendingDelete(null)}
              variant="secondary"
            />
            <AppModalAction
              icon={<Trash2 color={colors.surface} size={19} strokeWidth={2.5} />}
              label="Eliminar deuda"
              onPress={confirmDeleteDebt}
              variant="danger"
            />
          </AppModalActions>
        }
        icon={<Trash2 color={dangerRed} size={22} strokeWidth={2.4} />}
        onClose={() => setDebtPendingDelete(null)}
        size="compact"
        title="Eliminar deuda"
        visible={Boolean(debtPendingDelete)}
      >
        <Text style={styles.modalText}>
          {debtPendingDelete
            ? `¿Quieres eliminar "${getDebtTitle(debtPendingDelete)}" de tus deudas?`
            : "¿Quieres eliminar esta deuda de tus deudas?"}
        </Text>
      </AppModal>

      <BottomNavigation activeRoute="/spending" />
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
  headerCard: {
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
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
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
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  heroCard: {
    ...shadows.card,
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  heroTextGroup: {
    gap: spacing.xs,
    minWidth: 0,
    width: "100%"
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  heroKicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xs
  },
  heroAmount: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  heroInsight: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs
  },
  guidanceNote: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  guidanceNoteText: {
    color: colors.support,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  summaryMetric: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 170,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 72,
    padding: spacing.md
  },
  summaryMetricLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  summaryMetricValue: {
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  sectionCard: {
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
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  sectionAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42
  },
  sectionActionText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  debtFormModalPanel: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: "90%",
    maxWidth: 760,
    overflow: "hidden",
    width: "100%"
  },
  pickerModalPanel: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%"
  },
  confirmModalPanel: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%"
  },
  modalPanelPhone: {
    borderRadius: radius.md,
    padding: spacing.md
  },
  modalScrollContent: {
    padding: spacing.md,
    width: "100%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  modalTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  modalText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm
  },
  modalCloseText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  formCard: {
    backgroundColor: "#F8FBFF",
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    width: "100%"
  },
  formHeader: {
    gap: spacing.xs
  },
  formTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  debtTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  debtTypeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 220,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 82,
    padding: spacing.md
  },
  debtTypeButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBD3FF"
  },
  debtTypeCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  debtTypeLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  debtTypeLabelSelected: {
    color: colors.primary
  },
  debtTypeText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  inputGroup: {
    flexBasis: 220,
    flexGrow: 1,
    gap: spacing.xs
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  optionalBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  optionalBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  monthYearField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  monthYearFieldText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  inputHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statusButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 76,
    padding: spacing.md
  },
  statusLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  statusHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  yearControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  yearValue: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    minWidth: 58,
    textAlign: "center"
  },
  yearButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  yearButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexBasis: "23%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.xs
  },
  monthButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBD3FF"
  },
  monthButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    opacity: 0.55
  },
  monthButtonText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  monthButtonTextSelected: {
    color: colors.primary
  },
  monthButtonTextDisabled: {
    color: colors.textSubtle
  },
  monthYearPreview: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  monthYearPreviewText: {
    color: colors.primary,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  monthYearControlRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  modalSectionLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  formActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  primaryButtonDisabled: {
    backgroundColor: "#CBD5E1"
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: dangerRed,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  dangerButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  debtList: {
    gap: spacing.md
  },
  debtCard: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  debtCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  debtCardTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180
  },
  debtCardTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  debtCardSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  debtCardMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  debtCardActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  secondaryInlineButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40
  },
  secondaryInlineButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  dangerInlineButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40
  },
  dangerInlineButtonText: {
    color: dangerRed,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  emptyStateCopy: {
    gap: spacing.xs
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    textAlign: "center"
  },
  evaluationIntro: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  evaluationIntroText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  evaluationResult: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  evaluationHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  evaluationTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  evaluationTitle: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  evaluationText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  iconBubbleSmall: {
    height: 38,
    width: 38
  },
  iconBubbleLarge: {
    height: 92,
    width: 92
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipText: {
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
