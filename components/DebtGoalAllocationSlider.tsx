import { useCallback, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react-native";
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
const GOAL_COLOR = "#7C3AED";

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

      <View
        accessibilityActions={[
          { name: "increment", label: "Dar más a deuda" },
          { name: "decrement", label: "Dar más a meta" }
        ]}
        accessibilityHint="Arrastra el separador para cambiar el reparto"
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
        <View style={styles.trackSegments}>
          <View
            style={[
              styles.debtSegment,
              { width: `${normalizedDebtPercent}%` as `${number}%` }
            ]}
          />
          <View style={[styles.goalSegment, { width: `${goalPercent}%` as `${number}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: `${normalizedDebtPercent}%` as `${number}%` }
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.helper}>
          Desliza para repartir el 100% en pasos de 5%. El margen protegido no cambia.
        </Text>
        {normalizedDebtPercent !== 50 ? (
          <Pressable
            accessibilityLabel="Restablecer reparto a 50% deuda y 50% meta"
            accessibilityRole="button"
            onPress={() => onChange(50)}
            style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
          >
            <RotateCcw color={colors.primary} size={17} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  headingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headingSide: {
    alignItems: "flex-start",
    gap: 1
  },
  headingSideRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end"
  },
  debtLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  debtValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  goalLabel: {
    color: GOAL_COLOR,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  goalValue: {
    color: GOAL_COLOR,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  track: {
    alignSelf: "stretch",
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    minWidth: 120
  },
  trackSegments: {
    borderRadius: radius.pill,
    flexDirection: "row",
    height: 14,
    overflow: "hidden",
    width: "100%"
  },
  debtSegment: {
    backgroundColor: colors.primary,
    height: "100%"
  },
  goalSegment: {
    backgroundColor: GOAL_COLOR,
    height: "100%"
  },
  thumb: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 3,
    elevation: 2,
    height: 22,
    marginLeft: -11,
    position: "absolute",
    shadowColor: "#0F172A",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    width: 22
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  helper: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    minWidth: 180
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  pressed: {
    opacity: 0.8
  }
});
