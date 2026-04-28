<template>
  <div
    v-if="userStore.isAuthenticated"
    class="absolute right-4 top-4 flex items-center gap-4 text-sm"
  >
    <LocaleSwitcher v-if="showLocaleSwitcher" />
    <div class="flex items-center gap-2">
      <span class="text-2xl">💰</span>
      <span class="font-bold">{{ userStore.currency }}</span>
    </div>
    <div class="text-muted-foreground">{{ userStore.username }}</div>
    <button
      type="button"
      @click="handleLogout"
      class="rounded-md border px-3 py-1 transition-colors hover:bg-secondary"
    >
      {{ t("header.logout") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";
import { useI18n } from "@/i18n";
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
const router = useRouter();
const { t } = useI18n();

async function handleLogout() {
  await userStore.logout();
  await router.push({ name: "Login" });
}
</script>
