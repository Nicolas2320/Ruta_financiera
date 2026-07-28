import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode
} from "react";
import { CircleQuestionMark } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppModal } from "./ui/AppModal";
import {
  financialEducationContent,
  getFinancialEducationSummary,
  type FinancialEducationConcept
} from "../constants/financialEducation";
import { colors, radius, spacing, typography } from "../constants/theme";
import type { FinancialGuidanceMode } from "../types/financial";

type FinancialEducationModalProps = {
  accessibilityLabel: string;
  children: ReactNode;
  concepts?: FinancialEducationConcept[];
  guidanceMode: FinancialGuidanceMode;
  icon?: ReactNode;
  iconBackgroundColor?: string;
  title: string;
  triggerSize?: "compact" | "default";
};

const FinancialEducationModalCloseContext = createContext<() => void>(
  () => undefined
);

export function useFinancialEducationModalClose() {
  return useContext(FinancialEducationModalCloseContext);
}

export function FinancialEducationModal({
  accessibilityLabel,
  children,
  concepts = [],
  guidanceMode,
  icon,
  iconBackgroundColor,
  title,
  triggerSize = "default"
}: FinancialEducationModalProps) {
  const [visible, setVisible] = useState(false);
  const lastClosedAt = useRef(0);
  const closeModal = () => {
    lastClosedAt.current = Date.now();
    setVisible(false);
  };
  const openModal = () => {
    if (Date.now() - lastClosedAt.current < 350) {
      return;
    }

    setVisible(true);
  };

  return (
    <>
      <Pressable
        accessibilityHint="Abre una explicación sin salir de esta pantalla"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={openModal}
        style={({ pressed }) => [
          styles.helpButton,
          triggerSize === "compact" && styles.helpButtonCompact,
          pressed && styles.pressed
        ]}
      >
        <CircleQuestionMark
          color={colors.primary}
          size={triggerSize === "compact" ? 17 : 21}
          strokeWidth={2.5}
        />
      </Pressable>

      <AppModal
        closeAccessibilityLabel="Cerrar ventana de explicación"
        icon={icon}
        iconBackgroundColor={iconBackgroundColor}
        onClose={closeModal}
        title={title}
        visible={visible}
      >
        {concepts.length > 0 ? (
          <View style={styles.summaryGroup}>
            {concepts.map((concept) => (
              <Text key={concept} style={styles.summary}>
                {getFinancialEducationSummary(concept, guidanceMode) ??
                  financialEducationContent[concept].definition}
              </Text>
            ))}
          </View>
        ) : null}

        <FinancialEducationModalCloseContext.Provider value={closeModal}>
          <View style={styles.details}>{children}</View>
        </FinancialEducationModalCloseContext.Provider>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  helpButtonCompact: {
    height: 30,
    width: 30
  },
  summaryGroup: {
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  summary: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  details: {
    gap: spacing.md
  },
  pressed: {
    opacity: 0.78
  }
});
