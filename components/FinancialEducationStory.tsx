import {
  Fragment,
  type ReactNode
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles
} from "lucide-react-native";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import { FinancialEducationCarousel } from "./FinancialEducationCarousel";
import { colors, radius, spacing, typography } from "../constants/theme";
import type { FinancialGuidanceMode } from "../types/financial";

export type FinancialEducationStoryTone =
  | "critical"
  | "neutral"
  | "positive"
  | "warning";

type FinancialEducationCalculationItem = {
  emphasis?: boolean;
  label: string;
  operator?: "+" | "−" | "=" | "×" | "÷";
  value: string;
};

type FinancialEducationStoryProps = {
  calculationItems: FinancialEducationCalculationItem[];
  calculationTitle?: string;
  closeLabel?: string;
  definition: string;
  estimateLabel?: string;
  guidanceMode: FinancialGuidanceMode;
  plainLanguageBadge?: string;
  plainLanguage: string;
  resultDescription: string;
  resultLabel: string;
  resultValue: string;
  tone: FinancialEducationStoryTone;
};

const toneStyles = {
  critical: {
    background: "#FFF4EE",
    border: "#FDBA9A",
    text: "#9A3412"
  },
  neutral: {
    background: colors.primarySoft,
    border: "#CFE0FF",
    text: colors.primaryDark
  },
  positive: {
    background: colors.supportSoft,
    border: "#B9E9CD",
    text: colors.support
  },
  warning: {
    background: colors.warningSoft,
    border: "#FED7AA",
    text: "#9A5B20"
  }
} as const;

function ResultIcon({
  color,
  tone
}: {
  color: string;
  tone: FinancialEducationStoryTone;
}) {
  if (tone === "positive") {
    return <CheckCircle2 color={color} size={23} strokeWidth={2.5} />;
  }

  if (tone === "critical" || tone === "warning") {
    return <AlertCircle color={color} size={23} strokeWidth={2.5} />;
  }

  return <Sparkles color={color} size={23} strokeWidth={2.5} />;
}

export function FinancialEducationStory({
  calculationItems,
  calculationTitle = "Cómo llegamos a este resultado",
  closeLabel = "Cerrar",
  definition,
  estimateLabel = "Estimación",
  guidanceMode,
  plainLanguageBadge = "$100",
  plainLanguage,
  resultDescription,
  resultLabel,
  resultValue,
  tone
}: FinancialEducationStoryProps) {
  const { width } = useWindowDimensions();
  const useVerticalCalculation = width < 520;
  const selectedTone = toneStyles[tone];

  const resultCard = (
    <View
      style={[
        styles.resultCard,
        {
          backgroundColor: selectedTone.background,
          borderColor: selectedTone.border
        }
      ]}
    >
      <View style={styles.resultHeading}>
        <View
          style={[
            styles.resultIcon,
            {
              backgroundColor: colors.surface,
              borderColor: selectedTone.border
            }
          ]}
        >
          <ResultIcon color={selectedTone.text} tone={tone} />
        </View>
        <View style={styles.resultHeadingText}>
          <Text style={[styles.resultLabel, { color: selectedTone.text }]}>
            {resultLabel}
          </Text>
          <Text style={styles.estimateLabel}>{estimateLabel}</Text>
        </View>
      </View>
      <Text style={[styles.resultValue, { color: selectedTone.text }]}>
        {resultValue}
      </Text>
      <Text style={styles.resultDescription}>{resultDescription}</Text>
    </View>
  );

  const calculationSection = (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{calculationTitle}</Text>
      <View
        style={[
          styles.calculationFlow,
          useVerticalCalculation && styles.calculationFlowVertical
        ]}
      >
        {calculationItems.map((item, index) => (
          <Fragment key={`${item.label}-${item.value}`}>
            {index > 0 ? (
              <View style={styles.operatorBubble}>
                <Text style={styles.operatorText}>{item.operator}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.calculationItem,
                useVerticalCalculation && styles.calculationItemVertical,
                item.emphasis && styles.calculationItemEmphasis
              ]}
            >
              <Text style={styles.calculationLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.calculationValue,
                  item.emphasis && { color: selectedTone.text }
                ]}
              >
                {item.value}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );

  const definitionBlock = (
    <View style={styles.informationRow}>
      <View style={styles.informationIcon}>
        <Sparkles color={colors.primary} size={20} strokeWidth={2.4} />
      </View>
      <View style={styles.informationText}>
        <Text style={styles.informationTitle}>Qué estás viendo</Text>
        <Text style={styles.bodyText}>{definition}</Text>
      </View>
    </View>
  );

  const plainLanguageBlock = (
    <View style={styles.plainLanguageCard}>
      <View style={styles.hundredBubble}>
        <Text style={styles.hundredText}>{plainLanguageBadge}</Text>
      </View>
      <View style={styles.informationText}>
        <Text style={styles.informationTitle}>En palabras simples</Text>
        <Text style={styles.bodyText}>{plainLanguage}</Text>
      </View>
    </View>
  );

  let slides: ReactNode[];

  if (guidanceMode === "guided") {
    slides = [
      resultCard,
      calculationSection,
      <View style={styles.meaningSlide}>
        {definitionBlock}
        {plainLanguageBlock}
      </View>
    ];
  } else if (guidanceMode === "brief") {
    slides = [
      <View style={styles.meaningSlide}>
        {resultCard}
        {plainLanguageBlock}
      </View>,
      calculationSection
    ];
  } else {
    slides = [
      <View style={styles.meaningSlide}>
        {resultCard}
        {calculationSection}
      </View>
    ];
  }

  return (
    <FinancialEducationCarousel
      closeLabel={closeLabel}
      resetKey={guidanceMode}
      slides={slides}
    />
  );
}

const styles = StyleSheet.create({
  meaningSlide: {
    gap: spacing.sm
  },
  resultCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  resultHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  resultIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  resultHeadingText: {
    alignItems: "flex-start",
    flex: 1,
    gap: 2
  },
  resultLabel: {
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  estimateLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  resultValue: {
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  resultDescription: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  calculationFlow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.xs
  },
  calculationFlowVertical: {
    flexDirection: "column"
  },
  calculationItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    padding: spacing.sm
  },
  calculationItemVertical: {
    width: "100%"
  },
  calculationItemEmphasis: {
    backgroundColor: colors.surface,
    borderColor: "#CFE0FF",
    borderWidth: 2
  },
  calculationLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  calculationValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  operatorBubble: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  operatorText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  informationRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  informationIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  informationText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  informationTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  bodyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  plainLanguageCard: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  hundredBubble: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  hundredText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  }
});
