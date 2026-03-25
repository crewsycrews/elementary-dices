<template>
  <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
    <button
      type="button"
      class="rounded px-2 py-1 text-xs font-semibold transition-colors"
      :class="locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
      @click="setLocale('en')"
    >
      EN
    </button>
    <button
      type="button"
      class="rounded px-2 py-1 text-xs font-semibold transition-colors"
      :class="locale === 'ru' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
      @click="setLocale('ru')"
    >
      RU
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";

const { locale, setLocale } = useI18n();
</script>
