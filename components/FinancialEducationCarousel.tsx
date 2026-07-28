import {
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";

import { useFinancialEducationModalClose } from "./FinancialEducationModal";
import { colors, radius, spacing, typography } from "../constants/theme";

type FinancialEducationCarouselProps = {
  closeLabel?: string;
  resetKey?: string;
  slides: ReactNode[];
};

export function FinancialEducationCarousel({
  closeLabel = "Cerrar",
  resetKey = "default",
  slides
}: FinancialEducationCarouselProps) {
  const closeModal = useFinancialEducationModalClose();
  const [activeSlide, setActiveSlide] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [slideHeights, setSlideHeights] = useState<number[]>([]);
  const carouselRef = useRef<ScrollView>(null);
  const slideCount = slides.length;
  const activeSlideHeight = slideHeights[activeSlide];

  useEffect(() => {
    setActiveSlide(0);
    setSlideHeights([]);
    carouselRef.current?.scrollTo?.({ animated: false, x: 0, y: 0 });
  }, [resetKey, slideCount]);

  const goToSlide = (requestedSlide: number) => {
    const nextSlide = Math.max(0, Math.min(requestedSlide, slideCount - 1));
    setActiveSlide(nextSlide);
    carouselRef.current?.scrollTo?.({
      animated: true,
      x: pageWidth * nextSlide,
      y: 0
    });
  };

  const handleCarouselLayout = (event: LayoutChangeEvent) => {
    setPageWidth(event.nativeEvent.layout.width);
  };

  const handleSlideContentLayout = (
    index: number,
    event: LayoutChangeEvent
  ) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);

    setSlideHeights((currentHeights) => {
      if (currentHeights[index] === nextHeight) {
        return currentHeights;
      }

      const nextHeights = [...currentHeights];
      nextHeights[index] = nextHeight;
      return nextHeights;
    });
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (pageWidth <= 0) {
      return;
    }

    const nextSlide = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActiveSlide(Math.max(0, Math.min(nextSlide, slideCount - 1)));
  };

  return (
    <View style={styles.container}>
      <View
        onLayout={handleCarouselLayout}
        style={[
          styles.carouselViewport,
          activeSlideHeight ? { height: activeSlideHeight } : null
        ]}
      >
        <ScrollView
          horizontal
          key={resetKey}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled
          ref={carouselRef}
          scrollEnabled={slideCount > 1}
          showsHorizontalScrollIndicator={false}
        >
          {slides.map((slide, index) => (
            <View
              accessibilityElementsHidden={index !== activeSlide}
              importantForAccessibility={
                index === activeSlide ? "yes" : "no-hide-descendants"
              }
              key={`slide-${index}`}
              style={[
                styles.slide,
                pageWidth > 0 ? { width: pageWidth } : styles.slideFallbackWidth
              ]}
            >
              <View
                onLayout={(event) => handleSlideContentLayout(index, event)}
                style={styles.slideContent}
              >
                {slide}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {slideCount > 1 ? (
        <View style={styles.navigation}>
          <View style={styles.navigationSlot}>
            {activeSlide > 0 ? (
              <Pressable
                accessibilityLabel="Ver explicación anterior"
                accessibilityRole="button"
                onPress={() => goToSlide(activeSlide - 1)}
                style={({ pressed }) => [
                  styles.navigationButton,
                  styles.navigationButtonSecondary,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.navigationButtonSecondaryText}>Anterior</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.progress}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.dots}
            >
              {slides.map((_, index) => (
                <View
                  key={`indicator-${index}`}
                  style={[styles.dot, index === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>
              {activeSlide + 1} de {slideCount}
            </Text>
          </View>

          <View style={[styles.navigationSlot, styles.navigationSlotEnd]}>
            <Pressable
              accessibilityLabel={
                activeSlide === slideCount - 1
                  ? closeLabel
                  : "Ver siguiente explicación"
              }
              accessibilityRole="button"
              onPress={() =>
                activeSlide === slideCount - 1
                  ? closeModal()
                  : goToSlide(activeSlide + 1)
              }
              style={({ pressed }) => [
                styles.navigationButton,
                styles.navigationButtonPrimary,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.navigationButtonPrimaryText}>
                {activeSlide === slideCount - 1 ? closeLabel : "Siguiente"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  carouselViewport: {
    overflow: "hidden",
    width: "100%"
  },
  slide: {
    paddingHorizontal: 1
  },
  slideContent: {
    width: "100%"
  },
  slideFallbackWidth: {
    width: "100%"
  },
  progress: {
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center"
  },
  progressText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  dot: {
    backgroundColor: "#CBD5E1",
    borderRadius: radius.pill,
    height: 8,
    width: 8
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 22
  },
  navigation: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  navigationSlot: {
    flex: 1,
    minWidth: 0
  },
  navigationSlotEnd: {
    alignItems: "flex-end"
  },
  navigationButton: {
    alignItems: "center",
    borderRadius: radius.md,
    justifyContent: "center",
    maxWidth: 150,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    width: "100%"
  },
  navigationButtonPrimary: {
    backgroundColor: colors.primary
  },
  navigationButtonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  navigationButtonPrimaryText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
  },
  navigationButtonSecondaryText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  pressed: {
    opacity: 0.78
  }
});
