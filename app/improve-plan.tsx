import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Target
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import type { ExactFinancialValueKey, ExactFinancialValues } from "../types/financial";
import {
  formatCOP,
  getPlanPrecisionStatus,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type FieldConfig = {
  id: ExactFinancialValueKey;
  label: string;
  helper: string;
  icon: ComponentType<IconProps>;
  iconColor: string;
  iconBackground: string;
};

type InputValues = Record<ExactFinancialValueKey, string>;

const fields: FieldConfig[] = [
  {
    id: "monthlyIncome",
    label: "Ingreso mensual",
    helper: "Tu ingreso promedio mensual. Puedes usar un valor aproximado.",
    icon: Banknote,
    iconColor: colors.support,
    iconBackground: colors.supportSoft
  },
  {
    id: "monthlyExpenses",
    label: "Gasto mensual",
    helper: "Lo que normalmente gastas al mes.",
    icon: ReceiptText,
    iconColor: "#B45309",
    iconBackground: colors.warningSoft
  },
  {
    id: "currentSavings",
    label: "Ahorro actual",
    helper: "Dinero disponible o reservado actualmente.",
    icon: PiggyBank,
    iconColor: colors.primary,
    iconBackground: colors.primarySoft
  },
  {
    id: "goalTargetAmount",
    label: "Monto objetivo de la meta",
    helper: "Cuánto quieres alcanzar para tu meta principal.",
    icon: Target,
    iconColor: "#7C3AED",
    iconBackground: "#F1E8FF"
  }
];

function getInitialInputValues(exactValues: ExactFinancialValues): InputValues {
  return fields.reduce<InputValues>(
    (values, field) => {
      const exactValue = exactValues[field.id];

      return {
        ...values,
        [field.id]: hasExactFinancialValue(exactValue) ? formatCOP(exactValue) : ""
      };
    },
    {
      monthlyIncome: "",
      monthlyExpenses: "",
      currentSavings: "",
      goalTargetAmount: ""
    }
  );
}

function getValuesToSave(inputValues: InputValues): ExactFinancialValues {
  return fields.reduce<ExactFinancialValues>((values, field) => {
    const parsedValue = parseCOPInput(inputValues[field.id]);

    if (parsedValue !== null) {
      values[field.id] = parsedValue;
    }

    return values;
  }, {});
}

export default function ImprovePlanScreen() {
  const router = useRouter();
  const { exactValues, onboardingSyncError, saveExactValues } = useOnboarding();
  const [inputValues, setInputValues] = useState<InputValues>(() =>
    getInitialInputValues(exactValues)
  );
  const [hasEdited, setHasEdited] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasEdited) {
      setInputValues(getInitialInputValues(exactValues));
    }
  }, [exactValues, hasEdited]);

  const valuesToSave = useMemo(() => getValuesToSave(inputValues), [inputValues]);
  const precisionStatus = useMemo(
    () => getPlanPrecisionStatus(valuesToSave),
    [valuesToSave]
  );

  const handleInputChange = (fieldId: ExactFinancialValueKey, value: string) => {
    const parsedValue = parseCOPInput(value);
    setHasEdited(true);
    setFeedback(null);
    setInputValues((currentValues) => ({
      ...currentValues,
      [fieldId]: parsedValue === null ? "" : formatCOP(parsedValue)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    const saved = await saveExactValues(valuesToSave);
    setIsSaving(false);

    if (!saved) {
      setFeedback(onboardingSyncError ?? "No pudimos guardar estos datos. Inténtalo de nuevo.");
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Pressable
            accessibilityLabel="Volver al Dashboard"
            accessibilityRole="button"
            onPress={() => router.push("/dashboard")}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={colors.primary} size={20} strokeWidth={2.4} />
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <ShieldCheck color={colors.primary} size={30} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={styles.title}>Mejorar mi plan financiero</Text>
              <Text style={styles.subtitle}>
                Tus resultados actuales pueden estar basados en rangos. Agrega algunos valores
                opcionales para calcular mejor tu margen mensual, tu fondo de emergencia y el
                avance hacia tu meta.
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{precisionStatus.state}</Text>
              </View>
              <Text style={styles.progressText}>{precisionStatus.count} de 4 datos agregados</Text>
            </View>
            <Text style={styles.helperText}>{precisionStatus.message}</Text>
          </View>

          <View style={styles.form}>
            {fields.map((field) => (
              <CurrencyField
                key={field.id}
                field={field}
                onChangeText={(value) => handleInputChange(field.id, value)}
                value={inputValues[field.id]}
              />
            ))}
          </View>

          {feedback ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          ) : null}

          <View style={styles.noticeCard}>
            <CheckCircle2 color={colors.support} size={18} strokeWidth={2.4} />
            <Text style={styles.noticeText}>
              Los 4 datos son opcionales. Puedes guardar solo lo que tengas claro y ajustar el
              resto después.
            </Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Guardar datos para mejorar mi plan financiero"
              disabled={isSaving}
              icon={CheckCircle2}
              iconPosition="right"
              onPress={handleSave}
              title={isSaving ? "Guardando..." : "Guardar datos"}
            />
            <PrimaryButton
              accessibilityLabel="Omitir y volver al Dashboard"
              icon={null}
              onPress={() => router.push("/dashboard")}
              title="Omitir"
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CurrencyField({
  field,
  value,
  onChangeText
}: {
  field: FieldConfig;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const Icon = field.icon;

  return (
    <View style={styles.fieldCard}>
      <View style={[styles.fieldIcon, { backgroundColor: field.iconBackground }]}>
        <Icon color={field.iconColor} size={22} strokeWidth={2.4} />
      </View>
      <View style={styles.fieldBody}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <Text style={styles.optionalText}>Opcional</Text>
        </View>
        <Text style={styles.fieldHelper}>{field.helper}</Text>
        <TextInput
          accessibilityLabel={field.label}
          inputMode="numeric"
          keyboardType="numeric"
          onChangeText={onChangeText}
          placeholder="$0"
          placeholderTextColor={colors.textSubtle}
          returnKeyType="done"
          style={styles.input}
          value={value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 560,
    width: "100%"
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingRight: spacing.sm
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  heroCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
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
  heroTextGroup: {
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
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statusBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  statusBadgeText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  progressText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  form: {
    gap: spacing.sm
  },
  fieldCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  fieldIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  fieldBody: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  fieldLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  fieldLabel: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  optionalText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  fieldHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption
  },
  input: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 0
  },
  noticeCard: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  noticeText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  feedbackCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  feedbackText: {
    color: "#9A5B20",
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
