import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useAuth } from "./AuthContext";
import { useFinancialProfile } from "./FinancialProfileContext";
import {
  clearGuestFinancialDraft,
  loadGuestFinancialDraft,
  saveGuestFinancialDraft,
  type GuestFinancialDraft
} from "../lib/guestFinancialDraft";
import {
  saveFinancialProfileDraft,
  saveExactValues as persistExactValues,
  saveOnboardingData
} from "../lib/financialProfile";
import {
  hasCompletedOnboarding as getHasCompletedOnboarding,
  initialOnboarding,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import { normalizeExactValues } from "../utils/financialRanges";

type OnboardingContextValue = {
  exactValues: ExactFinancialValues;
  financialProfileExists: boolean;
  hasCompletedOnboarding: boolean;
  onboarding: OnboardingData;
  onboardingSyncError: string | null;
  onboardingSyncStatus:
    | "idle"
    | "loading"
    | "migrating"
    | "saving"
    | "saved"
    | "error"
    | "not-configured";
  resetFinancialData: () => Promise<boolean>;
  saveExactValues: (values: ExactFinancialValues) => Promise<boolean>;
  saveOnboardingAndExactValues: (
    data: Partial<OnboardingData>,
    values: ExactFinancialValues
  ) => Promise<boolean>;
  updateOnboarding: (data: Partial<OnboardingData>) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function getEmptyOnboarding(): OnboardingData {
  return {
    ...initialOnboarding,
    expenseCategories: [],
    expenseCategoryAmounts: {},
    smallExpenseCategories: [],
    goals: []
  };
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { isAuthReady, isSupabaseConfigured, user } = useAuth();
  const {
    financialProfile,
    financialProfileLoadError,
    financialProfileLoadStatus,
    financialProfileUserId
  } = useFinancialProfile();
  const [onboarding, setOnboarding] = useState<OnboardingData>(getEmptyOnboarding);
  const [exactValues, setExactValues] = useState<ExactFinancialValues>({});
  const [financialProfileExists, setFinancialProfileExists] = useState(false);
  const [onboardingSyncStatus, setOnboardingSyncStatus] =
    useState<OnboardingContextValue["onboardingSyncStatus"]>("idle");
  const [onboardingSyncError, setOnboardingSyncError] = useState<string | null>(null);
  const guestSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const authenticatedSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const authenticatedSaveRevisionRef = useRef(0);
  const migrationRef = useRef<{
    promise: Promise<GuestFinancialDraft | null>;
    userId: string;
  } | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthReady || user) {
      return;
    }

    let isMounted = true;
    migrationRef.current = null;
    setFinancialProfileExists(false);
    setOnboardingSyncStatus("loading");
    setOnboardingSyncError(null);

    loadGuestFinancialDraft()
      .then((draft) => {
        if (!isMounted) {
          return;
        }

        setOnboarding(draft?.onboarding ?? getEmptyOnboarding());
        setExactValues(draft?.exactValues ?? {});
        setOnboardingSyncStatus("saved");
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        setOnboarding(getEmptyOnboarding());
        setExactValues({});
        setOnboardingSyncStatus("error");
        setOnboardingSyncError(
          error.message || "No pudimos recuperar el diagnóstico guardado en este dispositivo."
        );
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, userId]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      return;
    }

    if (!isSupabaseConfigured || financialProfileLoadStatus === "not-configured") {
      setFinancialProfileExists(false);
      setOnboardingSyncStatus("not-configured");
      setOnboardingSyncError(null);
      return;
    }

    if (
      financialProfileLoadStatus === "loading" ||
      financialProfileLoadStatus === "idle" ||
      financialProfileUserId !== user.id
    ) {
      setOnboardingSyncStatus("loading");
      setOnboardingSyncError(null);
      return;
    }

    if (financialProfileLoadStatus === "error") {
      setOnboardingSyncStatus("error");
      setOnboardingSyncError(
        financialProfileLoadError ?? "No pudimos recuperar tus datos financieros."
      );
      return;
    }

    if (financialProfileLoadStatus === "ready") {
      if (financialProfile.profileExists) {
        migrationRef.current = null;
        setOnboarding(financialProfile.onboarding);
        setExactValues(financialProfile.exactValues);
        setFinancialProfileExists(true);
        setOnboardingSyncStatus("saved");
        setOnboardingSyncError(null);
        void clearGuestFinancialDraft().catch(() => undefined);
        return;
      }

      let isMounted = true;
      setOnboardingSyncStatus("migrating");
      setOnboardingSyncError(null);

      if (migrationRef.current?.userId !== user.id) {
        const migrationPromise = guestSaveQueueRef.current
          .catch(() => undefined)
          .then(() => loadGuestFinancialDraft())
          .then(async (draft) => {
            if (!draft) {
              return null;
            }

            await saveFinancialProfileDraft(user.id, draft.onboarding, draft.exactValues);
            await clearGuestFinancialDraft();
            return draft;
          });

        migrationRef.current = {
          promise: migrationPromise,
          userId: user.id
        };
      }

      migrationRef.current.promise
        .then((draft) => {
          if (!isMounted) {
            return;
          }

          setOnboarding(draft?.onboarding ?? getEmptyOnboarding());
          setExactValues(draft?.exactValues ?? {});
          setFinancialProfileExists(Boolean(draft));
          setOnboardingSyncStatus("saved");
          setOnboardingSyncError(null);
        })
        .catch((error: Error) => {
          if (!isMounted) {
            return;
          }

          setOnboardingSyncStatus("error");
          setOnboardingSyncError(
            error.message || "No pudimos guardar tu diagnóstico en la nueva cuenta."
          );
        });

      return () => {
        isMounted = false;
      };
    }
  }, [
    financialProfile,
    financialProfileLoadError,
    financialProfileLoadStatus,
    financialProfileUserId,
    isAuthReady,
    isSupabaseConfigured,
    userId
  ]);

  const updateOnboarding = useCallback(
    (data: Partial<OnboardingData>) => {
      setOnboarding((current) => {
        const next = {
          ...current,
          ...data
        };

        if (!user) {
          setOnboardingSyncStatus("saving");
          setOnboardingSyncError(null);
          guestSaveQueueRef.current = guestSaveQueueRef.current
            .catch(() => undefined)
            .then(() => saveGuestFinancialDraft(next, exactValues));
          guestSaveQueueRef.current
            .then(() => {
              setOnboardingSyncStatus("saved");
            })
            .catch((error: Error) => {
              setOnboardingSyncStatus("error");
              setOnboardingSyncError(error.message);
            });
          return next;
        }

        if (!isSupabaseConfigured) {
          setOnboardingSyncStatus("not-configured");
          return next;
        }

        setOnboardingSyncStatus("saving");
        setOnboardingSyncError(null);

        const saveRevision = authenticatedSaveRevisionRef.current + 1;
        authenticatedSaveRevisionRef.current = saveRevision;
        authenticatedSaveQueueRef.current = authenticatedSaveQueueRef.current
          .catch(() => undefined)
          .then(() => saveOnboardingData(user.id, next));

        authenticatedSaveQueueRef.current
          .then(() => {
            if (authenticatedSaveRevisionRef.current !== saveRevision) {
              return;
            }

            setFinancialProfileExists(true);
            setOnboardingSyncStatus("saved");
          })
          .catch((error: Error) => {
            if (authenticatedSaveRevisionRef.current !== saveRevision) {
              return;
            }

            setOnboardingSyncStatus("error");
            setOnboardingSyncError(error.message);
          });

        return next;
      });
    },
    [exactValues, isSupabaseConfigured, user]
  );

  const saveExactValues = useCallback(
    async (values: ExactFinancialValues) => {
      const nextValues = normalizeExactValues(values);

      if (!user) {
        setExactValues(nextValues);
        setOnboardingSyncStatus("saving");
        setOnboardingSyncError(null);

        try {
          guestSaveQueueRef.current = guestSaveQueueRef.current
            .catch(() => undefined)
            .then(() => saveGuestFinancialDraft(onboarding, nextValues));
          await guestSaveQueueRef.current;
          setOnboardingSyncStatus("saved");
          return true;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "No pudimos guardar los datos en este dispositivo.";
          setOnboardingSyncStatus("error");
          setOnboardingSyncError(message);
          return false;
        }
      }

      if (!isSupabaseConfigured) {
        setExactValues(nextValues);
        setOnboardingSyncStatus("not-configured");
        return true;
      }

      setOnboardingSyncStatus("saving");
      setOnboardingSyncError(null);
      const saveRevision = authenticatedSaveRevisionRef.current + 1;
      authenticatedSaveRevisionRef.current = saveRevision;

      try {
        authenticatedSaveQueueRef.current = authenticatedSaveQueueRef.current
          .catch(() => undefined)
          .then(() => persistExactValues(user.id, nextValues));
        await authenticatedSaveQueueRef.current;
        setExactValues(nextValues);
        setFinancialProfileExists(true);
        if (authenticatedSaveRevisionRef.current === saveRevision) {
          setOnboardingSyncStatus("saved");
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "No pudimos guardar los datos.";
        if (authenticatedSaveRevisionRef.current === saveRevision) {
          setOnboardingSyncStatus("error");
          setOnboardingSyncError(message);
        }
        return false;
      }
    },
    [isSupabaseConfigured, onboarding, user]
  );

  const saveOnboardingAndExactValues = useCallback(
    async (data: Partial<OnboardingData>, values: ExactFinancialValues) => {
      const nextOnboarding = {
        ...onboarding,
        ...data
      };
      const nextExactValues = normalizeExactValues(values);

      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setOnboardingSyncError(null);

      if (!user) {
        setOnboardingSyncStatus("saving");

        try {
          guestSaveQueueRef.current = guestSaveQueueRef.current
            .catch(() => undefined)
            .then(() => saveGuestFinancialDraft(nextOnboarding, nextExactValues));
          await guestSaveQueueRef.current;
          setOnboardingSyncStatus("saved");
          return true;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "No pudimos guardar los datos en este dispositivo.";
          setOnboardingSyncStatus("error");
          setOnboardingSyncError(message);
          return false;
        }
      }

      if (!isSupabaseConfigured) {
        setOnboardingSyncStatus("not-configured");
        return true;
      }

      setOnboardingSyncStatus("saving");
      const saveRevision = authenticatedSaveRevisionRef.current + 1;
      authenticatedSaveRevisionRef.current = saveRevision;

      try {
        authenticatedSaveQueueRef.current = authenticatedSaveQueueRef.current
          .catch(() => undefined)
          .then(() =>
            saveFinancialProfileDraft(user.id, nextOnboarding, nextExactValues)
          );
        await authenticatedSaveQueueRef.current;
        setFinancialProfileExists(true);
        if (authenticatedSaveRevisionRef.current === saveRevision) {
          setOnboardingSyncStatus("saved");
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No pudimos guardar los datos.";
        if (authenticatedSaveRevisionRef.current === saveRevision) {
          setOnboardingSyncStatus("error");
          setOnboardingSyncError(message);
        }
        return false;
      }
    },
    [isSupabaseConfigured, onboarding, user]
  );

  const resetFinancialData = useCallback(async () => {
    const nextOnboarding = getEmptyOnboarding();
    const nextExactValues: ExactFinancialValues = {};

    if (!user) {
      setOnboardingSyncStatus("saving");

      try {
        await guestSaveQueueRef.current.catch(() => undefined);
        await clearGuestFinancialDraft();
        setOnboarding(nextOnboarding);
        setExactValues(nextExactValues);
        setFinancialProfileExists(false);
        setOnboardingSyncStatus("saved");
        setOnboardingSyncError(null);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No pudimos borrar el diagnóstico local.";
        setOnboardingSyncStatus("error");
        setOnboardingSyncError(message);
        return false;
      }
    }

    if (!isSupabaseConfigured) {
      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setFinancialProfileExists(false);
      setOnboardingSyncStatus("not-configured");
      setOnboardingSyncError(null);
      return true;
    }

    setOnboardingSyncStatus("saving");
    setOnboardingSyncError(null);
    const saveRevision = authenticatedSaveRevisionRef.current + 1;
    authenticatedSaveRevisionRef.current = saveRevision;

    try {
      authenticatedSaveQueueRef.current = authenticatedSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await saveOnboardingData(user.id, nextOnboarding);
          await persistExactValues(user.id, nextExactValues);
        });
      await authenticatedSaveQueueRef.current;
      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setFinancialProfileExists(true);
      if (authenticatedSaveRevisionRef.current === saveRevision) {
        setOnboardingSyncStatus("saved");
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos borrar los datos.";
      if (authenticatedSaveRevisionRef.current === saveRevision) {
        setOnboardingSyncStatus("error");
        setOnboardingSyncError(message);
      }
      return false;
    }
  }, [isSupabaseConfigured, user]);

  const isLoadedForCurrentUser = userId
    ? financialProfileLoadStatus === "ready" && financialProfileUserId === userId
    : financialProfileUserId === null;
  const effectiveOnboardingSyncStatus =
    userId && !isLoadedForCurrentUser
      ? financialProfileLoadStatus === "error"
        ? "error"
        : financialProfileLoadStatus === "not-configured"
          ? "not-configured"
          : "loading"
      : onboardingSyncStatus;
  const effectiveOnboardingSyncError =
    userId && financialProfileLoadStatus === "error"
      ? financialProfileLoadError
      : onboardingSyncError;

  const value = useMemo(
    () => ({
      exactValues,
      financialProfileExists: isLoadedForCurrentUser && financialProfileExists,
      hasCompletedOnboarding:
        getHasCompletedOnboarding(onboarding) &&
        (!userId || (isLoadedForCurrentUser && financialProfileExists)),
      onboarding,
      onboardingSyncError: effectiveOnboardingSyncError,
      onboardingSyncStatus: effectiveOnboardingSyncStatus,
      resetFinancialData,
      saveExactValues,
      saveOnboardingAndExactValues,
      updateOnboarding
    }),
    [
      exactValues,
      effectiveOnboardingSyncStatus,
      effectiveOnboardingSyncError,
      financialProfileExists,
      isLoadedForCurrentUser,
      onboarding,
      resetFinancialData,
      saveExactValues,
      saveOnboardingAndExactValues,
      updateOnboarding
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
