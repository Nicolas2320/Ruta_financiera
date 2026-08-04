import { useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleEllipsis,
  CircleQuestionMark,
  CreditCard,
  GraduationCap,
  HeartPulse,
  History,
  House,
  Landmark,
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
import { PrimaryButton } from "../components/PrimaryButton";
import {
  SpendingSectionContent,
  SpendingSectionTabs
} from "../components/SpendingSectionTabs";
import {
  AppModal,
  AppModalAction,
  AppModalActions
} from "../components/ui/AppModal";
import { OptionalTag } from "../components/ui/OptionalTag";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  normalizeFinancialGuidanceMode,
  type DebtMonthlyPaymentType,
  type DebtPaymentRecord,
  type DebtPaymentFlexibility,
  type DebtPaymentStatus,
  type DebtRecord
} from "../types/financial";
import {
  debtPaymentStatusLabels,
  evaluateNewDebt,
  getDebtRatioLabel,
  getDebtTotalLabel,
  getRegisteredDebtSummary,
  syncDebtExpenseCategory,
  type DebtLevel,
  type NewDebtViability
} from "../utils/debtCalculations";
import {
  getDebtPaymentTotal,
  getDebtPaymentTotalForMonth,
  isDebtPaid,
  registerDebtPayment,
  removeDebtPayment
} from "../utils/debtPayments";
import { calculateFinancialSnapshot } from "../utils/financialCalculations";
import { formatCOP, formatSignedCOP, parseCOPInput } from "../utils/financialRanges";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Tone = "primary" | "support" | "warning" | "purple" | "neutral" | "danger";
type SelectableDebtPaymentType = Exclude<DebtMonthlyPaymentType, "unknown">;
type SelectableDebtPaymentFlexibility = Exclude<DebtPaymentFlexibility, "unknown">;

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
  monthlyPaymentType: SelectableDebtPaymentType | null;
  name: string;
  paymentDay: string;
  paymentFlexibility: SelectableDebtPaymentFlexibility | null;
  remainingAmount: string;
  status: DebtPaymentStatus;
  type: string;
};

type MonthYearValue = {
  month: number;
  year: number;
};

type CalendarDateValue = MonthYearValue & {
  day: number;
};

type DebtPaymentFormState = {
  amount: string;
  date: string;
  remainingAmountAfter: string;
  updatesBalance: boolean;
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
  },
  {
    icon: House,
    label: "Vivienda",
    text: "Crédito hipotecario u otra deuda de vivienda.",
    tone: "purple"
  },
  {
    icon: HeartPulse,
    label: "Salud",
    text: "Tratamiento, operación u otro saldo médico.",
    tone: "support"
  },
  {
    icon: CircleEllipsis,
    label: "Otra deuda",
    text: "Una obligación que no encaja en las anteriores.",
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

const monthlyPaymentTypeOptions: Array<{
  helper: string;
  label: string;
  tone: Tone;
  type: SelectableDebtPaymentType;
}> = [
  {
    helper: "Es la cuota mínima o pactada que exige la entidad.",
    label: "Cuota obligatoria",
    tone: "primary",
    type: "minimum_required"
  },
  {
    helper: "Es el valor acordado con una persona o entidad.",
    label: "Pago acordado",
    tone: "support",
    type: "agreed"
  },
  {
    helper: "No existe una cuota fija; este es el valor que decidiste destinar.",
    label: "Lo decidí yo",
    tone: "purple",
    type: "self_selected"
  }
];

const paymentFlexibilityOptions: Array<{
  flexibility: SelectableDebtPaymentFlexibility;
  helper: string;
  label: string;
  tone: Tone;
}> = [
  {
    flexibility: "negotiable",
    helper: "Podrías acordar otro monto o plazo.",
    label: "Sí, se puede ajustar",
    tone: "support"
  },
  {
    flexibility: "fixed",
    helper: "El valor acordado debe mantenerse.",
    label: "No, es fijo",
    tone: "primary"
  }
];

const emptyDebtForm: DebtFormState = {
  annualInterestRate: "",
  lender: "",
  monthlyPayment: "",
  monthlyPaymentType: null,
  name: "",
  paymentDay: "",
  paymentFlexibility: null,
  remainingAmount: "",
  status: "on_track",
  type: debtTypeOptions[0].label
};

function getTodayDateInput() {
  const date = new Date();
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
}

function getTodayCalendarDate(): CalendarDateValue {
  const date = new Date();

  return {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear()
  };
}

function getEmptyDebtPaymentForm(): DebtPaymentFormState {
  return {
    amount: "",
    date: getTodayDateInput(),
    remainingAmountAfter: "",
    updatesBalance: false
  };
}

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

const weekdayLabels = ["L", "M", "M", "J", "V", "S", "D"];

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

function getDaysInMonth(value: MonthYearValue) {
  return new Date(value.year, value.month + 1, 0).getDate();
}

function getCalendarDateFromInput(value: string): CalendarDateValue {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return getTodayCalendarDate();
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return getTodayCalendarDate();
  }

  return { day, month, year };
}

