import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { X } from "lucide-react-native";

import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

type AppModalSize = "compact" | "default" | "wide";
type AppModalActionVariant = "danger" | "primary" | "secondary";

type AppModalProps = {
  bodyStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  footer?: ReactNode;
  icon?: ReactNode;
  iconBackgroundColor?: string;
  onClose: () => void;
  scrollable?: boolean;
  size?: AppModalSize;
  subtitle?: string;
  title: string;
  visible: boolean;
};

type AppModalActionProps = {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
  variant?: AppModalActionVariant;
};

type MobileSheetDismissInput = {
  distance: number;
  velocity: number;
  viewportHeight: number;
};

export function shouldDismissMobileSheet({
  distance,
  velocity,
  viewportHeight
}: MobileSheetDismissInput) {
  const distanceThreshold = Math.min(140, viewportHeight * 0.18);
  const isLongDrag = distance >= distanceThreshold;
  const isFastDrag = distance >= 28 && velocity >= 0.9;

  return isLongDrag || isFastDrag;
}

export function AppModal({
  bodyStyle,
  children,
  closeAccessibilityLabel = "Cerrar ventana",
  footer,
  icon,
  iconBackgroundColor,
  onClose,
  scrollable = false,
  size = "default",
  subtitle,
  title,
  visible
}: AppModalProps) {
  const { height, width } = useWindowDimensions();
  const isPhone = width < 600;
  const translateY = useRef(new Animated.Value(0)).current;
  const isPhoneRef = useRef(isPhone);
  const onCloseRef = useRef(onClose);
  const viewportHeightRef = useRef(height);

  isPhoneRef.current = isPhone;
  onCloseRef.current = onClose;
  viewportHeightRef.current = height;

  useEffect(() => {
    translateY.setValue(0);
  }, [translateY, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isPhoneRef.current,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        isPhoneRef.current &&
        gestureState.dy > 3 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_event, gestureState) => {
        translateY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_event, gestureState) => {
        const distance = Math.max(0, gestureState.dy);

        if (
          shouldDismissMobileSheet({
            distance,
            velocity: gestureState.vy,
            viewportHeight: viewportHeightRef.current
          })
        ) {
          Animated.timing(translateY, {
            duration: 180,
            toValue: viewportHeightRef.current + spacing.xl,
            useNativeDriver: true
          }).start(({ finished }) => {
            translateY.setValue(0);

            if (finished) {
              onCloseRef.current();
            }
          });
          return;
        }

        Animated.spring(translateY, {
          bounciness: 0,
          speed: 20,
          toValue: 0,
          useNativeDriver: true
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          bounciness: 0,
          speed: 20,
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;
  const sizeStyle =
    size === "wide"
      ? styles.modalCardWide
      : size === "compact"
        ? styles.modalCardCompact
        : styles.modalCardDefault;
  const body = <View style={[styles.body, bodyStyle]}>{children}</View>;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      {visible ? (
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Cerrar modal"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdrop}
          />

          <View style={[styles.position, isPhone && styles.positionPhone]}>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.modalCard,
                sizeStyle,
                isPhone && styles.modalCardPhone,
                isPhone && { transform: [{ translateY }] }
              ]}
            >
              {isPhone ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={styles.dragHandle}
                  testID="app-modal-drag-handle"
                  {...panResponder.panHandlers}
                >
                  <View style={styles.grabber} />
                </View>
              ) : null}

              <View style={styles.header}>
                {icon ? (
                  <View
                    style={[
                      styles.headerIcon,
                      iconBackgroundColor
                        ? { backgroundColor: iconBackgroundColor }
                        : null
                    ]}
                  >
                    {icon}
                  </View>
                ) : null}
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <Pressable
                  accessibilityLabel={closeAccessibilityLabel}
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.pressed
                  ]}
                >
                  <X color={colors.text} size={21} strokeWidth={2.4} />
                </Pressable>
              </View>

              {scrollable ? (
                <ScrollView
                  alwaysBounceVertical={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.bodyScroll}
                >
                  {body}
                </ScrollView>
              ) : (
                body
              )}

              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </Animated.View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

export function AppModalActions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function AppModalAction({
  disabled = false,
  icon,
  label,
  onPress,
  variant = "primary"
}: AppModalActionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        variant === "primary" && styles.actionPrimary,
        variant === "secondary" && styles.actionSecondary,
        variant === "danger" && styles.actionDanger,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionText,
          variant === "secondary"
            ? styles.actionTextSecondary
            : styles.actionTextLight,
          disabled && styles.actionTextDisabled
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  position: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  positionPhone: {
    justifyContent: "flex-end",
    paddingBottom: 0,
    paddingHorizontal: 0
  },
  modalCard: {
    ...shadows.card,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxHeight: "92%",
    overflow: "hidden",
    padding: spacing.lg,
    width: "100%"
  },
  modalCardCompact: {
    maxWidth: 440
  },
  modalCardDefault: {
    maxWidth: 540
  },
  modalCardWide: {
    maxWidth: 680
  },
  modalCardPhone: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.md
  },
  dragHandle: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    minHeight: 30
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.disabledBorder,
    borderRadius: radius.pill,
    height: 5,
    width: 44
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  body: {
    gap: spacing.md
  },
  bodyScroll: {
    flexShrink: 1
  },
  scrollContent: {
    paddingBottom: spacing.xs
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md
  },
  actions: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end"
  },
  action: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 132,
    paddingHorizontal: spacing.md
  },
  actionPrimary: {
    backgroundColor: colors.primary
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  actionDanger: {
    backgroundColor: colors.danger
  },
  actionDisabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabledBorder
  },
  actionText: {
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
  },
  actionTextLight: {
    color: colors.surface
  },
  actionTextSecondary: {
    color: colors.primary
  },
  actionTextDisabled: {
    color: colors.textSubtle
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
