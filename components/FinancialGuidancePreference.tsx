import { StyleSheet, View } from "react-native";

import { SelectableCard } from "./ui/SelectableCard";
import { financialGuidanceOptions } from "../constants/financialEducation";
import { spacing } from "../constants/theme";
import type { FinancialGuidanceMode } from "../types/financial";

type FinancialGuidancePreferenceProps = {
  onChange: (mode: FinancialGuidanceMode) => void;
  value: FinancialGuidanceMode;
};

export function FinancialGuidancePreference({
  onChange,
  value
}: FinancialGuidancePreferenceProps) {
  return (
    <View style={styles.options}>
      {financialGuidanceOptions.map((option) => (
        <SelectableCard
          controlPosition="middleRight"
          key={option.value}
          onPress={() => onChange(option.value)}
          selected={value === option.value}
          style={styles.option}
          subtitle={option.description}
          subtitleStyle={styles.optionSubtitle}
          title={option.label}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.sm
  },
  option: {
    alignItems: "flex-start",
    minHeight: 68,
    paddingRight: 54
  },
  optionSubtitle: {
    textAlign: "left"
  }
});
