import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText
} from "react-native-svg";

import { colors, radius, spacing, typography } from "../constants/theme";
import {
  getFinancialTimelineDisplayMonths,
  type FinancialScenarioTimeline
} from "../utils/financialTimeline";
import { formatCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";

export type FinancialTimelineFocus = "combined" | "debt" | "goal";

const DEFAULT_VIEW_WIDTH = 900;
const DEBT_COLOR = colors.primary;
const GOAL_COLOR = "#7C3AED";
const GOAL_DARK_COLOR = "#6D28D9";
const PAYOFF_COLOR = colors.support;
const GRID_COLOR = "#DDE5F0";
const LABEL_COLOR = colors.textSubtle;
const SELECTOR_COLOR = colors.text;
const NEAR_MONTH_COUNT = 12;
const SVG_FONT_FAMILY =
  Platform.select({
    android: "sans-serif",
    default: "System",
    web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  }) ?? "sans-serif";

type Lane = {
  bottom: number;
  height: number;
  maximumValue: number;
  top: number;
  yForValue: (value: number) => number;
};

type ChartPoint = { x: number; y: number };

function formatCompactCOP(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? `${millions}`
      : millions.toFixed(1).replace(".", ",");
    return `$${formatted} M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)} mil`;
  }

  return `$${Math.round(value)}`;
}

function formatShortMonth(value: string) {
  const [month, year] = formatTargetMonth(value).split(" de ");
  return `${month.slice(0, 3)} ${year ?? ""}`.trim();
}

function getSampleIndexes(length: number, desiredCount = 4) {
  if (length <= desiredCount) {
    return Array.from({ length }, (_, index) => index);
  }

  return Array.from(
    new Set(
      Array.from({ length: desiredCount }, (_, index) =>
        Math.round((index / (desiredCount - 1)) * (length - 1))
      )
    )
  );
}

