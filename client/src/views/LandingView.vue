<template>
  <div class="landing-view relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.2),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(96,165,250,0.22),_transparent_28%),linear-gradient(160deg,_rgba(15,23,42,1)_0%,_rgba(30,41,59,1)_48%,_rgba(12,18,30,1)_100%)]"></div>
    <div class="absolute inset-0 opacity-30">
      <div class="absolute left-[10%] top-[18%] h-24 w-24 rounded-full border border-amber-300/20"></div>
      <div class="absolute right-[12%] top-[14%] h-40 w-40 rounded-full border border-sky-300/20"></div>
      <div class="absolute bottom-[16%] left-[14%] h-32 w-32 rotate-12 rounded-3xl border border-white/10"></div>
      <div class="absolute bottom-[10%] right-[18%] h-20 w-20 rounded-2xl border border-amber-200/20"></div>
    </div>

    <div class="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">
              {{ t("landing.eyebrow") }}
            </p>
            <h1 class="mt-2 text-2xl font-black tracking-[0.08em] text-white sm:text-3xl">
              {{ t("landing.title") }}
            </h1>
          </div>
        </div>
        <LocaleSwitcher />
      </header>

      <main class="flex flex-1 items-center py-12">
        <div class="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section class="space-y-8">
            <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm">
              <span class="text-amber-300">🎲</span>
              <span>{{ t("landing.badge") }}</span>
            </div>

            <div class="max-w-3xl space-y-5">
              <h2 class="text-4xl font-black uppercase leading-none tracking-[0.06em] text-white sm:text-5xl lg:text-6xl">
                {{ t("landing.hero") }}
              </h2>
              <p class="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                {{ t("landing.description") }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <RouterLink
                to="/login"
                class="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-300"
              >
                {{ t("landing.cta_login") }}
              </RouterLink>
              <RouterLink
                to="/login?mode=register"
                class="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/8 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/14"
              >
                {{ t("landing.cta_register") }}
              </RouterLink>
            </div>

            <div class="grid gap-4 pt-2 sm:grid-cols-3">
              <article
                v-for="feature in featureKeys"
                :key="feature"
                class="rounded-3xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm"
              >
                <p class="text-2xl">{{ t(`landing.feature_${feature}_icon`) }}</p>
                <h3 class="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                  {{ t(`landing.feature_${feature}_title`) }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-300">
                  {{ t(`landing.feature_${feature}_body`) }}
                </p>
              </article>
            </div>
          </section>

          <section class="mx-auto w-full max-w-md space-y-5">
            <div class="rounded-[2rem] border border-white/12 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-md sm:p-8">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
                    {{ t("landing.panel_eyebrow") }}
                  </p>
                  <h3 class="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                    {{ t("landing.panel_title") }}
                  </h3>
                </div>
                <img
                  :src="logoImage"
                  :alt="t('landing.logo_alt')"
                  class="h-14 w-14 rounded-2xl border border-white/10 bg-slate-900/80 object-cover p-1 shadow-lg shadow-slate-950/40"
                />
              </div>

              <div class="mt-6 space-y-4">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {{ t("landing.panel_step_1_label") }}
                  </p>
                  <p class="mt-2 text-sm leading-6 text-slate-200">
                    {{ t("landing.panel_step_1_body") }}
                  </p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {{ t("landing.panel_step_2_label") }}
                  </p>
                  <p class="mt-2 text-sm leading-6 text-slate-200">
                    {{ t("landing.panel_step_2_body") }}
                  </p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {{ t("landing.panel_step_3_label") }}
                  </p>
                  <p class="mt-2 text-sm leading-6 text-slate-200">
                    {{ t("landing.panel_step_3_body") }}
                  </p>
                </div>
              </div>

              <div class="mt-6 rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                  {{ t("landing.quote_label") }}
                </p>
                <p class="mt-3 text-sm leading-6 text-slate-100">
                  {{ t("landing.quote_body") }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer class="pt-6">
        <PublicLegalLinks />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher.vue";
import PublicLegalLinks from "@/components/layout/PublicLegalLinks.vue";
import { useI18n } from "@/i18n";
import { useSeoMeta } from "@/composables/useSeoMeta";
import logoImage from "../../assets/logo.png";

const { t } = useI18n();
const featureKeys = ["collect", "combine", "challenge"] as const;

useSeoMeta({
  title: () => t("landing.seo_title"),
  description: () => t("landing.seo_description"),
  canonicalPath: "/",
  image: logoImage,
  keywords: () => t("landing.seo_keywords"),
});
</script>
