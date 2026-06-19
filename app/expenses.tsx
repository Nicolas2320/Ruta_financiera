import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Coffee, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { SelectableChip } from "../components/SelectableChip";
import { SelectableOption } from "../components/SelectableOption";
import { StepIndicator } from "../components/StepIndicator";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const expenseRanges = [
  "Menos de $1.000.000",
  "$1.000.000 – $2.000.000",
  "$2.000.000 – $4.000.000",
  "$4.000.000 – $6.000.000",
  "Más de $6.000.000",
  "No estoy seguro"
] as const;

const expenseCategories = [
  "Arriendo o vivienda",
  "Alimentación",
  "Transporte",
  "Servicios públicos",
  "Deudas",
  "Educación",
  "Salud",
  "Familia",
  "Entretenimiento",
  "Suscripciones",
  "Compras",
  "Otros"
] as const;

const expenseFeelings = [
  "Los tengo bajo control",
  "A veces gasto más de lo planeado",
  "No sé exactamente en qué se va mi dinero",
  "Me preocupa no poder ahorrar"
] as const;

export default function ExpensesScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedExpenseRange, setSelectedExpenseRange] = useState<string | null>(
    onboarding.expensesRange
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    onboarding.expenseCategories
  );
  const [selectedExpenseFeeling, setSelectedExpenseFeeling] = useState<string | null>(
    onboarding.expensesFeeling
  );

  const canContinue = Boolean(
    selectedExpenseRange && selectedCategories.length > 0 && selectedExpenseFeeling
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const handleContinue = () => {
    if (!selectedExpenseRange || selectedCategories.length === 0 || !selectedExpenseFeeling) {
      return;
    }

    updateOnboarding({
      expensesRange: selectedExpenseRange,
      expenseCategories: selectedCategories,
      expensesFeeling: selectedExpenseFeeling
    });
    router.push("/small-expenses");
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
          <StepIndicator currentStep={5} label="GASTOS" totalSteps={8} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Coffee color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tus gastos mensuales</Text>

            <Text style={styles.subtitle}>
              No necesitas calcular cada peso. Empecemos con un rango aproximado para entender cómo
              se distribuye tu dinero.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>Podrás ajustar tus gastos más adelante.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuál es tu rango de gastos mensuales?</Text>
            <View style={styles.optionsList}>
              {expenseRanges.map((expenseRange) => (
                <SelectableOption
                  key={expenseRange}
                  label={expenseRange}
                  onPress={() => setSelectedExpenseRange(expenseRange)}
                  selected={selectedExpenseRange === expenseRange}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuáles son tus gastos principales?</Text>
            <Text style={styles.helperText}>Puedes elegir varias categorías.</Text>
            <View style={styles.chipsList}>
              {expenseCategories.map((category) => (
                <SelectableChip
                  key={category}
                  label={category}
                  onPress={() => toggleCategory(category)}
                  selected={selectedCategories.includes(category)}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cómo sientes tus gastos actualmente?</Text>
            <View style={styles.optionsList}>
              {expenseFeelings.map((feeling) => (
                <SelectableOption
                  key={feeling}
                  label={feeling}
                  onPress={() => setSelectedExpenseFeeling(feeling)}
                  selected={selectedExpenseFeeling === feeling}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia gastos hormiga"
              disabled={!canContinue}
              icon={null}
              onPress={handleContinue}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver a ingresos"
              icon={null}
              onPress={() => router.push("/income")}
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
    fontWeight: "900",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: 24
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
    fontWeight: "700",
    lineHeight: 20
  },
  questionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: -spacing.sm
  },
  optionsList: {
    gap: spacing.sm
  },
  chipsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
