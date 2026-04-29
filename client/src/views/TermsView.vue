<template>
  <div class="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              {{ content.eyebrow }}
            </p>
            <h1 class="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-slate-950">
              {{ content.title }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {{ content.intro }}
            </p>
          </div>

          <RouterLink
            to="/"
            class="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {{ content.backLabel }}
          </RouterLink>
        </div>

        <div class="mt-8 space-y-6">
          <section
            v-for="section in content.sections"
            :key="section.heading"
            class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
          >
            <h2 class="text-lg font-bold text-slate-950">
              {{ section.heading }}
            </h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
              <p v-for="paragraph in section.paragraphs" :key="paragraph">
                {{ paragraph }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/i18n";

const { t } = useI18n();

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  backLabel: string;
  sections: LegalSection[];
};

const content = computed<LegalContent>(() => ({
  eyebrow: t("legal.terms.eyebrow"),
  title: t("legal.terms.title"),
  intro: t("legal.terms.intro"),
  backLabel: t("legal.back_to_landing"),
  sections: [1, 2, 3, 4, 5, 6, 7].map((section) => ({
    heading: t(`legal.terms.section${section}.heading`),
    paragraphs: [t(`legal.terms.section${section}.p1`), t(`legal.terms.section${section}.p2`)],
  })),
}));
</script>
