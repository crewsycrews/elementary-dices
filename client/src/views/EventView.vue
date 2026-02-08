<template>
  <div class="container mx-auto p-6 text-center py-12">
    <div class="text-6xl mb-4">⏳</div>
    <p class="text-xl font-semibold">Redirecting to event...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";

const router = useRouter();
const eventStore = useEventStore();

// Get route for event type
const getEventRoute = () => {
  if (eventStore.isWildEncounter) return "/wild-encounter";
  if (eventStore.isPvPBattle) return "/battle";
  if (eventStore.isMerchant) return "/merchant";
  return "/"; // fallback to dashboard if no event active
};

// Redirect to appropriate event view on mount
onMounted(() => {
  const route = getEventRoute();
  router.replace(route);
});
</script>
