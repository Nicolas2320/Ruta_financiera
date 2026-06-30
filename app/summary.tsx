import type { ComponentType } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ChevronRight,
  ClipboardList,
  Coffee,
  PencilLine,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Target,
  UserRound,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { getOnboardingGoals } from "../types/financial";
import {
  getCurrentSavingsDisplay,
  getGoalTargetAmountDisplay,
  getMonthlyExpensesDisplay,
  getMonthlyIncomeDisplay
} from "../utils/financialRanges";

type SummaryField = {
  label: string;
  value: string | string[] | null;
  optional?: boolean;
};

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type Tone = "primary" | "support" | "neutral";

type SummarySectionProps = {
  title: string;
  description: string;
  fields: SummaryField[];
  icon: ComponentType<IconProps>;
  tone?: Tone;
  onEdit: () => void;
  editAccessibilityLabel: string;
};

const emptyValueLabel = "No respondido";

function formatValue(value: string | string[] | null, optional = false) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : optional ? null : emptyValueLabel;
  }

  if (value && value.trim().length > 0) {
    return value;
  }

  return optional ? null : emptyValueLabel;
}

function getToneColors(tone: Tone) {
  if (tone === "support") {
    return {
      background: colors.supportSoft,
      foreground: colors.support
    };
  }

  if (tone === "neutral") {
    return {
      background: colors.surfaceMuted,
      foreground: colors.textSubtle
    };
  }

  return {
    background: colors.primarySoft,
    foreground: colors.primary
  };
}

function getGoalDetailLabel(goal: string | null) {
  if (goal === "Organizar mis gastos") {
    return "Detalle de organización";
  }

  if (goal === "Empezar a invertir") {
    return "Tema a entender";
  }

  if (goal === "No sé todavía, ayúdame a elegir") {
    return "Ayuda para decidir";
  }

  return "Cifra aproximada";
}

