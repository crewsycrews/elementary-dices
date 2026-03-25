<template>
  <header class="border-b bg-card">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-bold">🎮 Elementary Dices</h1>
      </div>

      <div v-if="userStore.isAuthenticated" class="flex items-center space-x-4">
        <!-- Currency Display -->
        <div class="flex items-center space-x-2 px-3 py-1 bg-secondary rounded-md">
          <span class="text-sm font-medium">💰</span>
          <span class="font-bold">{{ userStore.currency }}</span>
        </div>

        <!-- Username -->
        <div class="text-sm">
          <span class="text-muted-foreground">{{ t("header.player") }}</span>
          <span class="font-medium ml-1">{{ userStore.username }}</span>
        </div>

        <!-- Logout Button (placeholder) -->
        <button
          @click="handleLogout"
          class="text-sm px-3 py-1 border rounded-md hover:bg-secondary"
        >
          {{ t("header.logout") }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'

const userStore = useUserStore()
const router = useRouter()
const { t } = useI18n()

function handleLogout() {
  userStore.logout()
  router.push({ name: 'Login' })
}
</script>
