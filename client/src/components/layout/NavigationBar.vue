<template>
  <nav class="border-b bg-card">
    <div class="container mx-auto px-6">
      <div class="flex space-x-1">
        <router-link
          v-for="route in navigationRoutes"
          :key="route.name"
          :to="{ name: route.name }"
          class="px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
          :class="{
            'border-b-2 border-primary': $route.name === route.name,
            'text-muted-foreground': $route.name !== route.name,
          }"
        >
          {{ route.label }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEventStore } from '@/stores/event'
import { useI18n } from '@/i18n'

const route = useRoute()
const eventStore = useEventStore()
const { t } = useI18n()

const navigationRoutes = computed(() => [
  { name: 'Dashboard', label: t("nav.dashboard") },
  { name: 'Shop', label: t("nav.shop") },
  {
    name: 'Event',
    label: eventStore.isEventActive ? t("nav.event_active") : t("nav.event_trigger"),
  },
  { name: 'Evolution', label: t("nav.evolution") },
  { name: 'Collection', label: t("nav.collection") },
  { name: 'Profile', label: t("nav.profile") },
])
</script>
