<template>
  <div class="container mx-auto p-6">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold mb-2">Dashboard</h1>
        <p class="text-muted-foreground">
          Welcome to Elementary Dices! Phase 2 complete ✅
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="p-6 border rounded-lg bg-card">
          <h3 class="font-semibold mb-2">🎮 Phase 2 Status</h3>
          <ul class="text-sm space-y-1 text-muted-foreground">
            <li>✅ 6 Pinia stores created</li>
            <li>✅ Router with 8 routes + auth guard</li>
            <li>✅ useApi composable wrapper</li>
            <li>✅ Layout components</li>
          </ul>
        </div>

        <div class="p-6 border rounded-lg bg-card">
          <h3 class="font-semibold mb-2">📋 Next: Phase 3</h3>
          <p class="text-sm text-muted-foreground">
            Game components (ElementalCard, DiceRoller, etc.)
          </p>
        </div>

        <div class="p-6 border rounded-lg bg-card">
          <h3 class="font-semibold mb-2">🚀 Coming Soon</h3>
          <p class="text-sm text-muted-foreground">
            Phase 4: Full view implementations
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onMounted(() => {
  console.log('Dashboard mounted. User authenticated:', userStore.isAuthenticated)
})
</script>
