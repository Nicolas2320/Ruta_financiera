import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { CreditCard, ReceiptText } from "lucide-react-native";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";

type SpendingTab = "spending" | "debts";

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

const tabs = [
  {
    key: "spending" as SpendingTab,
    label: "Gastos mensuales",
    route: "/spending",
    icon: ReceiptText
  },
  {
    key: "debts" as SpendingTab,
    label: "Deudas",
    route: "/debts",
    icon: CreditCard
  }
];

export function SpendingSectionTabs({ activeTab }: { activeTab: SpendingTab }) {
  const router = useRouter();
  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const indicatorPosition = useRef(new Animated.Value(activeIndex)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [visualActiveTab, setVisualActiveTab] = useState(activeTab);
  const [isNavigating, setIsNavigating] = useState(false);
  const indicatorWidth = Math.max(
    (containerWidth - spacing.xs * 2 - spacing.sm) / tabs.length,
    0
  );
  const indicatorTranslateX = indicatorPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorWidth + spacing.sm]
  });

  useEffect(() => {
    const nextIndex = tabs.findIndex((tab) => tab.key === activeTab);
    indicatorPosition.setValue(nextIndex);
    setVisualActiveTab(activeTab);
    setIsNavigating(false);
  }, [activeTab, indicatorPosition]);

  const navigateToTab = (tab: (typeof tabs)[number], nextIndex: number) => {
    if (tab.key === visualActiveTab || isNavigating) {
      return;
    }

    setVisualActiveTab(tab.key);
    setIsNavigating(true);

    Animated.timing(indicatorPosition, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: nextIndex,
      useNativeDriver: Platform.OS !== "web"
    }).start(({ finished }) => {
      setIsNavigating(false);

      if (finished) {
        router.push(tab.route as Route);
        return;
      }

      setVisualActiveTab(activeTab);
      indicatorPosition.setValue(activeIndex);
    });
  };

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={styles.tabsCard}
    >
      {indicatorWidth > 0 ? (
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              transform: [{ translateX: indicatorTranslateX }],
              width: indicatorWidth
            }
          ]}
        />
      ) : null}

      {tabs.map((tab, index) => {
        const active = tab.key === visualActiveTab;
        const Icon = tab.icon;
        const color = active ? colors.primary : colors.textSubtle;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            disabled={isNavigating}
            key={tab.key}
            onPress={() => navigateToTab(tab, index)}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.pressed
            ]}
          >
            <Icon color={color} size={19} strokeWidth={2.4} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.xs
  },
  activeIndicator: {
    backgroundColor: colors.primarySoft,
    borderColor: "#C9DAFF",
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: spacing.xs,
    left: spacing.xs,
    pointerEvents: "none",
    position: "absolute",
    top: spacing.xs
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    zIndex: 1
  },
  tabText: {
    color: colors.textSubtle,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  tabTextActive: {
    color: colors.primary
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
