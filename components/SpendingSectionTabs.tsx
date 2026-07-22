import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { CreditCard, ReceiptText } from "lucide-react-native";
import { useReducedMotion } from "react-native-reanimated";
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

type Route = Parameters<ReturnType<typeof useRouter>["replace"]>[0];

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

let lastActiveIndex: number | null = null;
let pendingContentTab: SpendingTab | null = null;

export function SpendingSectionContent({
  activeTab,
  children
}: PropsWithChildren<{ activeTab: SpendingTab }>) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = useRef(
    pendingContentTab === activeTab && !reduceMotion && Platform.OS !== "web"
  ).current;
  const opacity = useRef(new Animated.Value(shouldAnimate ? 0.9 : 1)).current;

  useEffect(() => {
    pendingContentTab = null;

    if (!shouldAnimate) {
      opacity.setValue(1);
      return;
    }

    const animation = Animated.timing(opacity, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== "web"
    });

    animation.start();

    return () => animation.stop();
  }, [opacity, shouldAnimate]);

  return (
    <Animated.View style={[styles.contentTransition, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function SpendingSectionTabs({ activeTab }: { activeTab: SpendingTab }) {
  const router = useRouter();
  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const previousIndex = useRef(lastActiveIndex).current;
  const indicatorPosition = useRef(
    new Animated.Value(previousIndex ?? activeIndex)
  ).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const hasAnimatedIndicator = useRef(false);
  const reduceMotion = useReducedMotion();
  const indicatorWidth = Math.max(
    (containerWidth - spacing.xs * 2 - spacing.sm) / tabs.length,
    0
  );
  const indicatorTranslateX = indicatorPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorWidth + spacing.sm]
  });

  useEffect(() => {
    lastActiveIndex = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (containerWidth <= 0 || hasAnimatedIndicator.current) {
      return;
    }

    hasAnimatedIndicator.current = true;

    if (previousIndex === null || previousIndex === activeIndex || reduceMotion) {
      indicatorPosition.setValue(activeIndex);
      return;
    }

    const animation = Animated.spring(indicatorPosition, {
      damping: 20,
      mass: 0.8,
      stiffness: 190,
      toValue: activeIndex,
      useNativeDriver: Platform.OS !== "web"
    });

    animation.start();

    return () => animation.stop();
  }, [activeIndex, containerWidth, indicatorPosition, previousIndex, reduceMotion]);

  const navigateToTab = (tab: (typeof tabs)[number]) => {
    if (tab.key === activeTab) {
      return;
    }

    lastActiveIndex = activeIndex;
    pendingContentTab = tab.key;
    router.replace(tab.route as Route);
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

      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        const Icon = tab.icon;
        const color = active ? colors.primary : colors.textSubtle;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => navigateToTab(tab)}
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
  contentTransition: {
    gap: spacing.md
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
