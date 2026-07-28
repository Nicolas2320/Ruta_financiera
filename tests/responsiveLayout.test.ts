import { describe, expect, it } from "vitest";

import { getResponsiveLayout } from "../utils/responsiveLayout";

describe("getResponsiveLayout", () => {
  it.each([
    [320, true, true, 12, 296],
    [390, true, false, 16, 358],
    [430, true, false, 16, 398],
    [600, false, false, 24, 552],
    [768, false, false, 24, 720]
  ])(
    "classifies a %ipx viewport consistently",
    (width, isPhone, isSmallPhone, screenPadding, contentWidth) => {
      expect(getResponsiveLayout(width)).toMatchObject({
        contentWidth,
        isPhone,
        isSmallPhone,
        screenPadding,
        width
      });
    }
  );

  it("uses tablet and desktop breakpoints based on available width", () => {
    expect(getResponsiveLayout(768)).toMatchObject({
      isDesktop: false,
      isTablet: true
    });
    expect(getResponsiveLayout(1024)).toMatchObject({
      isDesktop: true,
      isTablet: false
    });
  });

  it("sanitizes invalid widths", () => {
    expect(getResponsiveLayout(Number.NaN).width).toBe(0);
    expect(getResponsiveLayout(-100).contentWidth).toBe(0);
  });
});
