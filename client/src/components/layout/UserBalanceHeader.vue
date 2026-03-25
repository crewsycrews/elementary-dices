<template>
  <div class="absolute top-4 right-4 flex items-center gap-4 text-sm">
    <LocaleSwitcher v-if="showLocaleSwitcher" />
    <div class="flex items-center gap-2">
      <span class="text-2xl">💰</span>
      <span class="font-bold">{{ userStore.currency }}</span>
    </div>
    <div class="text-muted-foreground">{{ userStore.username }}</div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher.vue";

withDefaults(
  defineProps<{
    showLocaleSwitcher?: boolean;
  }>(),
  {
    showLocaleSwitcher: true,
  },
);

const userStore = useUserStore();
</script>