function buildPath(points: ChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: ChartPoint[], baseline: number) {
  if (points.length === 0) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return `${buildPath(points)} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;
}

function createLane(top: number, bottom: number, maximumValue: number): Lane {
  const safeMaximum = Math.max(1, maximumValue);
  const height = bottom - top;

  return {
    bottom,
    height,
    maximumValue: safeMaximum,
    top,
    yForValue: (value: number) =>
      top + height - (Math.max(0, value) / safeMaximum) * height
  };
}

function LaneGrid({
  chartEnd,
  chartStart,
  compact,
  label,
  lane
}: {
  chartEnd: number;
  chartStart: number;
  compact: boolean;
  label?: string;
  lane: Lane;
}) {
  const labelX = compact ? 8 : 12;

  return (
    <G>
      {[lane.top, lane.top + lane.height / 2, lane.bottom].map((y, index) => (
        <Line
          key={`${label ?? "lane"}-grid-${index}`}
          stroke={GRID_COLOR}
          strokeDasharray={index === 1 ? "4 7" : undefined}
          strokeWidth={1}
          x1={chartStart}
          x2={chartEnd}
          y1={y}
          y2={y}
        />
      ))}
      {label ? (
        <SvgText
          fill={SELECTOR_COLOR}
          fontFamily={SVG_FONT_FAMILY}
          fontSize={compact ? 11 : 12}
          fontWeight="700"
          x={labelX}
          y={lane.top + 13}
        >
          {label}
        </SvgText>
      ) : null}
      <SvgText
        fill={LABEL_COLOR}
        fontFamily={SVG_FONT_FAMILY}
        fontSize={compact ? 9 : 11}
        x={labelX}
        y={lane.top + (label ? 29 : 5)}
      >
        {formatCompactCOP(lane.maximumValue)}
      </SvgText>
      <SvgText
        fill={LABEL_COLOR}
        fontFamily={SVG_FONT_FAMILY}
        fontSize={compact ? 9 : 11}
        x={labelX}
        y={lane.bottom + 4}
      >
        $0
      </SvgText>
    </G>
  );
}

function RangeButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rangeButton,
        active && styles.rangeButtonActive,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.rangeButtonText, active && styles.rangeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FinancialTimelineChart({
  focus,
  timeline
}: {
  focus: FinancialTimelineFocus;
  timeline: FinancialScenarioTimeline;
}) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [range, setRange] = useState<"all" | "near">("near");
  const [selectedIndexState, setSelectedIndex] = useState(0);
  const displayMonths = useMemo(
    () => getFinancialTimelineDisplayMonths(timeline),
    [timeline]
  );
  const goalRelevantMonthCount = useMemo(() => {
    if (focus !== "goal") {
      return NEAR_MONTH_COUNT;
    }

    const relevantIndexes = [
      timeline.goalCompletionMonth,
      timeline.trackedGoal?.targetMonth
    ]
      .filter((month): month is string => Boolean(month))
      .map((month) => displayMonths.findIndex((item) => item.month === month))
      .filter((index) => index >= 0);
    const lastRelevantIndex = Math.max(0, ...relevantIndexes);

    return Math.min(
      displayMonths.length,
      Math.max(3, lastRelevantIndex + 1)
    );
  }, [displayMonths, focus, timeline.goalCompletionMonth, timeline.trackedGoal]);
  const canChangeRange =
    focus !== "goal" && displayMonths.length > NEAR_MONTH_COUNT + 1;
  const months = useMemo(
    () => {
      if (focus === "goal") {
        return displayMonths.slice(0, goalRelevantMonthCount);
      }

      return range === "near"
        ? displayMonths.slice(0, NEAR_MONTH_COUNT + 1)
        : displayMonths;
    },
    [displayMonths, focus, goalRelevantMonthCount, range]
  );
  const selectedIndex = Math.min(
    Number.isFinite(selectedIndexState) ? Math.max(0, selectedIndexState) : 0,
    Math.max(0, months.length - 1)
  );
  const selectedMonth = months[selectedIndex];
  const isCombined = focus === "combined";
  const showsDebt = focus !== "goal";
  const showsGoal = focus !== "debt";

  useEffect(() => {
    setSelectedIndex(0);
  }, [focus, months[0]?.month, range]);

  const chart = useMemo(() => {
    const viewWidth = layoutWidth > 0 ? Math.max(280, layoutWidth) : DEFAULT_VIEW_WIDTH;
    const compact = viewWidth < 520;
    const paddingLeft = compact ? 58 : 72;
    const paddingRight = compact ? 12 : 18;
    const chartWidth = viewWidth - paddingLeft - paddingRight;
    const viewHeight = isCombined ? 318 : 260;
    const axisY = isCombined ? 301 : 242;
    const xForIndex = (index: number) =>
      paddingLeft + (index / Math.max(1, months.length - 1)) * chartWidth;
    const maximumDebt = Math.max(
      1,
      ...months.map((month) => month.endingKnownDebtBalance)
    );
    const maximumGoal = Math.max(
      1,
      ...months.map((month) => month.trackedGoalAmount ?? 0),
      timeline.trackedGoal?.targetAmount ?? 0
    );
    const debtLane = showsDebt
      ? isCombined
        ? createLane(30, 122, maximumDebt)
        : createLane(30, 198, maximumDebt)
      : null;
    const goalLane = showsGoal
      ? isCombined
        ? createLane(164, 256, maximumGoal)
        : createLane(30, 198, maximumGoal)
      : null;
    const debtPoints = debtLane
      ? months.map((month, index) => ({
          x: xForIndex(index),
          y: debtLane.yForValue(month.endingKnownDebtBalance)
        }))
      : [];
    const goalPoints = goalLane
      ? months.map((month, index) => ({
          x: xForIndex(index),
          y: goalLane.yForValue(month.trackedGoalAmount ?? 0)
        }))
      : [];
    const targetMonthIndex = timeline.trackedGoal?.targetMonth
      ? months.findIndex((month) => month.month === timeline.trackedGoal?.targetMonth)
      : -1;

    return {
      axisY,
      chartWidth,
      compact,
      debtLane,
      debtPoints,
      goalLane,
      goalPoints,
      paddingLeft,
      paddingRight,
      targetMonthIndex,
      viewHeight,
      viewWidth,
      xForIndex
    };
  }, [isCombined, layoutWidth, months, showsDebt, showsGoal, timeline.trackedGoal]);

  if (!selectedMonth) {
    return null;
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };
  const handlePress = (event: NativeSyntheticEvent<NativeTouchEvent>) => {
    if (layoutWidth <= 0 || months.length <= 1) {
      return;
    }

    const nativeEvent = event.nativeEvent as NativeTouchEvent & { offsetX?: number };
    const locationX = Number.isFinite(nativeEvent.locationX)
      ? nativeEvent.locationX
      : nativeEvent.offsetX;

    if (typeof locationX !== "number" || !Number.isFinite(locationX)) {
      return;
    }

    const viewX = (locationX / layoutWidth) * chart.viewWidth;
    const normalizedX = Math.min(
      chart.chartWidth,
      Math.max(0, viewX - chart.paddingLeft)
    );
    setSelectedIndex(
      Math.round((normalizedX / chart.chartWidth) * Math.max(0, months.length - 1))
    );
  };
  const selectedDebtPoint = chart.debtPoints[selectedIndex];
  const selectedGoalPoint = chart.goalPoints[selectedIndex];
  const selectedPrimaryPoint = focus === "goal" ? selectedGoalPoint : selectedDebtPoint;
  const xAxisIndexes = getSampleIndexes(months.length, chart.compact ? 3 : 4);
  const chartEnd = chart.viewWidth - chart.paddingRight;
  const plotTop = chart.debtLane?.top ?? chart.goalLane?.top ?? 30;
  const plotBottom = chart.goalLane?.bottom ?? chart.debtLane?.bottom ?? 198;
  const tooltipWidth = chart.compact ? 118 : 142;
  const tooltipHeight = isCombined ? 66 : 62;
  const tooltipX = selectedPrimaryPoint
    ? Math.min(
        chartEnd - tooltipWidth,
        Math.max(
          chart.paddingLeft,
          selectedPrimaryPoint.x + tooltipWidth + 12 > chartEnd
            ? selectedPrimaryPoint.x - tooltipWidth - 12
            : selectedPrimaryPoint.x + 12
        )
      )
    : chart.paddingLeft;
  const primaryLane = focus === "goal" ? chart.goalLane : chart.debtLane;
  const tooltipY = selectedPrimaryPoint && primaryLane
    ? selectedPrimaryPoint.y < primaryLane.top + tooltipHeight + 10
      ? selectedPrimaryPoint.y + 10
      : selectedPrimaryPoint.y - tooltipHeight - 10
    : plotTop;
  const totalSelectedDebtPayment =
    selectedMonth.baseDebtPayments + selectedMonth.extraDebtPayments;

  return (
    <View style={styles.container}>
      <View style={styles.chartToolbar}>
        {canChangeRange ? (
          <View style={styles.rangeControls}>
            <RangeButton
              active={range === "near"}
              label="12 meses"
              onPress={() => setRange("near")}
            />
            <RangeButton
              active={range === "all"}
              label="Todo el plan"
              onPress={() => setRange("all")}
            />
          </View>
        ) : null}
        {showsGoal && timeline.trackedGoal?.targetMonth ? (
          <View style={styles.targetGuide}>
            <View style={styles.targetLegend} />
            <Text style={styles.guideText}>Fecha objetivo</Text>
          </View>
        ) : null}
        <Text style={styles.interactionHint}>Toca la gráfica para explorar</Text>
      </View>

      <Pressable
        accessibilityActions={[
          { name: "increment", label: "Ir al mes siguiente" },
          { name: "decrement", label: "Ir al mes anterior" }
        ]}
        accessibilityLabel={
          focus === "debt"
            ? "Evolución de la deuda pendiente"
            : focus === "goal"
              ? "Evolución del dinero reunido para la meta"
              : "Evolución de la deuda pendiente y el dinero reunido"
        }
        accessibilityRole="adjustable"
        accessibilityValue={{
          max: months.length,
          min: 1,
          now: selectedIndex + 1,
          text: `${formatTargetMonth(selectedMonth.month)}: deuda pendiente ${formatCOP(
            selectedMonth.endingKnownDebtBalance
          )}${
            showsGoal
              ? ` y dinero reunido ${formatCOP(selectedMonth.trackedGoalAmount ?? 0)}`
              : ""
          }`
        }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") {
            setSelectedIndex(Math.min(months.length - 1, selectedIndex + 1));
          }

          if (event.nativeEvent.actionName === "decrement") {
            setSelectedIndex(Math.max(0, selectedIndex - 1));
          }
        }}
        onLayout={handleLayout}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.chartPressable,
          { height: isCombined ? 300 : 250 },
          pressed && styles.pressed
        ]}
      >
        <Svg
          accessibilityElementsHidden
          height="100%"
          importantForAccessibility="no-hide-descendants"
          preserveAspectRatio="none"
          viewBox={`0 0 ${chart.viewWidth} ${chart.viewHeight}`}
          width="100%"
        >
          <Rect
            fill={colors.surface}
            height={chart.viewHeight}
            rx={16}
            width={chart.viewWidth}
            x={0}
            y={0}
          />

          {chart.debtLane ? (
            <LaneGrid
              chartEnd={chartEnd}
              chartStart={chart.paddingLeft}
              compact={chart.compact}
              label={isCombined ? "Deuda" : undefined}
              lane={chart.debtLane}
            />
          ) : null}
          {chart.goalLane ? (
            <LaneGrid
              chartEnd={chartEnd}
              chartStart={chart.paddingLeft}
              compact={chart.compact}
              label={isCombined ? "Meta" : undefined}
              lane={chart.goalLane}
            />
          ) : null}

          {chart.targetMonthIndex >= 0 ? (
            <Line
              stroke={GOAL_COLOR}
              strokeDasharray="6 6"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              x1={chart.xForIndex(chart.targetMonthIndex)}
              x2={chart.xForIndex(chart.targetMonthIndex)}
              y1={plotTop}
              y2={plotBottom}
            />
          ) : null}

          {chart.debtLane ? (
            <>
              <Path
                d={buildAreaPath(chart.debtPoints, chart.debtLane.bottom)}
                fill={DEBT_COLOR}
                fillOpacity={isCombined ? 0.06 : 0.1}
                stroke="none"
              />
              <Path
                d={buildPath(chart.debtPoints)}
                fill="none"
                stroke={DEBT_COLOR}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
              />
            </>
          ) : null}
          {chart.goalLane ? (
            <>
              <Path
                d={buildAreaPath(chart.goalPoints, chart.goalLane.bottom)}
                fill={GOAL_COLOR}
                fillOpacity={isCombined ? 0.06 : 0.1}
                stroke="none"
              />
              <Path
                d={buildPath(chart.goalPoints)}
                fill="none"
                stroke={GOAL_COLOR}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
              />
            </>
          ) : null}

          {chart.debtLane
            ? months.map((month, index) =>
                month.newlyPaidDebtIds.length > 0 ? (
                  <Circle
                    cx={chart.debtPoints[index].x}
                    cy={chart.debtPoints[index].y}
                    fill={PAYOFF_COLOR}
                    key={`event-${month.month}`}
                    r={5}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                ) : null
              )
            : null}

          {selectedPrimaryPoint ? (
            <Line
              stroke={SELECTOR_COLOR}
              strokeDasharray="3 5"
              strokeOpacity={0.22}
              strokeWidth={1.5}
              x1={selectedPrimaryPoint.x}
              x2={selectedPrimaryPoint.x}
              y1={plotTop}
              y2={plotBottom}
            />
          ) : null}
          {selectedDebtPoint ? (
            <Circle
              cx={selectedDebtPoint.x}
              cy={selectedDebtPoint.y}
              fill={colors.surface}
              r={6}
              stroke={DEBT_COLOR}
              strokeWidth={3}
            />
          ) : null}
          {selectedGoalPoint ? (
            <Circle
              cx={selectedGoalPoint.x}
              cy={selectedGoalPoint.y}
              fill={colors.surface}
              r={6}
              stroke={GOAL_COLOR}
              strokeWidth={3}
            />
          ) : null}

          {selectedPrimaryPoint ? (
            <G>
              <Rect
                fill={colors.text}
                height={tooltipHeight}
                rx={10}
                width={tooltipWidth}
                x={tooltipX}
                y={tooltipY}
              />
              <SvgText
                fill={colors.surface}
                fontFamily={SVG_FONT_FAMILY}
                fontSize={10}
                x={tooltipX + 10}
                y={tooltipY + 16}
              >
                {formatShortMonth(selectedMonth.month)}
              </SvgText>
              {isCombined ? (
                <>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={11}
                    fontWeight="700"
                    x={tooltipX + 10}
                    y={tooltipY + 36}
                  >
                    {`Deuda ${formatCompactCOP(selectedMonth.endingKnownDebtBalance)}`}
                  </SvgText>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={11}
                    fontWeight="700"
                    x={tooltipX + 10}
                    y={tooltipY + 53}
                  >
                    {`Meta ${formatCompactCOP(selectedMonth.trackedGoalAmount ?? 0)}`}
                  </SvgText>
                </>
              ) : focus === "goal" ? (
                <>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={12}
                    fontWeight="700"
                    x={tooltipX + 10}
                    y={tooltipY + 36}
                  >
                    {formatCOP(selectedMonth.trackedGoalAmount ?? 0)}
                  </SvgText>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={9}
                    x={tooltipX + 10}
                    y={tooltipY + 52}
                  >
                    {`Aporte ${formatCompactCOP(selectedMonth.goalContributionTotal)}`}
                  </SvgText>
                </>
              ) : (
                <>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={12}
                    fontWeight="700"
                    x={tooltipX + 10}
                    y={tooltipY + 36}
                  >
                    {formatCOP(selectedMonth.endingKnownDebtBalance)}
                  </SvgText>
                  <SvgText
                    fill={colors.surface}
                    fontFamily={SVG_FONT_FAMILY}
                    fontSize={9}
                    x={tooltipX + 10}
                    y={tooltipY + 52}
                  >
                    {`Pago ${formatCompactCOP(totalSelectedDebtPayment)}`}
                  </SvgText>
                </>
              )}
            </G>
          ) : null}

          {xAxisIndexes.map((index) => (
            <SvgText
              fill={LABEL_COLOR}
              fontFamily={SVG_FONT_FAMILY}
              fontSize={chart.compact ? 9 : 11}
              fontWeight={months[index].month.endsWith("-01") ? "700" : "400"}
              key={`axis-${months[index].month}`}
              textAnchor={
                index === 0 ? "start" : index === months.length - 1 ? "end" : "middle"
              }
              x={chart.xForIndex(index)}
              y={chart.axisY}
            >
              {formatShortMonth(months[index].month)}
            </SvgText>
          ))}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  chartToolbar: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rangeControls: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: "row",
    padding: 3
  },
  rangeButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  rangeButtonActive: {
    backgroundColor: colors.surface
  },
  rangeButtonText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  rangeButtonTextActive: {
    color: colors.primary
  },
  targetGuide: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  targetLegend: {
    borderColor: GOAL_COLOR,
    borderStyle: "dashed",
    borderTopWidth: 2,
    height: 2,
    width: 20
  },
  guideText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  interactionHint: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    marginLeft: "auto"
  },
  chartPressable: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  pressed: {
    opacity: 0.94
  }
});

export const financialTimelineChartColors = {
  debt: DEBT_COLOR,
  goal: GOAL_DARK_COLOR,
  payoff: PAYOFF_COLOR
};
