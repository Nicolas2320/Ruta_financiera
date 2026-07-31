import { Pressable, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  StyleSheet: {
    create: (styles: unknown) => styles
  },
  Text: "Text",
  View: "View"
}));

vi.mock("lucide-react-native", () => ({
  ArrowRight: "ArrowRight"
}));

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, typography } from "../constants/theme";

let renderer: ReactTestRenderer | null = null;

afterEach(async () => {
  if (renderer) {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

function mergeStyles(styles: Array<Record<string, unknown> | false | null | undefined>) {
  return Object.assign({}, ...styles.filter(Boolean));
}

describe("PrimaryButton design hierarchy", () => {
  it("keeps compact destructive actions accessible and token-driven", async () => {
    await act(async () => {
      renderer = create(
        <PrimaryButton
          accessibilityLabel="Eliminar deuda"
          icon={null}
          onPress={vi.fn()}
          size="compact"
          title="Eliminar"
          variant="danger"
        />
      );
    });

    const button = renderer!.root.findByType(Pressable);
    const buttonStyle = mergeStyles(button.props.style({ pressed: false }));
    const text = renderer!.root.findByType(Text);
    const textStyle = mergeStyles(text.props.style);

    expect(buttonStyle).toMatchObject({
      backgroundColor: colors.dangerSoft,
      borderColor: colors.dangerBorder,
      minHeight: 44
    });
    expect(textStyle).toMatchObject({
      color: colors.danger,
      fontSize: typography.button,
      lineHeight: typography.lineHeight.button
    });
  });
});
