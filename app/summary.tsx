import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClipboardList, ShieldCheck } from "lucide-react-native";
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

type SummarySectionProps = {
  title: string;
  fields: SummaryField[];
  onEdit: () => void;
  editAccessibilityLabel: string;
};

function formatValue(value: string | string[] | null, optional = false) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : optional ? null : "No respondido";
  }

  if (value && value.trim().length > 0) {
    return value;
  }

  return optional ? null : "No respondido";
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
  title,
  fields,
  onEdit,
  editAccessibilityLabel
}: SummarySectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          accessibilityLabel={editAccessibilityLabel}
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.fieldsList}>
        {fields.map((field) => {
          const formattedValue = formatValue(field.value, field.optional);

          if (formattedValue === null) {
            return null;
          }

          return (
            <View key={field.label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              {Array.isArray(formattedValue) ? (
                <View style={styles.chipsList}>
                  {formattedValue.map((item) => (
                    <View key={item} style={styles.valueChip}>
                      <Text style={styles.valueChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[
                    styles.fieldValue,
                    formattedValue === "No respondido" && styles.emptyValue
                  ]}
                >
                  {formattedValue}
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
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <ClipboardList color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Resumen antes del diagnóstico</Text>

            <Text style={styles.subtitle}>
              Revisa la información que usaremos para crear tu primera orientación financiera.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes volver y ajustar cualquier respuesta antes de continuar.
              </Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Con esta información generaremos un diagnóstico educativo. No es una asesoría
              financiera ni una promesa de resultados.
            </Text>
          </View>

          <SummarySection
            editAccessibilityLabel="Editar perfil básico"
            fields={[
              { label: "Rango de edad", value: onboarding.ageRange },
              { label: "País", value: onboarding.country },
              { label: "Ciudad", value: onboarding.city, optional: true }
            ]}
            onEdit={() => router.push("/profile")}
            title="Perfil básico"
          />

          <SummarySection
            editAccessibilityLabel="Editar ingresos"
            fields={[
              { label: incomeDisplay.label, value: incomeDisplay.value },
              { label: "Tipo de ingreso", value: onboarding.incomeType },
              { label: "Frecuencia de ingreso", value: onboarding.incomeFrequency }
            ]}
            onEdit={() => router.push("/income")}
            title="Ingresos"
          />

          <SummarySection
            editAccessibilityLabel="Editar gastos"
            fields={[
              { label: expensesDisplay.label, value: expensesDisplay.value },
              { label: "Categorías principales", value: onboarding.expenseCategories },
              { label: "Cómo siente sus gastos", value: onboarding.expensesFeeling }
            ]}
            onEdit={() => router.push("/expenses")}
            title="Gastos"
          />

          <SummarySection
            editAccessibilityLabel="Editar gastos hormiga"
            fields={[
              {
                label: "Si tiene gastos pequeños frecuentes",
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
            onEdit={() => router.push("/small-expenses")}
            title="Gastos hormiga"
          />

          <SummarySection
            editAccessibilityLabel="Editar ahorros, deudas e inversiones"
            fields={[
              { label: savingsDisplay.label, value: savingsDisplay.value },
              { label: "Cobertura de gastos esenciales", value: onboarding.emergencyCoverage },
              { label: "Situación de deudas", value: onboarding.debtSituation },
              { label: "PESO MENSUAL DE DEUDAS", value: onboarding.debtPaymentShare },
              { label: "Situación de inversiones", value: onboarding.investmentSituation }
            ]}
            onEdit={() => router.push("/savings-debts")}
            title="Ahorros, deudas e inversiones"
          />

          <SummarySection
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
            onEdit={() => router.push("/goals-overview")}
            title="Meta financiera"
          />

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Generar diagnóstico financiero"
              icon={null}
              onPress={() => router.push("/diagnosis")}
              title="Generar diagnóstico"
            />
            <PrimaryButton
              accessibilityLabel="Volver a meta financiera"
              icon={null}
              onPress={() => router.push("/goals")}
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
    maxWidth: 520,
    width: "100%"
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
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
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  noticeText: {
    color: colors.primaryDark,
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
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  editButton: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  editButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }]
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  fieldsList: {
    gap: spacing.md
  },
  fieldRow: {
    gap: spacing.xs
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption,
    textTransform: "uppercase"
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
    borderColor: "#D7E7FF",
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
  }
});