function getDateInputFromCalendar(value: CalendarDateValue) {
  const day = `${value.day}`.padStart(2, "0");
  const month = `${value.month + 1}`.padStart(2, "0");

  return `${day}/${month}/${value.year}`;
}

function getClampedCalendarDate(
  value: CalendarDateValue,
  patch: Partial<MonthYearValue>
): CalendarDateValue {
  const nextValue = {
    ...value,
    ...patch
  };

  return {
    ...nextValue,
    day: Math.min(nextValue.day, getDaysInMonth(nextValue))
  };
}

function isFutureCalendarDate(value: CalendarDateValue) {
  const today = getTodayCalendarDate();

  if (value.year !== today.year) {
    return value.year > today.year;
  }

  if (value.month !== today.month) {
    return value.month > today.month;
  }

  return value.day > today.day;
}

function getCalendarDateLabel(value: CalendarDateValue) {
  return new Date(value.year, value.month, value.day, 12).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getToneColors(tone: Tone) {
  if (tone === "support") {
    return {
      background: colors.supportSoft,
      border: colors.supportBorder,
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
      background: colors.dangerSoft,
      border: colors.dangerBorder,
      text: colors.danger
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
    border: colors.primaryBorder,
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

function parsePaymentDateInput(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  const today = new Date();
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > endOfToday
  ) {
    return null;
  }

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function getFormattedPaymentDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "Sin fecha";
  }

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getFormattedInterestRateInput(value: string) {
  const normalizedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = normalizedValue.split(".");
  const decimal = decimalParts.join("").slice(0, 2);

  return decimalParts.length > 0 ? `${whole.slice(0, 3)}.${decimal}` : whole.slice(0, 3);
}

function parseInterestRateInput(value: string) {
  if (!value.trim()) {
    return null;
  }

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

function getMonthlyPaymentLabel(debt: DebtRecord) {
  if (isDebtPaid(debt)) {
    return "Último pago";
  }

  switch (debt.monthlyPaymentType) {
    case "minimum_required":
      return "Cuota obligatoria";
    case "agreed":
      return "Pago acordado";
    case "self_selected":
      return "Pago planeado";
    default:
      return "Pago mensual";
  }
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
    return "Antes de asumir una nueva deuda, conviene revisar qué deuda genera más presión.";
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
  tone = "neutral",
  compact = false
}: {
  label: string;
  value: string;
  tone?: Tone;
  compact?: boolean;
}) {
  const { isPhone } = useResponsiveLayout();
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.summaryMetric,
        compact && styles.summaryMetricCompact,
        compact && isPhone && styles.summaryMetricCompactPhone,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <Text style={[styles.summaryMetricLabel, compact && styles.summaryMetricLabelCompact]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryMetricValue,
          compact && styles.summaryMetricValueCompact,
          { color: toneColors.text }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function CurrencyInput({
  label,
  value,
  onChangeText,
  optional,
  stacked = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
  stacked?: boolean;
}) {
  return (
    <View style={[styles.inputGroup, stacked && styles.stackedInputGroup]}>
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
      {optional ? <OptionalTag /> : null}
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

function SegmentedQuestion<T extends string>({
  helper,
  label,
  onChange,
  options,
  value
}: {
  helper: string;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ helper: string; label: string; tone: Tone; value: T }>;
  value: T | null;
}) {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <View style={styles.segmentedQuestion}>
      <View style={styles.segmentedQuestionCopy}>
        <InputLabel label={label} />
        <Text style={styles.inputHelper}>{helper}</Text>
      </View>
      <View style={styles.segmentedQuestionControl}>
        <View style={styles.segmentedControl}>
          {options.map((option) => {
            const selected = option.value === value;
            const toneColors = getToneColors(option.tone);

            return (
              <Pressable
                accessibilityLabel={`${option.label}. ${option.helper}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => onChange(option.value)}
                style={({ pressed }) => [
                  styles.segmentedOption,
                  selected && {
                    backgroundColor: toneColors.background,
                    borderColor: toneColors.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[styles.segmentedOptionText, selected && { color: toneColors.text }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.segmentedSelectionHelper}>
          {selectedOption?.helper ?? "Elige una opción para continuar."}
        </Text>
      </View>
    </View>
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

function PaymentDateSelectionModal({
  visible,
  value,
  onChange,
  onClose,
  onConfirm
}: {
  visible: boolean;
  value: CalendarDateValue;
  onChange: (value: CalendarDateValue) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const today = getTodayCalendarDate();
  const canSelectNextMonth =
    value.year < today.year || (value.year === today.year && value.month < today.month);
  const firstWeekday = (new Date(value.year, value.month, 1, 12).getDay() + 6) % 7;
  const daysInMonth = getDaysInMonth(value);
  const calendarCellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(value.year, value.month + offset, 1, 12);
    const nextValue = getClampedCalendarDate(value, {
      month: nextMonth.getMonth(),
      year: nextMonth.getFullYear()
    });
    onChange(isFutureCalendarDate(nextValue) ? today : nextValue);
  };

  return (
    <AppModal
      footer={
        <AppModalActions>
          <AppModalAction label="Cancelar" onPress={onClose} variant="secondary" />
          <AppModalAction label="Usar fecha" onPress={onConfirm} />
        </AppModalActions>
      }
      icon={<CalendarDays color={colors.primary} size={23} strokeWidth={2.4} />}
      onClose={onClose}
      scrollable
      size="compact"
      title="Fecha del pago"
      visible={visible}
    >
      <View style={[styles.monthYearPreview, styles.calendarPreview]}>
        <Text style={[styles.monthYearPreviewText, styles.calendarPreviewText]}>
          {getCalendarDateLabel(value)}
        </Text>
      </View>

      <View style={styles.calendarMonthControls}>
        <Pressable
          accessibilityLabel="Mes anterior"
          accessibilityRole="button"
          onPress={() => changeMonth(-1)}
          style={({ pressed }) => [styles.yearButton, pressed && styles.pressed]}
        >
          <ChevronLeft color={colors.primary} size={18} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.calendarMonthValue}>{formatMonthYear(value)}</Text>
        <Pressable
          accessibilityLabel="Mes siguiente"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSelectNextMonth }}
          disabled={!canSelectNextMonth}
          onPress={() => changeMonth(1)}
          style={({ pressed }) => [
            styles.yearButton,
            !canSelectNextMonth && styles.yearButtonDisabled,
            pressed && canSelectNextMonth && styles.pressed
          ]}
        >
          <ChevronRight
            color={canSelectNextMonth ? colors.primary : colors.textSubtle}
            size={18}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      <Text style={styles.modalSectionLabel}>Día</Text>
      <View style={styles.calendarWeekdayRow}>
        {weekdayLabels.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.calendarWeekday}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.calendarDayGrid}>
        {Array.from({ length: calendarCellCount }, (_, index) => {
          const day = index - firstWeekday + 1;

          if (day < 1 || day > daysInMonth) {
            return <View key={`empty-${index}`} style={styles.calendarDayPlaceholder} />;
          }

          const candidate = { day, month: value.month, year: value.year };
          const selected = day === value.day;
          const disabled = isFutureCalendarDate(candidate);

          return (
            <Pressable
              accessibilityLabel={getCalendarDateLabel(candidate)}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={day}
              onPress={() => onChange(candidate)}
              style={({ pressed }) => [
                styles.calendarDayButton,
                selected && styles.calendarDayButtonSelected,
                disabled && styles.calendarDayButtonDisabled,
                pressed && !disabled && styles.pressed
              ]}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  selected && styles.calendarDayTextSelected,
                  disabled && styles.calendarDayTextDisabled
                ]}
              >
                {day}
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
          Agrega un nombre, el saldo pendiente y la cuota mensual. Los demás datos son opcionales.
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
  onDelete,
  onPayments
}: {
  debt: DebtRecord;
  onEdit: () => void;
  onDelete: () => void;
  onPayments: () => void;
}) {
  const typeOption = getDebtTypeOption(debt.type);
  const Icon = typeOption.icon;
  const paymentCount = debt.payments?.length ?? 0;
  const paymentTotal = getDebtPaymentTotal(debt);
  const paid = isDebtPaid(debt);
  const statusTone =
    paid || debt.status === "on_track"
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
        <Chip label={paid ? "Pagada" : debtPaymentStatusLabels[debt.status]} tone={statusTone} />
      </View>

      <View style={styles.debtCardMetrics}>
        <SummaryMetric
          compact
          label={getMonthlyPaymentLabel(debt)}
          tone="primary"
          value={formatCOP(debt.monthlyPayment)}
        />
        <SummaryMetric
          compact
          label="Saldo pendiente"
          tone="warning"
          value={getOptionalAmountLabel(debt.remainingAmount)}
        />
        <SummaryMetric
          compact
          label="Día límite"
          tone="neutral"
          value={getPaymentDayLabel(debt.paymentDay)}
        />
        <SummaryMetric
          compact
          label="Tasa anual"
          tone="purple"
          value={getInterestRateLabel(debt.annualInterestRate)}
        />
      </View>

      <View
        accessibilityLabel={`${paymentCount} ${paymentCount === 1 ? "aporte registrado" : "aportes registrados"} por un total de ${formatCOP(paymentTotal)}`}
        accessible
        style={styles.debtPaymentOverview}
      >
        <View style={styles.debtPaymentOverviewItem}>
          <Text style={styles.debtPaymentOverviewLabel}>Aportes registrados</Text>
          <Text style={styles.debtPaymentOverviewValue}>
            {paymentCount} {paymentCount === 1 ? "aporte" : "aportes"}
          </Text>
        </View>
        <View style={styles.debtPaymentOverviewDivider} />
        <View style={styles.debtPaymentOverviewItem}>
          <Text style={styles.debtPaymentOverviewLabel}>Valor total</Text>
          <Text style={styles.debtPaymentOverviewValue}>{formatCOP(paymentTotal)}</Text>
        </View>
      </View>

      <View style={styles.debtCardActions}>
        <PrimaryButton
          accessibilityLabel={`Eliminar deuda ${getDebtTitle(debt)}`}
          icon={null}
          onPress={onDelete}
          size="compact"
          title="Eliminar"
          variant="danger"
        />
        <PrimaryButton
          accessibilityLabel={`Editar deuda ${getDebtTitle(debt)}`}
          icon={null}
          onPress={onEdit}
          size="compact"
          style={styles.debtActionEdit}
          title="Editar"
          variant="secondary"
        />
        <PrimaryButton
          accessibilityLabel={`Registrar pago para ${getDebtTitle(debt)}`}
          icon={null}
          onPress={onPayments}
          size="compact"
          style={styles.debtActionPayment}
          title="Registrar pago"
        />
      </View>
    </View>
  );
}

function DebtPaymentsModal({
  canSave,
  debt,
  form,
  onClose,
  onOpenDatePicker,
  onRequestDelete,
  onSave,
  onUpdate
}: {
  canSave: boolean;
  debt: DebtRecord | null;
  form: DebtPaymentFormState;
  onClose: () => void;
  onOpenDatePicker: () => void;
  onRequestDelete: (payment: DebtPaymentRecord) => void;
  onSave: () => void;
  onUpdate: (patch: Partial<DebtPaymentFormState>) => void;
}) {
  const payments = debt?.payments ?? [];
  const paymentTotal = debt ? getDebtPaymentTotal(debt) : 0;
  const monthlyPaymentTotal = debt ? getDebtPaymentTotalForMonth(debt) : 0;
  const nextRemainingAmount = form.updatesBalance
    ? parseCOPInput(form.remainingAmountAfter)
    : null;

  return (
    <AppModal
      footer={
        <AppModalActions>
          <AppModalAction label="Cancelar" onPress={onClose} variant="secondary" />
          <AppModalAction
            disabled={!canSave}
            icon={
              <CheckCircle2
                color={canSave ? colors.surface : colors.textSubtle}
                size={19}
                strokeWidth={2.5}
              />
            }
            label="Guardar pago"
            onPress={onSave}
          />
        </AppModalActions>
      }
      icon={<History color={colors.primary} size={23} strokeWidth={2.4} />}
      onClose={onClose}
      scrollable
      size="compact"
      subtitle="Guarda el pago y actualiza el saldo solo si conoces la cifra nueva."
      title={debt ? `Pagos de ${getDebtTitle(debt)}` : "Pagos de la deuda"}
      visible={Boolean(debt)}
    >
      {debt ? (
        <>
          <View style={styles.paymentSummary}>
            <View style={styles.paymentSummaryItem}>
              <Text style={styles.paymentSummaryLabel}>Saldo pendiente</Text>
              <Text style={styles.paymentSummaryValue}>
                {getOptionalAmountLabel(debt.remainingAmount)}
              </Text>
            </View>
            <View style={styles.paymentSummaryItem}>
              <Text style={styles.paymentSummaryLabel}>Pagado este mes</Text>
              <Text style={styles.paymentSummaryValue}>{formatCOP(monthlyPaymentTotal)}</Text>
            </View>
            <View style={styles.paymentSummaryItem}>
              <Text style={styles.paymentSummaryLabel}>Total registrado</Text>
              <Text style={styles.paymentSummaryValue}>{formatCOP(paymentTotal)}</Text>
            </View>
          </View>

          <View style={styles.paymentFormSection}>
            <Text style={styles.paymentSectionTitle}>Registrar un pago</Text>
            <CurrencyInput
              label="Monto pagado"
              onChangeText={(amount) => onUpdate({ amount })}
              stacked
              value={form.amount}
            />
            <View style={[styles.inputGroup, styles.stackedInputGroup]}>
              <InputLabel label="Fecha del pago" />
              <Pressable
                accessibilityLabel={`Seleccionar fecha del pago. Fecha actual: ${getCalendarDateLabel(getCalendarDateFromInput(form.date))}`}
                accessibilityRole="button"
                onPress={onOpenDatePicker}
                style={({ pressed }) => [styles.monthYearField, pressed && styles.pressed]}
              >
                <CalendarDays color={colors.primary} size={20} strokeWidth={2.4} />
                <Text style={styles.monthYearFieldText}>
                  {getCalendarDateLabel(getCalendarDateFromInput(form.date))}
                </Text>
                <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: form.updatesBalance }}
              onPress={() =>
                onUpdate({
                  remainingAmountAfter: form.updatesBalance
                    ? ""
                    : debt.remainingAmount !== null && debt.remainingAmount !== undefined
                      ? formatCOP(debt.remainingAmount)
                      : "",
                  updatesBalance: !form.updatesBalance
                })
              }
              style={({ pressed }) => [styles.balanceToggle, pressed && styles.pressed]}
            >
              {form.updatesBalance ? (
                <CheckCircle2 color={colors.primary} size={18} strokeWidth={2.4} />
              ) : (
                <Plus color={colors.primary} size={18} strokeWidth={2.4} />
              )}
              <Text style={styles.balanceToggleText}>
                {form.updatesBalance ? "No actualizar el saldo" : "Actualizar saldo pendiente"}
              </Text>
              {!form.updatesBalance ? <OptionalTag /> : null}
            </Pressable>

            {form.updatesBalance ? (
              <View style={styles.balanceUpdateArea}>
                <CurrencyInput
                  label="Saldo pendiente actual"
                  onChangeText={(remainingAmountAfter) => onUpdate({ remainingAmountAfter })}
                  stacked
                  value={form.remainingAmountAfter}
                />
                <Text style={styles.paymentHelperText}>
                  {nextRemainingAmount === 0
                    ? "La deuda quedará marcada como pagada y su cuota dejará de contar en tus cálculos."
                    : "Usaremos esta cifra como el saldo actual, aunque el pago sea de otra fecha. No lo restamos automáticamente porque puede incluir intereses u otros cobros."}
                </Text>
              </View>
            ) : (
              <Text style={styles.paymentHelperText}>
                El pago quedará en el historial sin cambiar el saldo pendiente.
              </Text>
            )}
          </View>

          <View style={styles.paymentHistorySection}>
            <View style={styles.paymentHistoryHeader}>
              <Text style={styles.paymentSectionTitle}>Historial</Text>
              <Chip
                label={`${payments.length} ${payments.length === 1 ? "pago" : "pagos"}`}
                tone={payments.length > 0 ? "support" : "neutral"}
              />
            </View>
            {payments.length > 0 ? (
              <View style={styles.paymentHistoryList}>
                {payments.map((payment) => (
                  <View key={payment.id} style={styles.paymentHistoryRow}>
                    <View style={styles.paymentHistoryCopy}>
                      <Text style={styles.paymentHistoryAmount}>{formatCOP(payment.amount)}</Text>
                      <Text style={styles.paymentHistoryDate}>
                        {getFormattedPaymentDate(payment.date)}
                        {payment.reportedRemainingAmount !== null &&
                        payment.reportedRemainingAmount !== undefined
                          ? ` · Saldo actualizado: ${formatCOP(payment.reportedRemainingAmount)}`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Eliminar pago de ${formatCOP(payment.amount)}`}
                      accessibilityRole="button"
                      onPress={() => onRequestDelete(payment)}
                      style={({ pressed }) => [
                        styles.paymentDeleteButton,
                        pressed && styles.pressed
                      ]}
                    >
                      <Trash2 color={colors.danger} size={18} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.paymentHistoryEmpty}>
                Aún no hay pagos registrados para esta deuda.
              </Text>
            )}
          </View>
        </>
      ) : null}
    </AppModal>
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
          label="Nombre de la deuda"
          onChangeText={(value) => onUpdate({ name: value })}
          value={debtForm.name}
        />
        <CurrencyInput
          label="Cuánto falta por pagar"
          onChangeText={(value) => onUpdate({ remainingAmount: value })}
          value={debtForm.remainingAmount}
        />
        <CurrencyInput
          label="Cuánto planeas pagar al mes"
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
          label="Tasa efectiva anual (E.A.)"
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

      <SegmentedQuestion
        helper="Define qué parte del pago debe respetar la simulación antes de repartir el resto."
        label="¿Qué representa ese pago mensual?"
        onChange={(type) =>
          onUpdate({
            monthlyPaymentType: type,
            paymentFlexibility:
              type === "minimum_required"
                ? "fixed"
                : type === "self_selected"
                  ? "negotiable"
                  : debtForm.monthlyPaymentType === "agreed"
                    ? debtForm.paymentFlexibility
                    : null
          })
        }
        options={monthlyPaymentTypeOptions.map((option) => ({
          helper: option.helper,
          label: option.label,
          tone: option.tone,
          value: option.type
        }))}
        value={debtForm.monthlyPaymentType}
      />

      {debtForm.monthlyPaymentType === "agreed" ? (
        <SegmentedQuestion
          helper="La simulación no reducirá este pago por sí sola; esta respuesta indica si puedes renegociarlo."
          label="¿Ese acuerdo se puede ajustar?"
          onChange={(paymentFlexibility) => onUpdate({ paymentFlexibility })}
          options={paymentFlexibilityOptions.map((option) => ({
            helper: option.helper,
            label: option.label,
            tone: option.tone,
            value: option.flexibility
          }))}
          value={debtForm.paymentFlexibility}
        />
      ) : null}

      <View style={styles.formQuestionSection}>
        <View style={styles.formQuestionCopy}>
          <InputLabel label="¿Cómo va actualmente el pago de esta deuda?" />
          <Text style={styles.inputHelper}>
            Esto describe tu situación actual; no cambia si la cuota es obligatoria o voluntaria.
          </Text>
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
  const [newDebtPayment, setNewDebtPayment] = useState("");
  const [newDebtStart, setNewDebtStart] = useState<MonthYearValue>(() => getCurrentMonthYear());
  const [draftNewDebtStart, setDraftNewDebtStart] = useState<MonthYearValue>(() =>
    getCurrentMonthYear()
  );
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [debtPendingDelete, setDebtPendingDelete] = useState<DebtRecord | null>(null);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<DebtPaymentFormState>(() =>
    getEmptyDebtPaymentForm()
  );
  const [paymentPendingDelete, setPaymentPendingDelete] =
    useState<DebtPaymentRecord | null>(null);
  const [isPaymentDatePickerOpen, setIsPaymentDatePickerOpen] = useState(false);
  const [draftPaymentDate, setDraftPaymentDate] = useState<CalendarDateValue>(() =>
    getTodayCalendarDate()
  );
  const isSavingPaymentRef = useRef(false);
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
  const hasOnlyPaidDebts = debts.length > 0 && debts.every(isDebtPaid);
  const debtFormRemainingAmount = parseCOPInput(debtForm.remainingAmount);
  const debtFormMonthlyPayment = parseCOPInput(debtForm.monthlyPayment);
  const hasCompleteDebtClassification = Boolean(
    debtForm.monthlyPaymentType &&
      (debtForm.monthlyPaymentType !== "agreed" || debtForm.paymentFlexibility)
  );
  const canSaveDebt = Boolean(
    debtForm.name.trim() &&
      debtFormRemainingAmount !== null &&
      (editingDebtId ? debtFormRemainingAmount >= 0 : debtFormRemainingAmount > 0) &&
      debtFormMonthlyPayment !== null &&
      debtFormMonthlyPayment > 0 &&
      hasCompleteDebtClassification
  );
  const paymentDebt = debts.find((debt) => debt.id === paymentDebtId) ?? null;
  const paymentAmount = parseCOPInput(paymentForm.amount);
  const paymentDate = parsePaymentDateInput(paymentForm.date);
  const paymentRemainingAmount = paymentForm.updatesBalance
    ? parseCOPInput(paymentForm.remainingAmountAfter)
    : null;
  const canSavePayment = Boolean(
    paymentDebt &&
      paymentAmount !== null &&
      paymentAmount > 0 &&
      paymentDate &&
      (!paymentForm.updatesBalance || paymentRemainingAmount !== null)
  );
  const updateDebtForm = (patch: Partial<DebtFormState>) => {
    setDebtForm((current) => ({
      ...current,
      ...patch
    }));
  };

  const updateDebts = (nextDebts: DebtRecord[]) => {
    updateOnboarding({
      debts: nextDebts,
      ...syncDebtExpenseCategory({
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
      monthlyPaymentType:
        debt.monthlyPaymentType && debt.monthlyPaymentType !== "unknown"
          ? debt.monthlyPaymentType
          : null,
      name: debt.name ?? "",
      paymentDay: debt.paymentDay ? `${debt.paymentDay}` : "",
      paymentFlexibility:
        debt.paymentFlexibility && debt.paymentFlexibility !== "unknown"
          ? debt.paymentFlexibility
          : null,
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
    const name = debtForm.name.trim();
    const remainingAmount = debtFormRemainingAmount;
    const monthlyPayment = debtFormMonthlyPayment;

    if (
      !name ||
      remainingAmount === null ||
      (editingDebtId ? remainingAmount < 0 : remainingAmount <= 0) ||
      monthlyPayment === null ||
      monthlyPayment <= 0 ||
      !hasCompleteDebtClassification ||
      debtForm.monthlyPaymentType === null
    ) {
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
      name,
      lender: debtForm.lender.trim() || null,
      remainingAmount,
      monthlyPayment,
      monthlyPaymentType: debtForm.monthlyPaymentType,
      minimumMonthlyPayment:
        debtForm.monthlyPaymentType === "minimum_required"
          ? monthlyPayment
          : debtForm.monthlyPaymentType === "self_selected"
            ? 0
            : null,
      paymentFlexibility:
        debtForm.monthlyPaymentType === "minimum_required"
          ? "fixed"
          : debtForm.monthlyPaymentType === "self_selected"
            ? "negotiable"
            : debtForm.monthlyPaymentType === "agreed"
              ? (debtForm.paymentFlexibility ?? "fixed")
              : "fixed",
      annualInterestRate: parseInterestRateInput(debtForm.annualInterestRate),
      status: debtForm.status,
      paymentDay: normalizedPaymentDay,
      payments: existingDebt?.payments ?? [],
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

  const openDebtPayments = (debt: DebtRecord) => {
    isSavingPaymentRef.current = false;
    setPaymentDebtId(debt.id);
    setPaymentForm(getEmptyDebtPaymentForm());
    setPaymentPendingDelete(null);
    setIsPaymentDatePickerOpen(false);
  };

  const closeDebtPayments = () => {
    setPaymentDebtId(null);
    setPaymentForm(getEmptyDebtPaymentForm());
    setPaymentPendingDelete(null);
    setIsPaymentDatePickerOpen(false);
  };

  const updatePaymentForm = (patch: Partial<DebtPaymentFormState>) => {
    setPaymentForm((current) => ({
      ...current,
      ...patch
    }));
  };

  const savePayment = () => {
    if (isSavingPaymentRef.current || !paymentDebt || !paymentAmount || !paymentDate) {
      return;
    }

    if (paymentForm.updatesBalance && paymentRemainingAmount === null) {
      return;
    }

    isSavingPaymentRef.current = true;

    updateDebts(
      registerDebtPayment(debts, paymentDebt.id, {
        amount: paymentAmount,
        date: paymentDate,
        reportedRemainingAmount: paymentForm.updatesBalance
          ? paymentRemainingAmount
          : undefined
      })
    );
    closeDebtPayments();
  };

  const confirmDeletePayment = () => {
    if (!paymentDebt || !paymentPendingDelete) {
      return;
    }

    updateDebts(removeDebtPayment(debts, paymentDebt.id, paymentPendingDelete.id));
    setPaymentPendingDelete(null);
  };

  const openPaymentDatePicker = () => {
    setDraftPaymentDate(getCalendarDateFromInput(paymentForm.date));
    setIsPaymentDatePickerOpen(true);
  };

  const confirmPaymentDatePicker = () => {
    updatePaymentForm({ date: getDateInputFromCalendar(draftPaymentDate) });
    setIsPaymentDatePickerOpen(false);
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
                {hasOnlyPaidDebts
                  ? "No tienes cuotas activas. Conservamos tus deudas pagadas y su historial."
                  : getDebtInsight({
                      count: debtSummary.count,
                      level: debtSummary.level,
                      monthlyPaymentTotal: debtSummary.monthlyPaymentTotal,
                      source: debtSummary.source
                    })}
              </Text>
              <View style={styles.guidanceNote}>
                <Text style={styles.guidanceNoteText}>
                  {debtSummary.source === "reported"
                    ? "Puedes agregar tus cuotas cuando quieras mejorar la precisión."
                    : "Aquí van pagos con un saldo pendiente que terminarás de pagar."}
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
                <Text style={styles.primaryButtonText}>Agregar deuda</Text>
                <Plus color={colors.surface} size={20} strokeWidth={2.5} />
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
                    onPayments={() => openDebtPayments(debt)}
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
                accessibilityLabel="Explicar cómo se evalúa una nueva deuda"
                guidanceMode={guidanceMode}
                icon={<Banknote color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Cómo evaluamos una nueva deuda"
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
                  definition="Comparamos todas tus cuotas mensuales con tus ingresos y revisamos cuánto margen quedaría después de agregar la nueva deuda."
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
            title="Evaluar nueva deuda"
            subtitle="Revisa si una nueva cuota mensual cabe en tu presupuesto antes de decidir."
          >
            <View style={styles.evaluationIntro}>
              <AlertCircle color={colors.support} size={20} strokeWidth={2.4} />
              <Text style={styles.evaluationIntroText}>
                Esto no compara entidades ni reemplaza asesoría. Solo estima si una nueva cuota cabe
                dentro de tu mes con los datos actuales.
              </Text>
            </View>

            <View style={styles.inputGrid}>
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
        subtitle="El nombre, el saldo pendiente y el pago mensual planeado son obligatorios."
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

      <DebtPaymentsModal
        canSave={canSavePayment}
        debt={paymentPendingDelete || isPaymentDatePickerOpen ? null : paymentDebt}
        form={paymentForm}
        onClose={closeDebtPayments}
        onOpenDatePicker={openPaymentDatePicker}
        onRequestDelete={setPaymentPendingDelete}
        onSave={savePayment}
        onUpdate={updatePaymentForm}
      />

      <PaymentDateSelectionModal
        onChange={setDraftPaymentDate}
        onClose={() => setIsPaymentDatePickerOpen(false)}
        onConfirm={confirmPaymentDatePicker}
        value={draftPaymentDate}
        visible={isPaymentDatePickerOpen}
      />

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={() => setPaymentPendingDelete(null)}
              variant="secondary"
            />
            <AppModalAction
              label="Eliminar pago"
              onPress={confirmDeletePayment}
              variant="danger"
            />
          </AppModalActions>
        }
        icon={<Trash2 color={colors.surface} size={22} strokeWidth={2.4} />}
        iconBackgroundColor={colors.danger}
        onClose={() => setPaymentPendingDelete(null)}
        size="compact"
        title="Eliminar pago"
        visible={Boolean(paymentPendingDelete)}
      >
        <Text style={styles.modalText}>
          {paymentPendingDelete
            ? `¿Quieres eliminar el pago de ${formatCOP(paymentPendingDelete.amount)}? Si este pago definió el saldo actual, restauraremos el saldo anterior.`
            : "¿Quieres eliminar este pago?"}
        </Text>
      </AppModal>

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction
              label="Cancelar"
              onPress={() => setDebtPendingDelete(null)}
              variant="secondary"
            />
            <AppModalAction
              label="Eliminar deuda"
              onPress={confirmDeleteDebt}
              variant="danger"
            />
          </AppModalActions>
        }
        icon={<Trash2 color={colors.surface} size={22} strokeWidth={2.4} />}
        iconBackgroundColor={colors.danger}
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
    borderColor: colors.supportBorder,
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
  summaryMetricCompact: {
    flexBasis: 135,
    gap: 2,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  summaryMetricLabelCompact: {
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  summaryMetricValueCompact: {
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
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
    borderColor: colors.primaryBorder,
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
  formQuestionSection: {
    borderColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    width: "100%"
  },
  formQuestionCopy: {
    gap: spacing.xs
  },
  segmentedQuestion: {
    alignItems: "flex-start",
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingTop: spacing.md,
    width: "100%"
  },
  segmentedQuestionCopy: {
    flexBasis: 230,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  segmentedQuestionControl: {
    flexBasis: 360,
    flexGrow: 2,
    gap: spacing.xs,
    minWidth: 0
  },
  segmentedControl: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    padding: 3
  },
  segmentedOption: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs
  },
  segmentedOptionText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  segmentedSelectionHelper: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    paddingHorizontal: spacing.xs
  },
  stackedInputGroup: {
    flexBasis: "auto",
    flexGrow: 0
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
  inputErrorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
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
    borderColor: colors.primaryBorder,
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
    borderColor: colors.primaryBorder,
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
  calendarPreview: {
    justifyContent: "center",
    minHeight: 52,
    paddingVertical: spacing.sm
  },
  calendarPreviewText: {
    textAlign: "center"
  },
  calendarMonthControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  calendarMonthValue: {
    color: colors.text,
    flex: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    textAlign: "center"
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
  calendarWeekdayRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  calendarWeekday: {
    color: colors.textSubtle,
    flexBasis: "12%",
    flexGrow: 1,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  calendarDayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  calendarDayPlaceholder: {
    flexBasis: "12%",
    flexGrow: 1,
    minHeight: 38
  },
  calendarDayButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: "12%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 38
  },
  calendarDayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  calendarDayButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.5
  },
  calendarDayText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  calendarDayTextSelected: {
    color: colors.surface,
    fontWeight: typography.weight.black
  },
  calendarDayTextDisabled: {
    color: colors.textSubtle
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
    backgroundColor: colors.disabledBorder
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
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
    gap: spacing.sm,
    padding: spacing.sm
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
    gap: spacing.xs
  },
  debtCardActions: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    width: "100%"
  },
  debtPaymentOverview: {
    alignItems: "stretch",
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  summaryMetricCompactPhone: {
    flexBasis: "46%",
    minWidth: 0
  },
  debtPaymentOverviewItem: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minWidth: 0
  },
  debtPaymentOverviewDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.supportBorder,
    width: 1
  },
  debtPaymentOverviewLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  debtPaymentOverviewValue: {
    color: colors.support,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  debtActionEdit: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  debtActionPayment: {
    marginLeft: "auto"
  },
  paymentSummary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md
  },
  paymentSummaryItem: {
    flexBasis: 120,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  paymentSummaryLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  paymentSummaryValue: {
    color: colors.primary,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  paymentFormSection: {
    gap: spacing.md
  },
  paymentSectionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  balanceToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    minHeight: 44
  },
  balanceToggleText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  balanceUpdateArea: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  paymentHelperText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  paymentHistorySection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  paymentHistoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  paymentHistoryList: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1
  },
  paymentHistoryRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 62,
    paddingVertical: spacing.sm
  },
  paymentHistoryCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  paymentHistoryAmount: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  paymentHistoryDate: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  paymentDeleteButton: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  paymentHistoryEmpty: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryBorder,
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
    borderColor: colors.supportBorder,
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
