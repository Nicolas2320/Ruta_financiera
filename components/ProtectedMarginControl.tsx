import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import { formatCOP } from "../utils/financialRanges";
import { ExactAmountField } from "./ui/ExactAmountField";

export type ProtectedMarginMode = "automatic" | "use_all" | "custom";

const options: Array<{
  description: string;
  label: string;
  mode: ProtectedMarginMode;
}> = [
  {
    description: "Deja libre el 10% del dinero disponible.",
    label: "Automático",
    mode: "automatic"
  },
  {
    description: "Distribuye todo y puede dejar el mes en $0.",
    label: "Usar todo",
    mode: "use_all"
  },
  {
    description: "Tú decides cuánto no se reparte.",
    label: "Definir monto",
    mode: "custom"
  }
];

export function ProtectedMarginControl({
  customAmountInput,
  distributableAmount,
  mode,
  onCustomAmountChange,
  onModeChange,
  protectedAmount,
  surplusBeforeProtection
}: {
  customAmountInput: string;
  distributableAmount: number | null;
  mode: ProtectedMarginMode;
  onCustomAmountChange: (value: string) => void;
  onModeChange: (mode: ProtectedMarginMode) => void;
  protectedAmount: number | null;
  surplusBeforeProtection: number | null;
}) {
  const getValueLabel = (value: number | null) =>
    value === null ? "No disponible" : formatCOP(value);
  const customAmountHelper =
    surplusBeforeProtection === null
      ? "Primero completa ingresos, gastos y cuotas requeridas para conocer tu margen positivo."
      : `Tu margen positivo es ${formatCOP(surplusBeforeProtection)}. Esta cifra quedará libre y el resto podrá repartirse.`;

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Dinero libre del mes</Text>
        <Text style={styles.description}>
          Es la parte que no se destina a deudas ni metas. Puedes dejar el valor automático,
          repartir todo o elegir cuánto conservar libre.
        </Text>
      </View>

      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.mode === mode;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.mode}
              onPress={() => onModeChange(option.mode)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {mode === "custom" ? (
        <ExactAmountField
          accessibilityLabel="Monto que quieres dejar libre cada mes"
          helper={customAmountHelper}
          label="¿Cuánto quieres dejar libre de tu margen positivo?"
          onChangeText={onCustomAmountChange}
          value={customAmountInput}
        />
      ) : null}

      <View style={styles.values}>
        <View style={styles.valueItem}>
          <Text style={styles.valueLabel}>Disponible al comenzar</Text>
          <Text style={styles.valueText}>{getValueLabel(surplusBeforeProtection)}</Text>
        </View>
        <View style={styles.valueItem}>
          <Text style={styles.valueLabel}>Queda libre</Text>
          <Text style={styles.valueText}>{getValueLabel(protectedAmount)}</Text>
        </View>
        <View style={[styles.valueItem, styles.valueItemPrimary]}>
          <Text style={styles.valueLabel}>Para repartir</Text>
          <Text style={[styles.valueText, styles.valueTextPrimary]}>
            {getValueLabel(distributableAmount)}
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  copy: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  option: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 190,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 88,
    padding: spacing.md
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  radio: {
    alignItems: "center",
    borderColor: colors.textSubtle,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    marginTop: 2,
    width: 20
  },
  radioSelected: {
    borderColor: colors.primary
  },
  radioDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  optionCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  optionTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  optionTitleSelected: {
    color: colors.primary
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  values: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  valueItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  valueItemPrimary: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  valueLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  valueText: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  valueTextPrimary: {
    color: colors.support
  },
  pressed: {
    opacity: 0.84
  }
});
