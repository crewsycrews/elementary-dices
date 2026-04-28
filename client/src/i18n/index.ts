import { computed, ref } from "vue";

import type { Locale } from "./locales";
import { messages } from "./messages";

export { SUPPORTED_LOCALES } from "./locales";
export type { Locale } from "./locales";

const STORAGE_KEY = "elementary-dices.locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const locale = ref<Locale>("en");

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("en")) return "en";
  return null;
}

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("locale="));
  if (!cookie) return null;
  const value = decodeURIComponent(cookie.slice("locale=".length));
  return normalizeLocale(value);
}

function persistLocale(value: Locale) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, value);
  }
  if (typeof document !== "undefined") {
    document.cookie = `locale=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  }
}

export function initializeLocale() {
  const fromStorage =
    typeof window !== "undefined"
      ? normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
      : null;
  const fromCookie = readLocaleCookie();
  const fromBrowser =
    typeof navigator !== "undefined"
      ? normalizeLocale(navigator.language)
      : null;

  locale.value = fromStorage ?? fromCookie ?? fromBrowser ?? "en";
  persistLocale(locale.value);
}

export function setLocale(nextLocale: Locale) {
  locale.value = nextLocale;
  persistLocale(nextLocale);
}

export function useI18n() {
  const t = (key: string, params?: Record<string, string | number>) => {
    const template = messages[locale.value][key] ?? messages.en[key];
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
      String(params[token] ?? `{${token}}`),
    );
  };

  return {
    locale: computed(() => locale.value),
    t,
    setLocale,
  };
}
