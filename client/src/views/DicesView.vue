<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Back Button -->
    <button
      @click="$router.push('/')"
      class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">Back</span>
    </button>

    <!-- Header -->
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-2">🎲 Dice Collection</h1>
      <p class="text-muted-foreground">
        Manage and equip your dice for events and battles
      </p>
    </div>

    <!-- Hand Dice Selector -->
    <div class="py-8">
      <DiceInventoryPanel />
    </div>


    <!-- Instructions -->
    <div class="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
      <p>
        💡 <strong>Tip:</strong> Equip different dice types to adapt your strategy for various challenges.
        Higher rarity dice provide better bonuses!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useInventoryStore } from '@/stores/inventory';
import DiceInventoryPanel from '@/components/game/DiceInventoryPanel.vue';

const userStore = useUserStore();
const inventoryStore = useInventoryStore();

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.fetchPlayerDice(userStore.userId);
  } catch (error) {
    console.error('Failed to load dice:', error);
  }
});
</script>
