import type { Session } from "@supabase/supabase-js";
import { type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  unsubscribe: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: authMocks
  }
}));

import { AuthProvider, useAuth } from "../context/AuthContext";

type AuthValue = ReturnType<typeof useAuth>;
type AuthStateCallback = (event: string, session: Session | null) => void;
type AuthResult = Awaited<ReturnType<AuthValue["signInWithPassword"]>>;

let latestAuth: AuthValue | null = null;
let authStateCallback: AuthStateCallback | null = null;
let renderer: ReactTestRenderer | null = null;

function makeSession(userId = "user-1"): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: `${userId}@example.com`,
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z"
    }
  } as Session;
}

function Probe({ children }: { children?: ReactNode }) {
  latestAuth = useAuth();
  return children ?? null;
}

function getAuth() {
  if (!latestAuth) {
    throw new Error("Auth context was not rendered");
  }

  return latestAuth;
}

async function mountProvider() {
  await act(async () => {
    renderer = create(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await Promise.resolve();
  });
}

function emitAuthState(session: Session | null) {
  if (!authStateCallback) {
    throw new Error("Auth state callback was not registered");
  }

  authStateCallback("SIGNED_IN", session);
}

beforeEach(() => {
  latestAuth = null;
  authStateCallback = null;
  renderer = null;
  Object.values(authMocks).forEach((mock) => mock.mockReset());

  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  authMocks.onAuthStateChange.mockImplementation((callback: AuthStateCallback) => {
    authStateCallback = callback;
    return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
  });
  authMocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
  authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  authMocks.signOut.mockResolvedValue({ error: null });
});

afterEach(async () => {
  if (renderer) {
    await act(async () => {
      renderer?.unmount();
    });
  }
});

describe("AuthProvider", () => {
  it("waits for the stored session before marking authentication as ready", async () => {
    const session = makeSession();
    let resolveSession!: (value: unknown) => void;
    authMocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      })
    );

    await mountProvider();
    expect(getAuth().isAuthReady).toBe(false);
    expect(getAuth().user).toBeNull();

    await act(async () => {
      resolveSession({ data: { session }, error: null });
      await Promise.resolve();
    });

    expect(getAuth().isAuthReady).toBe(true);
    expect(getAuth().session).toBe(session);
    expect(getAuth().user?.id).toBe("user-1");
  });

  it("becomes ready and exposes a session recovery error", async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Stored session is invalid" }
    });

    await mountProvider();

    expect(getAuth().isAuthReady).toBe(true);
    expect(getAuth().authError).toBe("Stored session is invalid");
    expect(getAuth().session).toBeNull();
  });

  it("updates the user from auth events and clears a previous error", async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Temporary error" }
    });
    await mountProvider();

    const session = makeSession("user-2");
    await act(async () => {
      emitAuthState(session);
    });

    expect(getAuth().authError).toBeNull();
    expect(getAuth().user?.id).toBe("user-2");
    expect(getAuth().isAuthReady).toBe(true);
  });

  it("trims the email and returns the session on password sign-in", async () => {
    const session = makeSession();
    authMocks.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    await mountProvider();

    let result!: AuthResult;
    await act(async () => {
      result = await getAuth().signInWithPassword("  user@example.com  ", "secret");
    });

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret"
    });
    expect(result).toEqual({ error: null, session });
    expect(getAuth().authError).toBeNull();
  });

  it("returns and stores password sign-in errors", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" }
    });
    await mountProvider();

    let result!: AuthResult;
    await act(async () => {
      result = await getAuth().signInWithPassword("user@example.com", "bad");
    });

    expect(result).toEqual({ error: "Invalid login credentials" });
    expect(getAuth().authError).toBe("Invalid login credentials");
  });

  it("trims the email when creating an account", async () => {
    const session = makeSession();
    authMocks.signUp.mockResolvedValue({ data: { session }, error: null });
    await mountProvider();

    let result!: AuthResult;
    await act(async () => {
      result = await getAuth().signUpWithPassword("  new@example.com ", "secret");
    });

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret"
    });
    expect(result).toEqual({ error: null, session });
  });

  it("surfaces sign-out failures and unsubscribes on unmount", async () => {
    authMocks.signOut.mockResolvedValue({ error: { message: "Network error" } });
    await mountProvider();

    let result!: AuthResult;
    await act(async () => {
      result = await getAuth().signOut();
    });
    expect(result).toEqual({ error: "Network error" });
    expect(getAuth().authError).toBe("Network error");

    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
