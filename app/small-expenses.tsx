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

const smallExpensePresence = ["Sí", "No", "No estoy seguro"] as const;

const smallExpenseCategories = [
  "Cafés o snacks",
  "Domicilios",
  "Transporte extra",
  "Suscripciones",
  "Compras pequeñas",
  "Salidas",
  "Juegos o entretenimiento digital",
  "Apps o servicios digitales",
  "Antojos",
  "Otros"
] as const;

const smallExpenseRanges = [
  "Menos de $100.000",
  "$100.000 – $250.000",
  "$250.000 – $500.000",
  "Más de $500.000",
  "No sé"
] as const;

const smallExpenseIntentions = [
  "Mantenerlos como están",
  "Establecer un límite mensual",
  "Reducir algunos",
  "Redirigir una parte a una meta",
  "Primero quiero entenderlos mejor"
] as const;

export default function SmallExpensesScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedPresence, setSelectedPresence] = useState<string | null>(
    onboarding.hasSmallExpenses
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    onboarding.smallExpenseCategories
  );
  const [selectedRange, setSelectedRange] = useState<string | null>(
    onboarding.smallExpensesRange
  );
  const [selectedIntention, setSelectedIntention] = useState<string | null>(
    onboarding.smallExpensesIntention
  );

  const needsCategory = selectedPresence === "Sí";
  const shouldShowCategoryQuestion = selectedPresence !== "No";
  const canContinue = Boolean(
    selectedPresence &&
      selectedRange &&
      selectedIntention &&
      (!needsCategory || selectedCategories.length > 0)
  );

  const handlePresenceSelect = (presence: string) => {
    setSelectedPresence(presence);

    if (presence === "No") {
      setSelectedCategories([]);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const handleContinue = () => {
    if (!selectedPresence || !selectedRange || !selectedIntention) {
      return;
    }

    const categoriesToSave = selectedPresence === "No" ? [] : selectedCategories;

    if (needsCategory && categoriesToSave.length === 0) {
      return;
    }

    updateOnboarding({
      hasSmallExpenses: selectedPresence,
      smallExpenseCategories: categoriesToSave,
      smallExpensesRange: selectedRange,
      smallExpensesIntention: selectedIntention
    });
    router.push("/savings-debts");
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
          <StepIndicator currentStep={6} label="GASTOS HORMIGA" totalSteps={8} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Coffee color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Pequeños gastos frecuentes</Text>

            <Text style={styles.subtitle}>
              No todos los gastos pequeños son malos. La idea es entenderlos y decidir cuáles
              quieres mantener, limitar o redirigir a una meta.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Tú decides qué gastos conservar y cuáles ajustar.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿Sientes que tienes gastos pequeños frecuentes?
            </Text>
            <View style={styles.optionsList}>
              {smallExpensePresence.map((presence) => (
                <SelectableOption
                  key={presence}
                  label={presence}
                  onPress={() => handlePresenceSelect(presence)}
                  selected={selectedPresence === presence}
                />
              ))}
            </View>
          </View>

          {shouldShowCategoryQuestion ? (
            <View style={styles.card}>
              <Text style={styles.questionTitle}>¿En qué categorías crees que se van?</Text>
              <Text style={styles.helperText}>
                Puedes elegir varias categorías. Si respondiste “Sí”, elige al menos una.
              </Text>
              <View style={styles.chipsList}>
                {smallExpenseCategories.map((category) => (
                  <SelectableChip
                    key={category}
                    label={category}
                    onPress={() => toggleCategory(category)}
                    selected={selectedCategories.includes(category)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.softCard}>
              <Text style={styles.questionTitle}>No hace falta detallar categorías ahora</Text>
              <Text style={styles.softText}>
                Si más adelante notas consumos pequeños repetidos, puedes volver y revisarlos sin
                problema.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿Cuánto crees que gastas al mes en estos consumos?
            </Text>
            <View style={styles.optionsList}>
              {smallExpenseRanges.map((range) => (
                <SelectableOption
                  key={range}
                  label={range}
                  onPress={() => setSelectedRange(range)}
                  selected={selectedRange === range}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué te gustaría hacer con estos gastos?</Text>
            <View style={styles.optionsList}>
              {smallExpenseIntentions.map((intention) => (
                <SelectableOption
                  key={intention}
                  label={intention}
                  onPress={() => setSelectedIntention(intention)}
                  selected={selectedIntention === intention}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia ahorros y deudas"
              disabled={!canContinue}
              icon={null}
              onPress={handleContinue}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver a gastos mensuales"
              icon={null}
              onPress={() => router.push("/expenses")}
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
  softCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
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
  softText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22
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
