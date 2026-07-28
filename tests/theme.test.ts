import { describe, expect, it } from "vitest";

import { colors, typography } from "../constants/theme";

function getRelativeLuminance(hexColor: string) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    );

  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid hex color: ${hexColor}`);
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("mobile typography tokens", () => {
  it("keeps essential mobile text at readable sizes", () => {
    expect(typography.body).toBeGreaterThanOrEqual(16);
    expect(typography.button).toBeGreaterThanOrEqual(16);
    expect(typography.option).toBeGreaterThanOrEqual(16);
    expect(typography.small).toBeGreaterThanOrEqual(11);
  });

  it("uses comfortable line heights", () => {
    expect(typography.lineHeight.body / typography.body).toBeGreaterThanOrEqual(1.4);
    expect(typography.lineHeight.option / typography.option).toBeGreaterThanOrEqual(1.35);
    expect(typography.lineHeight.caption / typography.caption).toBeGreaterThanOrEqual(1.35);
  });

  it("maps weight names to their conventional values", () => {
    expect(typography.weight).toEqual({
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "800"
    });
  });
});

describe("text color contrast", () => {
  it.each([
    ["support on supportSoft", colors.support, colors.supportSoft],
    ["support on surface", colors.support, colors.surface],
    ["primary on primarySoft", colors.primary, colors.primarySoft],
    ["textSubtle on background", colors.textSubtle, colors.background]
  ])("%s stays at or above 4.5:1", (_label, foreground, background) => {
    expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
