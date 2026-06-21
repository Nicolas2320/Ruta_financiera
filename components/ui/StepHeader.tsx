import type { DimensionValue } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type StepHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
};

export function StepHeader({ currentStep, totalSteps, title, onBack }: StepHeaderProps) {
  const progress = `${((currentStep - 1) / (totalSteps - 1)) * 100}%` as DimensionValue;

  return (
    <View
      accessibilityLabel={`Paso ${currentStep} de ${totalSteps}: ${title}`}
      accessible
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft color="#0B1B3F" size={21} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Paso {currentStep} de {totalSteps}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
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
    justifyContent: "space-between"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  },
  stepPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: spacing.xs
  },
  stepPillText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  title: {
    color: colors.textSubtle,
    flexBasis: 92,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "right"
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
