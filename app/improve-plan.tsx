import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Banknote,
  CheckCircle2,
  Coffee,
  PiggyBank,
  ReceiptText,
  ShieldCheck
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { FinancialEducationCarousel } from "../components/FinancialEducationCarousel";
import { FinancialEducationModal } from "../components/FinancialEducationModal";
import { OptionalTag } from "../components/ui/OptionalTag";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  normalizeFinancialGuidanceMode,
  type ExactFinancialValueKey,
  type ExactFinancialValues,
  type FinancialGuidanceMode
} from "../types/financial";
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

type PlanFinancialValueKey = Exclude<ExactFinancialValueKey, "monthlyDebtPayments">;

type FieldConfig = {
  id: PlanFinancialValueKey;
  label: string;
  helper: string;
  icon: ComponentType<IconProps>;
  iconColor: string;
  iconBackground: string;
  education: {
    avoid: string;
    definition: string;
    examples: string[];
  };
};

type InputValues = Record<PlanFinancialValueKey, string>;

const fields: FieldConfig[] = [
  {
    id: "monthlyIncome",
    label: "Ingreso mensual",
    helper: "Tu ingreso promedio mensual. Puedes usar un valor aproximado.",
    icon: Banknote,
    iconColor: colors.support,
    iconBackground: colors.supportSoft,
    education: {
      definition:
        "Es el dinero que normalmente recibes durante un mes y que puedes usar para cubrir gastos o metas.",
      examples: [
        "Salario neto después de descuentos.",
        "Promedio mensual de ingresos variables o independientes."
      ],
      avoid:
        "No incluyas préstamos, reembolsos ni ingresos excepcionales que no esperas recibir cada mes."
    }
  },
  {
    id: "monthlyExpenses",
    label: "Gastos principales al mes",
    helper: "Gastos habituales sin sumar cuotas de deuda ni gastos pequeños.",
    icon: ReceiptText,
    iconColor: "#B45309",
    iconBackground: colors.warningSoft,
    education: {
      definition:
        "Es el monto aproximado que utilizas en un mes para vivienda, alimentación, transporte, servicios y otros gastos habituales.",
      examples: [
        "Suma gastos fijos y un promedio de los variables.",
        "Puedes apoyarte en uno o varios extractos recientes."
      ],
      avoid:
        "No incluyas cuotas de préstamos o tarjetas ni los gastos pequeños que registras por separado."
    }
  },
  {
    id: "currentSavings",
    label: "Ahorro disponible general",
    helper: "Dinero disponible fuera del ahorro específico de tus metas.",
    icon: PiggyBank,
    iconColor: colors.primary,
    iconBackground: colors.primarySoft,
    education: {
      definition:
        "Es el dinero que ya tienes disponible como respaldo general y que aún no está reservado para una meta concreta.",
      examples: [
        "Saldo de una cuenta o bolsillo destinado a imprevistos.",
        "Efectivo disponible que consideras parte de tu ahorro."
      ],
      avoid:
        "No incluyas el ahorro ya registrado dentro de una meta ni dinero que necesitas para pagar gastos del mes."
    }
  },
  {
    id: "smallExpenses",
    label: "Gastos pequeños mensuales",
    helper: "Monto aproximado que se va en consumos pequeños frecuentes.",
    icon: Coffee,
    iconColor: "#7C3AED",
    iconBackground: "#F1E8FF",
    education: {
      definition:
        "Son consumos de bajo valor que se repiten y pueden pasar desapercibidos al revisar el presupuesto.",
      examples: [
        "Café, domicilios, snacks, compras rápidas o suscripciones pequeñas.",
        "Usa un promedio mensual; no necesitas registrar cada compra."
      ],
      avoid:
        "No incluyas aquí servicios, arriendo, transporte habitual u otros gastos que ya formen parte de tus gastos principales."
    }
  }
];

function getFieldEducationSlides(
  field: FieldConfig,
  guidanceMode: FinancialGuidanceMode
): ReactNode[] {
  const definitionSlide = (
    <View style={styles.educationSlide}>
      <Text style={styles.educationTitle}>Qué significa</Text>
      <View style={styles.educationDefinitionCard}>
        <Text style={styles.educationText}>{field.education.definition}</Text>
      </View>
    </View>
  );
  const examplesSlide = (
    <View style={styles.educationSlide}>
      <Text style={styles.educationTitle}>Qué puedes incluir</Text>
      <View style={styles.educationExamples}>
        {field.education.examples.map((example) => (
          <View key={example} style={styles.educationExampleRow}>
            <View style={styles.educationDot} />
            <Text style={styles.educationText}>{example}</Text>
          </View>
        ))}
      </View>
    </View>
  );
  const avoidSlide = (
    <View style={styles.educationSlide}>
      <Text style={styles.educationTitle}>Evita duplicar información</Text>
      <View style={styles.educationWarningCard}>
        <Text style={styles.educationText}>{field.education.avoid}</Text>
      </View>
    </View>
  );

  if (guidanceMode === "guided") {
    return [definitionSlide, examplesSlide, avoidSlide];
  }

  if (guidanceMode === "brief") {
    return [
      definitionSlide,
      <View style={styles.educationSlide}>
        {examplesSlide}
        {avoidSlide}
      </View>
    ];
  }

  return [
    <View style={styles.educationSlide}>
      {definitionSlide}
      {avoidSlide}
    </View>
  ];
}

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
      smallExpenses: ""
    }
  );
}

