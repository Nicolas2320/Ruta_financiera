import { Modal, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
    },
    spring: () => ({ start: (callback?: () => void) => callback?.() }),
    timing: () => ({
      start: (callback?: (result: { finished: boolean }) => void) =>
        callback?.({ finished: true })
    })
  },
  Modal: "Modal",
  PanResponder: {
    create: () => ({ panHandlers: {} })
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    absoluteFillObject: {},
    create: (styles: unknown) => styles
  },
  Text: "Text",
  View: "View",
  useWindowDimensions: () => ({ height: 900, width: 1024 })
}));

vi.mock("lucide-react-native", () => ({
  AlertCircle: "AlertCircle",
  Check: "Check",
  CheckCircle2: "CheckCircle2",
  CircleQuestionMark: "CircleQuestionMark",
  Sparkles: "Sparkles",
  X: "X"
}));

vi.mock("../lib/supabase", () => ({
  supabase: null
}));

import { FinancialEducationModal } from "../components/FinancialEducationModal";
import { FinancialEducationStory } from "../components/FinancialEducationStory";
import { FinancialGuidancePreference } from "../components/FinancialGuidancePreference";
import {
  AppModal,
  AppModalAction,
  AppModalActions,
  shouldDismissMobileSheet
} from "../components/ui/AppModal";
import {
  getFinancialEducationSummary,
  getFinancialGuidanceOption
} from "../constants/financialEducation";
import { normalizeOnboardingData } from "../lib/financialProfile";
import {
  initialOnboarding,
  normalizeFinancialGuidanceMode
} from "../types/financial";

let renderer: ReactTestRenderer | null = null;

