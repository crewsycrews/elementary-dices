<template>
  <nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
    <RouterLink class="transition-colors hover:text-foreground" to="/terms">
      {{ t("legal.terms_link") }}
    </RouterLink>
    <span class="text-border">•</span>
    <RouterLink class="transition-colors hover:text-foreground" to="/privacy">
      {{ t("legal.privacy_link") }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>
