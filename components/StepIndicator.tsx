import type { DimensionValue } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  label: string;
};

export function StepIndicator({ currentStep, totalSteps, label }: StepIndicatorProps) {
  const progress = `${((currentStep - 1) / (totalSteps - 1)) * 100}%` as DimensionValue;

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
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progress }]} />
        </View>
        <View style={styles.progressDots}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1;
            const isComplete = step <= currentStep;
            const isActive = step === currentStep;

            return (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  isComplete && styles.progressDotComplete,
                  isActive && styles.progressDotActive
                ]}
              />
            );
          })}
        </View>
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
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  label: {
    color: colors.textSubtle,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption,
    textAlign: "right",
    textTransform: "uppercase"
  },
  progressWrap: {
    height: 20,
    justifyContent: "center"
  },
  progressTrack: {
    backgroundColor: "#DCE8F8",
    borderRadius: radius.pill,
    height: 4,
    left: 10,
    overflow: "hidden",
    position: "absolute",
    right: 10
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    left: 0,
    position: "absolute"
  },
  progressDots: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  progressDot: {
    backgroundColor: "#DCE8F8",
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  progressDotComplete: {
    backgroundColor: colors.primary
  },
  progressDotActive: {
    height: 14,
    width: 14
  }
});
