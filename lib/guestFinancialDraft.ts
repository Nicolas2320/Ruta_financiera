import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeOnboardingData } from "./financialProfile";
import type { ExactFinancialValues, OnboardingData } from "../types/financial";
import { normalizeExactValues } from "../utils/financialRanges";

const GUEST_FINANCIAL_DRAFT_KEY = "ruta-financiera:guest-financial-draft:v1";
const GUEST_FINANCIAL_DRAFT_VERSION = 1;

export type GuestFinancialDraft = {
  exactValues: ExactFinancialValues;
  onboarding: OnboardingData;
  updatedAt: string;
  version: typeof GUEST_FINANCIAL_DRAFT_VERSION;
};

function getWebStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

async function getStoredDraft() {
  const webStorage = getWebStorage();
  return webStorage
    ? webStorage.getItem(GUEST_FINANCIAL_DRAFT_KEY)
    : AsyncStorage.getItem(GUEST_FINANCIAL_DRAFT_KEY);
}

async function setStoredDraft(value: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(GUEST_FINANCIAL_DRAFT_KEY, value);
    return;
  }

  await AsyncStorage.setItem(GUEST_FINANCIAL_DRAFT_KEY, value);
}

async function removeStoredDraft() {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(GUEST_FINANCIAL_DRAFT_KEY);
    return;
  }

  await AsyncStorage.removeItem(GUEST_FINANCIAL_DRAFT_KEY);
}

function normalizeGuestFinancialDraft(value: unknown): GuestFinancialDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const draft = value as Partial<GuestFinancialDraft>;

  if (draft.version !== GUEST_FINANCIAL_DRAFT_VERSION || !draft.onboarding) {
    return null;
  }

  return {
    exactValues: normalizeExactValues(draft.exactValues),
    onboarding: normalizeOnboardingData(draft.onboarding),
    updatedAt:
      typeof draft.updatedAt === "string" ? draft.updatedAt : new Date(0).toISOString(),
    version: GUEST_FINANCIAL_DRAFT_VERSION
  };
}

export async function loadGuestFinancialDraft(): Promise<GuestFinancialDraft | null> {
  const serializedDraft = await getStoredDraft();

  if (!serializedDraft) {
    return null;
  }

  try {
    return normalizeGuestFinancialDraft(JSON.parse(serializedDraft));
  } catch {
    return null;
  }
}

export async function saveGuestFinancialDraft(
  onboarding: OnboardingData,
  exactValues: ExactFinancialValues
) {
  const draft: GuestFinancialDraft = {
    exactValues: normalizeExactValues(exactValues),
    onboarding: normalizeOnboardingData(onboarding),
    updatedAt: new Date().toISOString(),
    version: GUEST_FINANCIAL_DRAFT_VERSION
  };

  await setStoredDraft(JSON.stringify(draft));
}

export async function clearGuestFinancialDraft() {
  await removeStoredDraft();
}
