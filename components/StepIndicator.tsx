import type { DimensionValue } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  label: string;
};

export function StepIndicator({ currentStep, totalSteps, label }: StepIndicatorProps) {
  const progress = `${Math.round((currentStep / totalSteps) * 100)}%` as DimensionValue;

  return (
    <View
      accessibilityLabel={`Paso ${currentStep} de ${totalSteps}: ${label}`}
      accessible
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.stepText}>Paso {currentStep} de {totalSteps}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  stepText: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  label: {
    color: colors.textSubtle,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "right",
    textTransform: "uppercase"
  },
  progressTrack: {
    backgroundColor: "#DCE8F8",
    borderRadius: radius.pill,
    height: 6,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  }
});
