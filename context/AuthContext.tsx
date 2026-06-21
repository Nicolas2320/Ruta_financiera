import type { Session, User } from "@supabase/supabase-js";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthResult = {
  error: string | null;
  session?: Session | null;
};

type AuthContextValue = {
  authError: string | null;
  isAuthReady: boolean;
  isSupabaseConfigured: boolean;
  session: Session | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!supabase);
  const [authError, setAuthError] = useState<string | null>(
    supabase ? null : "Supabase no esta configurado."
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session);
      setIsAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      isAuthReady,
      isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      signInWithPassword: async (email: string, password: string) => {
        if (!supabase) {
          return { error: "Configura Supabase antes de iniciar sesion." };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          setAuthError(error.message);
          return { error: error.message };
        }

        setAuthError(null);
        return { error: null, session: data.session };
      },
      signOut: async () => {
        if (!supabase) {
          return { error: "Configura Supabase antes de cerrar sesion." };
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          setAuthError(error.message);
          return { error: error.message };
        }

        setAuthError(null);
        return { error: null };
      },
      signUpWithPassword: async (email: string, password: string) => {
        if (!supabase) {
          return { error: "Configura Supabase antes de crear usuarios." };
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });

        if (error) {
          setAuthError(error.message);
          return { error: error.message };
        }

        setAuthError(null);
        return { error: null, session: data.session };
      }
    }),
    [authError, isAuthReady, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