function getValuesToSave(
  inputValues: InputValues,
  reportedNoSmallExpenses: boolean
): ExactFinancialValues {
  const values = fields.reduce<ExactFinancialValues>((draftValues, field) => {
    const parsedValue = parseCOPInput(inputValues[field.id]);

    if (parsedValue !== null) {
      draftValues[field.id] = parsedValue;
    }

    return draftValues;
  }, {});

  if (reportedNoSmallExpenses) {
    delete values.smallExpenses;
  }

  return values;
}

function getComparableExactValue(values: ExactFinancialValues, fieldId: PlanFinancialValueKey) {
  const value = values[fieldId];
  return hasExactFinancialValue(value) ? value : null;
}

function hasUnsavedExactValueChanges(
  savedValues: ExactFinancialValues,
  draftValues: ExactFinancialValues
) {
  return fields.some(
    (field) =>
      getComparableExactValue(savedValues, field.id) !==
      getComparableExactValue(draftValues, field.id)
  );
}

export default function ImprovePlanScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const { exactValues, onboarding, onboardingSyncError, saveExactValues } = useOnboarding();
  const guidanceMode = normalizeFinancialGuidanceMode(
    onboarding.financialGuidanceMode
  );
  const reportedNoSmallExpenses = onboarding.hasSmallExpenses === "No";
  const monthlyExpensesIncludeSmallExpenses =
    onboarding.monthlyExpensesIncludesSmallExpenses === true;
  const effectiveExactValues = useMemo(
    () =>
      reportedNoSmallExpenses
        ? { ...exactValues, smallExpenses: 0 }
        : exactValues,
    [exactValues, reportedNoSmallExpenses]
  );
  const visibleFields = useMemo(
    () => {
      const availableFields = reportedNoSmallExpenses
        ? fields.filter((field) => field.id !== "smallExpenses")
        : fields;

      if (!monthlyExpensesIncludeSmallExpenses) {
        return availableFields;
      }

      return availableFields.map((field) => {
        if (field.id === "monthlyExpenses") {
          return {
            ...field,
            label: "Gastos mensuales",
            helper: "Todos tus gastos habituales, incluidas las compras pequeñas que se repiten.",
            education: {
              ...field.education,
              avoid: "No incluyas cuotas de préstamos o tarjetas; se calculan por separado."
            }
          };
        }

        if (field.id === "smallExpenses") {
          return {
            ...field,
            helper: "Desglose opcional que ya forma parte de tus gastos mensuales.",
            education: {
              ...field.education,
              avoid: "Este monto sirve para analizar esos consumos y no volverá a sumarse al total mensual."
            }
          };
        }

        return field;
      });
    },
    [monthlyExpensesIncludeSmallExpenses, reportedNoSmallExpenses]
  );
  const [inputValues, setInputValues] = useState<InputValues>(() =>
    getInitialInputValues(effectiveExactValues)
  );
  const [hasEdited, setHasEdited] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasEdited) {
      setInputValues(getInitialInputValues(effectiveExactValues));
    }
  }, [effectiveExactValues, hasEdited]);

  const valuesToSave = useMemo(
    () => getValuesToSave(inputValues, reportedNoSmallExpenses),
    [inputValues, reportedNoSmallExpenses]
  );
  const persistedValuesToSave = useMemo(
    () =>
      hasExactFinancialValue(exactValues.monthlyDebtPayments)
        ? { ...valuesToSave, monthlyDebtPayments: exactValues.monthlyDebtPayments }
        : valuesToSave,
    [exactValues.monthlyDebtPayments, valuesToSave]
  );
  const effectiveDraftValues = useMemo(
    () =>
      reportedNoSmallExpenses
        ? { ...valuesToSave, smallExpenses: 0 }
        : valuesToSave,
    [reportedNoSmallExpenses, valuesToSave]
  );
  const savedPrecisionStatus = useMemo(
    () => getPlanPrecisionStatus(effectiveExactValues),
    [effectiveExactValues]
  );
  const draftPrecisionStatus = useMemo(
    () => getPlanPrecisionStatus(effectiveDraftValues),
    [effectiveDraftValues]
  );
  const hasUnsavedChanges = useMemo(
    () => hasUnsavedExactValueChanges(effectiveExactValues, effectiveDraftValues),
    [effectiveDraftValues, effectiveExactValues]
  );

  const handleInputChange = (fieldId: PlanFinancialValueKey, value: string) => {
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

    const saved = await saveExactValues(persistedValuesToSave);
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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <ShieldCheck color={colors.primary} size={30} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={styles.title}>Mejorar mi plan financiero</Text>
              <Text style={styles.subtitle}>
                Tus resultados actuales pueden estar basados en rangos. Agrega algunos valores
                opcionales para calcular mejor tu margen mensual, tu fondo de emergencia y tus
                oportunidades en gastos pequeños.
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{savedPrecisionStatus.state}</Text>
              </View>
              <Text style={styles.progressText}>{savedPrecisionStatus.count} de 4 datos guardados</Text>
              {reportedNoSmallExpenses ? (
                <Text style={styles.progressText}>Gastos pequeños: no aplica</Text>
              ) : null}
            </View>
            {hasUnsavedChanges ? (
              <View style={styles.unsavedNotice}>
                <Text style={styles.unsavedNoticeText}>
                  Cambios sin guardar: {draftPrecisionStatus.count} de 4 datos listos para guardar.
                  Guarda para actualizar tu Dashboard.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.form}>
            {visibleFields.map((field) => (
              <CurrencyField
                key={field.id}
                field={field}
                guidanceMode={guidanceMode}
                onChangeText={(value) => handleInputChange(field.id, value)}
                value={inputValues[field.id]}
              />
            ))}
            {reportedNoSmallExpenses ? (
              <View style={styles.revisitCard}>
                <View style={styles.revisitIcon}>
                  <Coffee color="#7C3AED" size={22} strokeWidth={2.4} />
                </View>
                <View style={styles.revisitBody}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Gastos pequeños mensuales</Text>
                    <Text style={styles.reportedAnswerText}>RESPONDISTE “NO”</Text>
                  </View>
                  <Text style={styles.fieldHelper}>
                    Conservamos tu respuesta. Si ahora identificaste consumos pequeños frecuentes,
                    puedes volver a revisarlos y agregarlos a tu diagnóstico.
                  </Text>
                  <PrimaryButton
                    accessibilityLabel="Revisar y agregar gastos pequeños"
                    icon={null}
                    onPress={() =>
                      router.push({
                        pathname: "/small-expenses",
                        params: { source: "improve-plan" }
                      })
                    }
                    style={styles.revisitButton}
                    title="Revisar gastos pequeños"
                    variant="secondary"
                  />
                </View>
              </View>
            ) : null}
          </View>

          {feedback ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          ) : null}

          <View style={styles.noticeCard}>
            <CheckCircle2 color={colors.support} size={18} strokeWidth={2.4} />
            <Text style={styles.noticeText}>
              {reportedNoSmallExpenses
                ? "Los 3 datos visibles son opcionales. Tu respuesta sobre gastos pequeños se conserva como No aplica."
                : "Los 4 datos son opcionales. Puedes guardar solo lo que tengas claro y ajustar el resto después."}
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
              accessibilityLabel="Volver a la pantalla anterior"
              icon={null}
              onPress={() => router.back()}
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

function CurrencyField({
  field,
  guidanceMode,
  value,
  onChangeText
}: {
  field: FieldConfig;
  guidanceMode: FinancialGuidanceMode;
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
          <View style={styles.fieldLabelMain}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <FinancialEducationModal
              accessibilityLabel={`Explicar ${field.label.toLowerCase()}`}
              guidanceMode={guidanceMode}
              icon={
                <Icon color={field.iconColor} size={23} strokeWidth={2.4} />
              }
              iconBackgroundColor={field.iconBackground}
              title={field.label}
              triggerSize="compact"
            >
              <FinancialEducationCarousel
                closeLabel="Cerrar"
                resetKey={`${field.id}-${guidanceMode}`}
                slides={getFieldEducationSlides(field, guidanceMode)}
              />
            </FinancialEducationModal>
          </View>
          <OptionalTag />
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
  unsavedNotice: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm
  },
  unsavedNoticeText: {
    color: "#B45309",
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
  revisitCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: "#FBF8FF",
    borderColor: "#DCCBFF",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  revisitIcon: {
    alignItems: "center",
    backgroundColor: "#F1E8FF",
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  revisitBody: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  reportedAnswerText: {
    color: "#7C3AED",
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  revisitButton: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: "#DCCBFF",
    minHeight: 48
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
  fieldLabelMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 180
  },
  fieldLabel: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  fieldHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption
  },
  educationSlide: {
    gap: spacing.md
  },
  educationTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  educationDefinitionCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  educationExamples: {
    gap: spacing.sm
  },
  educationExampleRow: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  educationDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 8,
    marginTop: 8,
    width: 8
  },
  educationWarningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  educationText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.caption,
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
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
