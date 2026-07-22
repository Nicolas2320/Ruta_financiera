import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

import { AuthProvider, useAuth } from "../context/AuthContext";

type AuthValue = ReturnType<typeof useAuth>;

let latestAuth: AuthValue | null = null;
let renderer: ReactTestRenderer | null = null;

function Probe() {
  latestAuth = useAuth();
  return null;
}

function getAuth() {
  if (!latestAuth) {
    throw new Error("Auth context was not rendered");
  }

  return latestAuth;
}

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer?.unmount());
  }
  renderer = null;
  latestAuth = null;
});

describe("AuthProvider without Supabase configuration", () => {
  it("is immediately ready and returns safe configuration errors", async () => {
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    expect(getAuth()).toMatchObject({
      isAuthReady: true,
      isSupabaseConfigured: false,
      session: null,
      user: null,
      authError: "Supabase no esta configurado."
    });

    await expect(getAuth().signInWithPassword("user@example.com", "secret")).resolves.toEqual({
      error: "Configura Supabase antes de iniciar sesion."
    });
    await expect(getAuth().signUpWithPassword("user@example.com", "secret")).resolves.toEqual({
      error: "Configura Supabase antes de crear usuarios."
    });
    await expect(getAuth().signOut()).resolves.toEqual({
      error: "Configura Supabase antes de cerrar sesion."
    });
  });
});
