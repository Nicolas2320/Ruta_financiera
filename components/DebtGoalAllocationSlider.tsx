import { useCallback, useMemo, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent
} from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

const MIN_DEBT_PERCENT = 10;
const MAX_DEBT_PERCENT = 90;
const STEP = 5;

function normalizeDebtPercent(value: number) {
  const steppedValue = Math.round(value / STEP) * STEP;
  return Math.min(MAX_DEBT_PERCENT, Math.max(MIN_DEBT_PERCENT, steppedValue));
}

export function DebtGoalAllocationSlider({
  debtPercent,
  onChange
}: {
  debtPercent: number;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const normalizedDebtPercent = normalizeDebtPercent(debtPercent);
  const goalPercent = 100 - normalizedDebtPercent;
  const updateFromTrackPosition = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) {
        return;
      }

      onChange(normalizeDebtPercent((locationX / trackWidth) * 100));
    },
    [onChange, trackWidth]
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromTrackPosition(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromTrackPosition(event.nativeEvent.locationX),
        onStartShouldSetPanResponder: () => true
      }),
    [updateFromTrackPosition]
  );
  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingSide}>
          <Text style={styles.debtLabel}>Deuda</Text>
          <Text style={styles.debtValue}>{normalizedDebtPercent}%</Text>
        </View>
        <View style={[styles.headingSide, styles.headingSideRight]}>
          <Text style={styles.goalLabel}>Meta</Text>
          <Text style={styles.goalValue}>{goalPercent}%</Text>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <Pressable
          accessibilityLabel="Dar cinco por ciento más a la meta"
          accessibilityRole="button"
          disabled={normalizedDebtPercent <= MIN_DEBT_PERCENT}
          onPress={() => onChange(normalizeDebtPercent(normalizedDebtPercent - STEP))}
          style={({ pressed }) => [
            styles.stepButton,
            normalizedDebtPercent <= MIN_DEBT_PERCENT && styles.stepButtonDisabled,
            pressed && styles.pressed
          ]}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>

        <View
          accessibilityActions={[
            { name: "increment", label: "Dar más a deuda" },
            { name: "decrement", label: "Dar más a meta" }
          ]}
          accessibilityLabel="Reparto entre deuda y meta"
          accessibilityRole="adjustable"
          accessibilityValue={{
            max: MAX_DEBT_PERCENT,
            min: MIN_DEBT_PERCENT,
            now: normalizedDebtPercent,
            text: `${normalizedDebtPercent}% para deuda y ${goalPercent}% para meta`
          }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") {
              onChange(normalizeDebtPercent(normalizedDebtPercent + STEP));
            }

            if (event.nativeEvent.actionName === "decrement") {
              onChange(normalizeDebtPercent(normalizedDebtPercent - STEP));
            }
          }}
          onLayout={handleTrackLayout}
          style={styles.track}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.debtFill,
              { width: `${normalizedDebtPercent}%` as `${number}%` }
            ]}
          />
          <View
            style={[
              styles.thumb,
              { left: `${normalizedDebtPercent}%` as `${number}%` }
            ]}
          />
        </View>

        <Pressable
          accessibilityLabel="Dar cinco por ciento más a la deuda"
          accessibilityRole="button"
          disabled={normalizedDebtPercent >= MAX_DEBT_PERCENT}
          onPress={() => onChange(normalizeDebtPercent(normalizedDebtPercent + STEP))}
          style={({ pressed }) => [
            styles.stepButton,
            normalizedDebtPercent >= MAX_DEBT_PERCENT && styles.stepButtonDisabled,
            pressed && styles.pressed
          ]}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.helper}>
          Ajusta en pasos de 5%. Las cuotas requeridas y el margen protegido no cambian.
        </Text>
        {normalizedDebtPercent !== 50 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(50)}
            style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
          >
            <Text style={styles.resetButtonText}>Volver a 50 / 50</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headingSide: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  headingSideRight: {
    justifyContent: "flex-end"
  },
  debtLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  debtValue: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  goalLabel: {
    color: "#6D28D9",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  goalValue: {
    color: "#6D28D9",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  sliderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  track: {
    backgroundColor: "#E9DDFF",
    borderRadius: radius.pill,
    flex: 1,
    height: 16,
    justifyContent: "center",
    minWidth: 120
  },
  debtFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  thumb: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 28,
    marginLeft: -14,
    position: "absolute",
    width: 28
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  stepButtonDisabled: {
    opacity: 0.4
  },
  stepButtonText: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  helper: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    minWidth: 180
  },
  resetButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs
  },
  resetButtonText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  pressed: {
    opacity: 0.8
  }
});
