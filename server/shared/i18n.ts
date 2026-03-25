export const SUPPORTED_LOCALES = ["en", "ru"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

type TranslationKey =
  | "event.option.pvp_requires_party"
  | "event.error.active_event_exists"
  | "event.error.unavailable_event_type"
  | "event.error.unknown_event_type"
  | "event.description.wild.capture_flow"
  | "event.description.wild.battle_flow"
  | "event.description.pvp.challenge"
  | "event.description.merchant"
  | "event.result.capture.success"
  | "event.result.capture.failed"
  | "event.result.capture.failed_escape"
  | "event.result.capture.continues"
  | "event.result.skip_wild"
  | "event.result.leave_merchant"
  | "start_game.welcome"
  | "evolution.no_recipe"
  | "evolution.success";

const messages: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "event.option.pvp_requires_party": "PvP battle requires 5 active party elementals",
    "event.error.active_event_exists":
      "Player already has an active event. Resolve it before triggering a new one.",
    "event.error.unavailable_event_type": "Selected event type is unavailable",
    "event.error.unknown_event_type": "Unknown event type",
    "event.description.wild.capture_flow":
      "A wild {name} appeared! Use the Farkle capture flow and optional items to attempt capture.",
    "event.description.wild.battle_flow":
      "A wild {name} appeared! Roll, deploy, and defeat it in battle to capture.",
    "event.description.pvp.challenge":
      "You've been challenged by {opponentName} to a battle! Win to earn {reward} currency.",
    "event.description.merchant":
      "A traveling merchant has appeared! Browse their wares and make a purchase.",
    "event.result.capture.success":
      "Successfully captured {name}! It has been added to your collection.",
    "event.result.capture.failed":
      "Failed to capture {name}. The elemental overpowered your party.",
    "event.result.capture.failed_escape": "Failed to capture {name}. The elemental escaped!",
    "event.result.capture.continues": "Battle continues. Roll again to deploy elementals.",
    "event.result.skip_wild":
      "You decided to skip the encounter with {name}. The elemental wandered away.",
    "event.result.leave_merchant": "You left the merchant and continue your journey.",
    "start_game.welcome":
      "Welcome to Elementary Dices! You rolled {element} and received {name}!",
    "evolution.no_recipe":
      "No evolution recipe found for these elementals. Try different combinations!",
    "evolution.success": "Successfully evolved into {name}!",
  },
  ru: {
    "event.option.pvp_requires_party":
      "Для PvP-битвы нужно 5 активных элементалей в группе",
    "event.error.active_event_exists":
      "У игрока уже есть активное событие. Завершите его перед запуском нового.",
    "event.error.unavailable_event_type": "Выбранный тип события сейчас недоступен",
    "event.error.unknown_event_type": "Неизвестный тип события",
    "event.description.wild.capture_flow":
      "Появился дикий {name}! Используйте механику захвата Farkle и предметы, чтобы попытаться его поймать.",
    "event.description.wild.battle_flow":
      "Появился дикий {name}! Бросайте кости, выставляйте элементалей и победите его в бою, чтобы поймать.",
    "event.description.pvp.challenge":
      "{opponentName} бросает вам вызов на битву! Победите и получите {reward} валюты.",
    "event.description.merchant":
      "Появился странствующий торговец! Изучите его товары и сделайте покупку.",
    "event.result.capture.success":
      "Вы успешно поймали {name}! Он добавлен в вашу коллекцию.",
    "event.result.capture.failed":
      "Не удалось поймать {name}. Элементаль оказался сильнее вашей группы.",
    "event.result.capture.failed_escape":
      "Не удалось поймать {name}. Элементаль сбежал.",
    "event.result.capture.continues":
      "Битва продолжается. Бросьте кости снова, чтобы выставить элементалей.",
    "event.result.skip_wild":
      "Вы решили пропустить встречу с {name}. Элементаль ушел.",
    "event.result.leave_merchant": "Вы покинули торговца и продолжили путь.",
    "start_game.welcome":
      "Добро пожаловать в Elementary Dices! Вы выбросили {element} и получили {name}!",
    "evolution.no_recipe":
      "Для этих элементалей не найден рецепт эволюции. Попробуйте другую комбинацию!",
    "evolution.success": "Эволюция прошла успешно: {name}!",
  },
};

function normalizeLocale(value: string | undefined): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("en")) return "en";
  return null;
}

function parseCookieLocale(cookieHeader: string | undefined): Locale | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part.startsWith("locale=")) continue;
    const value = decodeURIComponent(part.slice("locale=".length));
    return normalizeLocale(value);
  }
  return null;
}

export function resolveLocale(headers: Record<string, string | undefined>): Locale {
  const explicitLocale = normalizeLocale(headers["x-locale"]);
  if (explicitLocale) return explicitLocale;

  const cookieLocale = parseCookieLocale(headers.cookie);
  if (cookieLocale) return cookieLocale;

  const acceptLanguage = headers["accept-language"];
  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(",")
      .map((entry) => entry.trim().split(";")[0])
      .filter(Boolean);
    for (const candidate of candidates) {
      const locale = normalizeLocale(candidate);
      if (locale) return locale;
    }
  }

  return "en";
}

export function t(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = messages[locale][key] ?? messages.en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(params[token] ?? `{${token}}`),
  );
}
