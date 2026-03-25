<template>
  <div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">{{ t("shop.title") }}</h1>
    <p class="text-muted-foreground">{{ t("shop.placeholder") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";

const { t } = useI18n();
// Placeholder - will be implemented in Phase 4
</script>