afterEach(async () => {
  vi.restoreAllMocks();

  if (renderer) {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

describe("financial guidance preference", () => {
  it("uses brief guidance as the safe default for legacy or invalid values", () => {
    expect(initialOnboarding.financialGuidanceMode).toBe("brief");
    expect(normalizeFinancialGuidanceMode(undefined)).toBe("brief");
    expect(normalizeFinancialGuidanceMode("unknown")).toBe("brief");
    expect(normalizeOnboardingData({ firstName: "Ana" }).financialGuidanceMode).toBe("brief");
  });

  it("preserves a supported preference when normalizing persisted onboarding", () => {
    expect(
      normalizeOnboardingData({ financialGuidanceMode: "guided" }).financialGuidanceMode
    ).toBe("guided");
    expect(getFinancialGuidanceOption("brief").label).toBe("Breve (Recomendado)");
    expect(getFinancialGuidanceOption("direct").label).toBe("Directo");
  });

  it("offers the three agreed presentation modes", async () => {
    const onChange = vi.fn();

    await act(async () => {
      renderer = create(
        <FinancialGuidancePreference onChange={onChange} value="brief" />
      );
    });

    const selectableOptions = renderer!.root.findAll(
      (node) => typeof node.props.onPress === "function" && node.props.accessibilityState?.selected !== undefined
    );

    expect(selectableOptions).toHaveLength(3);
    expect(selectableOptions.filter((node) => node.props.accessibilityState.selected)).toHaveLength(1);

    await act(async () => {
      selectableOptions[0].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith("guided");
  });
});

describe("adaptive financial explanations", () => {
  it("keeps the explanation in a modal opened from a question button", async () => {
    await act(async () => {
      renderer = create(
        <FinancialEducationModal
          accessibilityLabel="Explicar margen mensual"
          concepts={["monthlyMargin"]}
          guidanceMode="guided"
          title="Entiende tu margen"
        >
          <Text>Detalle del cálculo</Text>
        </FinancialEducationModal>
      );
    });

    expect(renderer!.root.findByType(Modal).props.visible).toBe(false);

    const helpButton = renderer!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Explicar margen mensual" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => {
      helpButton.props.onPress();
    });

    expect(renderer!.root.findByType(Modal).props.visible).toBe(true);

    const renderedText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");

    expect(renderedText).toContain("El margen mensual es el dinero");
    expect(renderedText).toContain("Detalle del cálculo");
  });

  it("uses the brief explanation inside the modal and closes from the header", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);

    await act(async () => {
      renderer = create(
        <FinancialEducationModal
          accessibilityLabel="Explicar aporte"
          concepts={["monthlyContribution"]}
          guidanceMode="brief"
          title="Cómo calculamos tu aporte"
        >
          <Text>Datos usados en el aporte</Text>
        </FinancialEducationModal>
      );
    });

    expect(getFinancialEducationSummary("monthlyContribution", "brief")).toContain(
      "referencia mensual"
    );

    const helpButton = renderer!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Explicar aporte" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => {
      helpButton.props.onPress();
    });

    const openedText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");
    expect(openedText).toContain("referencia mensual");
    expect(openedText).toContain("Datos usados en el aporte");

    const closeButton = renderer!.root.findByProps({
      accessibilityLabel: "Cerrar ventana de explicación"
    });
    await act(async () => {
      closeButton.props.onPress();
    });

    expect(renderer!.root.findByType(Modal).props.visible).toBe(false);

    now.mockReturnValue(1_100);
    await act(async () => {
      helpButton.props.onPress();
    });
    expect(renderer!.root.findByType(Modal).props.visible).toBe(false);

    now.mockReturnValue(1_400);
    await act(async () => {
      helpButton.props.onPress();
    });
    expect(renderer!.root.findByType(Modal).props.visible).toBe(true);
  });

  it("keeps direct-mode help on demand and uses one concise definition", async () => {
    await act(async () => {
      renderer = create(
        <FinancialEducationModal
          accessibilityLabel="Explicar relación de gastos"
          concepts={["expenseRatio"]}
          guidanceMode="direct"
          title="Entiende tus gastos"
        >
          <Text>Fórmula de la relación</Text>
        </FinancialEducationModal>
      );
    });

    const helpButton = renderer!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Explicar relación de gastos" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => {
      helpButton.props.onPress();
    });

    const modalText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");

    expect(modalText).toContain("compara tus gastos mensuales");
    expect(modalText).toContain("Fórmula de la relación");
  });

  it("changes the visual story composition instead of only adding more paragraphs", async () => {
    const story = (guidanceMode: "guided" | "direct") => (
      <FinancialEducationStory
        calculationItems={[
          { label: "Ingresos", value: "$2.250.000" },
          { label: "Gastos", operator: "−", value: "$3.000.000" },
          { emphasis: true, label: "Margen", operator: "=", value: "−$750.000" }
        ]}
        definition="Definición del margen mensual."
        guidanceMode={guidanceMode}
        plainLanguage="Por cada $100 que entra, salen cerca de $133."
        resultDescription="Tus gastos representan el 133% de tus ingresos."
        resultLabel="Déficit mensual estimado"
        resultValue="−$750.000"
        tone="critical"
      />
    );

    await act(async () => {
      renderer = create(story("guided"));
    });

    const guidedText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");
    expect(guidedText).toContain("Qué estás viendo");
    expect(guidedText).toContain("En palabras simples");
    expect(guidedText).not.toContain("Primer paso");

    const firstNextButton = renderer!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Ver siguiente explicación" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => {
      firstNextButton.props.onPress();
    });

    const secondSlideText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ")
      .replace(/\s+/g, " ");
    expect(secondSlideText).toContain("2 de 3");

    const secondNextButton = renderer!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Ver siguiente explicación" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => {
      secondNextButton.props.onPress();
    });

    expect(
      renderer!.root.findAll(
        (node) =>
          node.props.accessibilityLabel === "Cerrar" &&
          typeof node.props.onPress === "function"
      )
    ).toHaveLength(1);

    await act(async () => {
      renderer!.update(story("direct"));
    });

    const directText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");
    expect(directText).not.toContain("Qué estás viendo");
    expect(directText).not.toContain("En palabras simples");
    expect(directText).not.toContain("Primer paso");
    expect(
      renderer!.root.findAllByProps({ accessibilityLabel: "Ver siguiente explicación" })
    ).toHaveLength(0);
  });
});

describe("shared modal design", () => {
  it("closes a mobile sheet after a long or fast downward drag", () => {
    expect(
      shouldDismissMobileSheet({
        distance: 40,
        velocity: 0.2,
        viewportHeight: 844
      })
    ).toBe(false);
    expect(
      shouldDismissMobileSheet({
        distance: 140,
        velocity: 0.2,
        viewportHeight: 844
      })
    ).toBe(true);
    expect(
      shouldDismissMobileSheet({
        distance: 32,
        velocity: 1.1,
        viewportHeight: 844
      })
    ).toBe(true);
  });

  it("uses one header close control and the shared footer actions", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    await act(async () => {
      renderer = create(
        <AppModal
          footer={
            <AppModalActions>
              <AppModalAction
                label="Cancelar"
                onPress={onClose}
                variant="secondary"
              />
              <AppModalAction label="Guardar" onPress={onSave} />
            </AppModalActions>
          }
          onClose={onClose}
          subtitle="Subtítulo"
          title="Título del modal"
          visible
        >
          <Text>Contenido</Text>
        </AppModal>
      );
    });

    expect(renderer!.root.findByProps({ accessibilityLabel: "Cerrar ventana" })).toBeDefined();
    expect(renderer!.root.findByProps({ accessibilityLabel: "Cancelar" })).toBeDefined();
    expect(renderer!.root.findByProps({ accessibilityLabel: "Guardar" })).toBeDefined();

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Cerrar ventana" }).props.onPress();
    });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
