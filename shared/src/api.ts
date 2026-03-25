/**
 * Type-safe API definitions for Eden client usage
 * This module exports the server API type for consumption by the Excalibur client
 */
import { edenTreaty } from "@elysiajs/eden";
import type { App } from "@elementary-dices/server";

type ViteEnv = {
  VITE_API_BASE_URL?: string;
};

const viteEnv = (import.meta as ImportMeta & { env?: ViteEnv }).env;
type BrowserLikeGlobal = typeof globalThis & {
  location?: { origin?: string };
};
const runtimeGlobal = globalThis as BrowserLikeGlobal;

function resolveRuntimeLocale(): string {
  const browserGlobal = runtimeGlobal as BrowserLikeGlobal & {
    localStorage?: { getItem: (key: string) => string | null };
    navigator?: { language?: string };
  };

  const fromStorage =
    browserGlobal.localStorage?.getItem("elementary-dices.locale") ?? null;
  if (fromStorage) return fromStorage;
  if (browserGlobal.navigator?.language) return browserGlobal.navigator.language;
  return "en";
}

const apiBaseUrl =
  viteEnv?.VITE_API_BASE_URL ??
  runtimeGlobal.location?.origin ??
  "http://localhost:3000";

/**
 * The API type that will be used by Eden for type-safe client generation
 */
export const api = edenTreaty<App>(apiBaseUrl, {
  $fetch: {
    credentials: "include",
    headers: {
      "x-locale": resolveRuntimeLocale(),
    },
  },
});
