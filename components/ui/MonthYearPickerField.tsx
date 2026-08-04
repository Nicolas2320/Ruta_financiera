import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import {
  formatMonthYear,
  getCurrentMonthYear,
  getMonthYearValue,
  isBeforeMonthYear,
  monthLabels,
  serializeMonthYear,
  type MonthYearValue
} from "../../utils/monthYear";
import { AppModal, AppModalAction, AppModalActions } from "./AppModal";

function getInitialDraft(value: string | null | undefined) {
  const current = getCurrentMonthYear();
  const stored = getMonthYearValue(value);
  return stored && !isBeforeMonthYear(stored, current) ? stored : current;
}

export function MonthYearPickerField({
  helper,
  label = "Mes objetivo",
  onChange,
  value
}: {
  helper?: string;
  label?: string;
  onChange: (value: string) => void;
  value: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<MonthYearValue>(() => getInitialDraft(value));
  const current = getCurrentMonthYear();
  const selected = getMonthYearValue(value);
  const canSelectPreviousYear = draft.year > current.year;

  const open = () => {
    setDraft(getInitialDraft(value));
    setVisible(true);
  };

  const confirm = () => {
    onChange(serializeMonthYear(draft));
    setVisible(false);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <Pressable
        accessibilityLabel={
          selected
            ? `Cambiar mes objetivo. Actual: ${formatMonthYear(selected)}`
            : "Seleccionar mes objetivo"
        }
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <CalendarDays color={colors.primary} size={21} strokeWidth={2.4} />
        <Text style={[styles.fieldText, !selected && styles.placeholder]}>
          {selected ? formatMonthYear(selected) : "Seleccionar mes y año"}
        </Text>
        <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
      </Pressable>

      <AppModal
        footer={
          <AppModalActions>
            <AppModalAction label="Cancelar" onPress={() => setVisible(false)} variant="secondary" />
            <AppModalAction
              icon={<CheckCircle2 color={colors.surface} size={19} strokeWidth={2.5} />}
              label="Usar este mes"
              onPress={confirm}
            />
          </AppModalActions>
        }
        icon={<CalendarDays color={colors.primary} size={23} strokeWidth={2.4} />}
        onClose={() => setVisible(false)}
        size="compact"
        subtitle="No necesitamos un día exacto para hacer una proyección mensual."
        title="Mes objetivo"
        visible={visible}
      >
        <View style={styles.preview}>
          <CalendarDays color={colors.primary} size={22} strokeWidth={2.4} />
          <Text style={styles.previewText}>{formatMonthYear(draft)}</Text>
        </View>

        <View style={styles.yearRow}>
          <Text style={styles.sectionLabel}>Año</Text>
          <View style={styles.yearControls}>
            <Pressable
              accessibilityLabel="Año anterior"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSelectPreviousYear }}
              disabled={!canSelectPreviousYear}
              onPress={() => setDraft((currentDraft) => ({
                ...currentDraft,
                year: currentDraft.year - 1
              }))}
              style={({ pressed }) => [
                styles.yearButton,
                !canSelectPreviousYear && styles.disabled,
                pressed && canSelectPreviousYear && styles.pressed
              ]}
            >
              <ChevronLeft
                color={canSelectPreviousYear ? colors.primary : colors.textSubtle}
                size={18}
                strokeWidth={2.5}
              />
            </Pressable>
            <Text style={styles.yearValue}>{draft.year}</Text>
            <Pressable
              accessibilityLabel="Año siguiente"
              accessibilityRole="button"
              onPress={() => setDraft((currentDraft) => ({
                ...currentDraft,
                year: currentDraft.year + 1
              }))}
              style={({ pressed }) => [styles.yearButton, pressed && styles.pressed]}
            >
              <ChevronRight color={colors.primary} size={18} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Mes</Text>
        <View style={styles.monthGrid}>
          {monthLabels.map((monthLabel, month) => {
            const candidate = { month, year: draft.year };
            const disabled = isBeforeMonthYear(candidate, current);
            const isSelected = draft.month === month;

            return (
              <Pressable
                accessibilityLabel={monthLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected: isSelected }}
                disabled={disabled}
                key={monthLabel}
                onPress={() => setDraft((currentDraft) => ({ ...currentDraft, month }))}
                style={({ pressed }) => [
                  styles.monthButton,
                  isSelected && styles.monthButtonSelected,
                  disabled && styles.disabled,
                  pressed && !disabled && styles.pressed
                ]}
              >
                <Text
                  style={[
                    styles.monthText,
                    isSelected && styles.monthTextSelected,
                    disabled && styles.monthTextDisabled
                  ]}
                >
                  {monthLabel.slice(0, 3)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
    width: "100%"
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
  field: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md
  },
  fieldText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  placeholder: {
    color: colors.textSubtle
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  previewText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  yearRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  yearControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  yearButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  yearValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    minWidth: 52,
    textAlign: "center"
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.xs
  },
  monthButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  monthText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold
  },
  monthTextSelected: {
    color: colors.surface
  },
  monthTextDisabled: {
    color: colors.textSubtle
  },
  disabled: {
    opacity: 0.42
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