function SummarySection({
  description,
  title,
  fields,
  icon: Icon,
  tone = "primary",
  onEdit,
  editAccessibilityLabel
}: SummarySectionProps) {
  const toneColors = getToneColors(tone);
  const visibleFields = fields
    .map((field) => ({
      ...field,
      formattedValue: formatValue(field.value, field.optional)
    }))
    .filter((field) => field.formattedValue !== null);
  const completedFields = visibleFields.filter((field) => field.formattedValue !== emptyValueLabel).length;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: toneColors.background }]}>
          <Icon color={toneColors.foreground} size={22} strokeWidth={2.4} />
        </View>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
        <Pressable
          accessibilityLabel={editAccessibilityLabel}
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <PencilLine color={colors.primary} size={15} strokeWidth={2.5} />
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.sectionStatus}>
        <ShieldCheck color={colors.support} size={16} strokeWidth={2.4} />
        <Text style={styles.sectionStatusText}>
          {completedFields} de {visibleFields.length} datos revisados
        </Text>
      </View>

      <View style={styles.fieldsList}>
        {visibleFields.map((field, index) => {
          return (
            <View
              key={field.label}
              style={[styles.fieldRow, index === 0 && styles.fieldRowFirst]}
            >
              <Text style={styles.fieldLabel}>{field.label}</Text>
              {Array.isArray(field.formattedValue) ? (
                <View style={styles.chipsList}>
                  {field.formattedValue.map((item) => (
                    <View key={item} style={styles.valueChip}>
                      <Text style={styles.valueChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[
                    styles.fieldValue,
                    field.formattedValue === emptyValueLabel && styles.emptyValue
                  ]}
                >
                  {field.formattedValue}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const router = useRouter();
  const { exactValues, onboarding } = useOnboarding();
  const financialProfile = { onboarding, exactValues };
  const goals = getOnboardingGoals(onboarding);
  const incomeDisplay = getMonthlyIncomeDisplay(financialProfile);
  const expensesDisplay = getMonthlyExpensesDisplay(financialProfile);
  const savingsDisplay = getCurrentSavingsDisplay(financialProfile);
  const goalAmountDisplay = getGoalTargetAmountDisplay(financialProfile);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <ClipboardList color={colors.primary} size={28} strokeWidth={2.4} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>Revisión final</Text>
                <Text style={styles.title}>Resumen antes del diagnóstico</Text>
                <Text style={styles.subtitle}>
                  Confirma la información que usaremos para crear tu primera orientación financiera.
                </Text>
              </View>
            </View>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes ajustar cualquier respuesta antes de continuar. No necesitas que todo sea exacto.
              </Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <ShieldCheck color={colors.primary} size={20} strokeWidth={2.4} />
            <Text style={styles.noticeText}>
              Con esta información generaremos un diagnóstico educativo. No es una asesoría
              financiera ni una promesa de resultados.
            </Text>
          </View>

          <SummarySection
            description="Datos básicos para contextualizar tus recomendaciones."
            editAccessibilityLabel="Editar perfil básico"
            fields={[
              { label: "Rango de edad", value: onboarding.ageRange },
              { label: "País", value: onboarding.country },
              { label: "Ciudad", value: onboarding.city, optional: true }
            ]}
            icon={UserRound}
            onEdit={() => router.push("/profile")}
            tone="neutral"
            title="Perfil básico"
          />

          <SummarySection
            description="Base para estimar tu capacidad mensual."
            editAccessibilityLabel="Editar ingresos"
            fields={[
              { label: incomeDisplay.label, value: incomeDisplay.value },
              { label: "Tipo de ingreso", value: onboarding.incomeType },
              { label: "Frecuencia de ingreso", value: onboarding.incomeFrequency }
            ]}
            icon={Wallet}
            onEdit={() => router.push("/income")}
            tone="support"
            title="Ingresos"
          />

          <SummarySection
            description="Señales para entender dónde se concentra tu dinero."
            editAccessibilityLabel="Editar gastos"
            fields={[
              { label: expensesDisplay.label, value: expensesDisplay.value },
              { label: "Categorías principales", value: onboarding.expenseCategories },
              { label: "Cómo sientes tus gastos", value: onboarding.expensesFeeling }
            ]}
            icon={ReceiptText}
            onEdit={() => router.push("/expenses")}
            title="Gastos"
          />

          <SummarySection
            description="Hábitos pequeños que pueden convertirse en margen."
            editAccessibilityLabel="Editar gastos hormiga"
            fields={[
              {
                label: "Gastos pequeños frecuentes",
                value: onboarding.hasSmallExpenses
              },
              {
                label: "Categorías seleccionadas",
                value: onboarding.smallExpenseCategories
              },
              { label: "Rango mensual estimado", value: onboarding.smallExpensesRange },
              {
                label: "Qué quiere hacer con esos gastos",
                value: onboarding.smallExpensesIntention
              }
            ]}
            icon={Coffee}
            onEdit={() => router.push("/small-expenses")}
            tone="neutral"
            title="Gastos hormiga"
          />

          <SummarySection
            description="Punto de partida para medir estabilidad y prioridad."
            editAccessibilityLabel="Editar ahorros, deudas e inversiones"
            fields={[
              { label: savingsDisplay.label, value: savingsDisplay.value },
              { label: "Cobertura de gastos esenciales", value: onboarding.emergencyCoverage },
              { label: "Situación de deudas", value: onboarding.debtSituation },
              { label: "Peso mensual de deudas", value: onboarding.debtPaymentShare },
              { label: "Situación de inversiones", value: onboarding.investmentSituation }
            ]}
            icon={PiggyBank}
            onEdit={() => router.push("/savings-debts")}
            tone="support"
            title="Ahorros, deudas e inversiones"
          />

          <SummarySection
            description="La dirección principal que guiará el diagnóstico."
            editAccessibilityLabel="Editar meta financiera"
            fields={[
              { label: "Meta principal", value: onboarding.financialGoal },
              {
                label: "Metas creadas",
                value: goals.length > 0 ? goals.length.toString() : null,
                optional: true
              },
              { label: "Horizonte", value: onboarding.goalHorizon },
              { label: "Importancia", value: onboarding.goalPriority },
              {
                label:
                  goalAmountDisplay.source === "exact"
                    ? goalAmountDisplay.label
                    : getGoalDetailLabel(onboarding.financialGoal),
                value: goalAmountDisplay.source === "empty" ? null : goalAmountDisplay.value,
                optional: true
              }
            ]}
            icon={Target}
            onEdit={() => router.push("/goals-overview")}
            title="Meta financiera"
          />

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Generar diagnóstico financiero"
              icon={ChevronRight}
              iconPosition="right"
              onPress={() => router.push("/diagnosis")}
              title="Generar diagnóstico"
            />
            <PrimaryButton
              accessibilityLabel="Volver a meta financiera"
              icon={null}
              onPress={() => router.push("/goals")}
              style={styles.backButton}
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
    maxWidth: 680,
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
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
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
    gap: spacing.xs,
    minWidth: 240
  },
  kicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
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
  trustMessage: {
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
  noticeCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg
  },
  noticeText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
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
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  sectionIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  sectionHeading: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 210
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  editButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }]
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  sectionStatus: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  sectionStatusText: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  fieldsList: {
    gap: 0
  },
  fieldRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  fieldRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  fieldValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body
  },
  emptyValue: {
    color: colors.textSubtle
  },
  chipsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  valueChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  valueChipText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  backButton: {
    backgroundColor: colors.surface
  }
});
