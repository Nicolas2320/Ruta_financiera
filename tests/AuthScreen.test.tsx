import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn()
}));

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ mode: "sign-up", returnTo: "/dashboard" }),
  useRouter: () => ({ back: vi.fn(), replace: mocks.replace })
}));

vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));

vi.mock("lucide-react-native", () => ({
  KeyRound: "KeyRound",
  LogIn: "LogIn",
  Mail: "Mail",
  Route: "Route",
  ShieldCheck: "ShieldCheck",
  UserPlus: "UserPlus"
}));

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "Text",
  TextInput: "TextInput",
  View: "View"
}));

vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "PrimaryButton" }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    authError: null,
    isAuthReady: true,
    isSupabaseConfigured: true,
    session: null,
    signInWithPassword: mocks.signIn,
    signUpWithPassword: mocks.signUp
  })
}));

vi.mock("../hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({ screenPadding: 16 })
}));

import AuthScreen from "../app/auth";

let renderer: ReactTestRenderer | null = null;

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.signIn.mockReset();
  mocks.signUp.mockReset();
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer?.unmount());
    renderer = null;
  }
});

async function completeCredentials() {
  const inputs = renderer!.root.findAll((node) => String(node.type) === "TextInput");

  await act(async () => {
    inputs[0].props.onChangeText("persona@ejemplo.com");
    inputs[1].props.onChangeText("secreto");
  });
}

function getCreateAccountButton() {
  return renderer!.root
    .findAll((node) => String(node.type) === "PrimaryButton")
    .find((button) => button.props.accessibilityLabel === "Crear una cuenta")!;
}

describe("AuthScreen registration navigation", () => {
  it("ignores a second submission while registration is pending", async () => {
    let resolveRegistration!: (value: { error: null; session: object }) => void;
    mocks.signUp.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve;
      })
    );

    await act(async () => {
      renderer = create(<AuthScreen />);
    });
    await completeCredentials();

    const submit = getCreateAccountButton().props.onPress;
    let firstSubmission!: Promise<void>;
    await act(async () => {
      firstSubmission = submit();
      void submit();
    });

    expect(mocks.signUp).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRegistration({ error: null, session: {} });
      await firstSubmission;
    });

    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("does not redirect when registration finishes after leaving the screen", async () => {
    let resolveRegistration!: (value: { error: null; session: object }) => void;
    mocks.signUp.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve;
      })
    );

    await act(async () => {
      renderer = create(<AuthScreen />);
    });
    await completeCredentials();

    let submission!: Promise<void>;
    await act(async () => {
      submission = getCreateAccountButton().props.onPress();
    });
    await act(async () => {
      renderer?.unmount();
      renderer = null;
    });
    await act(async () => {
      resolveRegistration({ error: null, session: {} });
      await submission;
    });

    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
