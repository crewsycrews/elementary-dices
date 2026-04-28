import { computed, onScopeDispose, watchEffect, type MaybeRefOrGetter, toValue } from "vue";

type MetaInput = MaybeRefOrGetter<string>;

type SeoMetaOptions = {
  title: MetaInput;
  description: MetaInput;
  image?: MetaInput;
  canonicalPath?: MetaInput;
  keywords?: MetaInput;
};

const DEFAULTS = {
  title: "Elementary Dice",
  description:
    "Elementary Dice is a browser strategy RPG where you collect elementals, equip dice, and push through quick tactical runs.",
  imagePath: "/assets/logo.png",
  keywords:
    "Elementary Dice, browser RPG, strategy game, elemental game, dice battler, tactical RPG",
};

function getSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return getSiteOrigin();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const origin = getSiteOrigin();
  if (!origin) return pathOrUrl;

  return new URL(pathOrUrl, `${origin}/`).toString();
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

function applySeoMeta({
  title,
  description,
  image,
  canonicalPath,
  keywords,
}: {
  title: string;
  description: string;
  image: string;
  canonicalPath?: string;
  keywords?: string;
}) {
  if (typeof document === "undefined") return;

  document.title = title;

  upsertMeta('meta[name="description"]', { name: "description", content: description });
  upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords ?? DEFAULTS.keywords });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  upsertMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
    content: DEFAULTS.title,
  });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
  upsertMeta('meta[property="og:description"]', {
    property: "og:description",
    content: description,
  });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
  upsertMeta('meta[property="og:image:alt"]', {
    property: "og:image:alt",
    content: `${DEFAULTS.title} logo`,
  });
  upsertMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: "summary_large_image",
  });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
  upsertMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: description,
  });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });

  if (canonicalPath) {
    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: toAbsoluteUrl(canonicalPath),
    });
  }
}

export function useSeoMeta(options: SeoMetaOptions) {
  const resolvedImage = computed(() =>
    toAbsoluteUrl(toValue(options.image) || DEFAULTS.imagePath),
  );

  const stop = watchEffect(() => {
    applySeoMeta({
      title: toValue(options.title) || DEFAULTS.title,
      description: toValue(options.description) || DEFAULTS.description,
      image: resolvedImage.value,
      canonicalPath: toValue(options.canonicalPath),
      keywords: toValue(options.keywords),
    });
  });

  onScopeDispose(() => {
    stop();
    applySeoMeta({
      title: DEFAULTS.title,
      description: DEFAULTS.description,
      image: toAbsoluteUrl(DEFAULTS.imagePath),
      canonicalPath: "/",
      keywords: DEFAULTS.keywords,
    });
  });
}
