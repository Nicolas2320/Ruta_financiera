import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

export function ExactAmountField({
  accessibilityLabel,
  helper,
  label,
  onChangeText,
  value
}: {
  accessibilityLabel?: string;
  helper?: string;
  label?: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label ?? "Ingresar cifra"}
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  helper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: typography.weight.black,
    minHeight: 50,
    paddingHorizontal: spacing.md
  }
});
