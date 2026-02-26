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
    <div>
      <h1 class="text-3xl font-bold mb-2">🎒 Inventory</h1>
      <p class="text-muted-foreground">
        Manage your consumable items and buffs
      </p>
    </div>

    <!-- Items Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Items ({{ playerItemsWithData.length }})</h2>
        <div class="flex gap-2">
          <button
            v-for="filter in itemFilters"
            :key="filter.id"
            @click="selectedItemFilter = filter.id"
            class="px-3 py-1 rounded text-sm font-semibold transition-all"
            :class="
              selectedItemFilter === filter.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            "
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div v-if="filteredItems.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InventorySlot
          v-for="playerItem in filteredItems"
          :key="playerItem.playerInventory.id"
          :item="playerItem.item"
          :quantity="playerItem.playerInventory.quantity"
          :is-interactive="true"
          @click="handleUseItem(playerItem)"
        >
          <template #actions>
            <button
              @click.stop="handleUseItem(playerItem)"
              class="w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-bold hover:bg-primary/90 transition-all"
            >
              Use
            </button>
          </template>
        </InventorySlot>
      </div>

      <div v-else class="p-12 border-2 border-dashed rounded-lg text-center">
        <div class="text-6xl mb-4">🎒</div>
        <h3 class="text-xl font-bold mb-2">
          {{ selectedItemFilter === 'all' ? 'No Items' : `No ${itemFilters.find(f => f.id === selectedItemFilter)?.label}` }}
        </h3>
        <p class="text-muted-foreground mb-4">
          Purchase items from merchants during events
        </p>
      </div>
    </div>

    <!-- Item Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-card border-2 border-border rounded-lg">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🎯</span>
          <div>
            <p class="text-sm text-muted-foreground">Capture Items</p>
            <p class="text-2xl font-bold">{{ captureItemsCount }}</p>
          </div>
        </div>
      </div>
      <div class="p-4 bg-card border-2 border-border rounded-lg">
        <div class="flex items-center gap-3">
          <span class="text-3xl">⚡</span>
          <div>
            <p class="text-sm text-muted-foreground">Consumables</p>
            <p class="text-2xl font-bold">{{ consumableItemsCount }}</p>
          </div>
        </div>
      </div>
      <div class="p-4 bg-card border-2 border-border rounded-lg">
        <div class="flex items-center gap-3">
          <span class="text-3xl">💪</span>
          <div>
            <p class="text-sm text-muted-foreground">Buffs</p>
            <p class="text-2xl font-bold">{{ buffItemsCount }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useInventoryStore } from '@/stores/inventory';
import { useUIStore } from '@/stores/ui';
import InventorySlot from '@/components/game/InventorySlot.vue';

const userStore = useUserStore();
const inventoryStore = useInventoryStore();
const uiStore = useUIStore();

const selectedItemFilter = ref('all');

// Item filters
const itemFilters = [
  { id: 'all', label: 'All' },
  { id: 'capture', label: 'Capture' },
  { id: 'consumable', label: 'Consumable' },
  { id: 'buff', label: 'Buff' },
];

// Items data
const playerItemsWithData = computed(() => {
  return inventoryStore.playerItems
    .map((playerItem) => {
      return {
        playerInventory: playerItem,
        item: playerItem.item,
      };
    })
    .filter((p) => p.item) as Array<{ playerInventory: any; item: any }>;
});

// Filtered items based on selected filter
const filteredItems = computed(() => {
  if (selectedItemFilter.value === 'all') {
    return playerItemsWithData.value;
  }
  return playerItemsWithData.value.filter(
    (p) => p.item.item_type === selectedItemFilter.value
  );
});

// Item counts
const captureItemsCount = computed(() => {
  return inventoryStore.captureItems.length;
});

const consumableItemsCount = computed(() => {
  return inventoryStore.consumableItems.length;
});

const buffItemsCount = computed(() => {
  return inventoryStore.buffItems.length;
});

// Handle use item
const handleUseItem = (playerItem: { playerInventory: any; item: any }) => {
  // For now, just show a notification
  // TODO: Implement item usage logic
  uiStore.showToast(`Using ${playerItem.item.name}...`, 'info');

  // If it's a consumable, decrease quantity
  if (playerItem.item.is_consumable && userStore.userId) {
    inventoryStore.useItem(userStore.userId, playerItem.playerInventory.id, 1);
  }
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.fetchPlayerItems(userStore.userId);
  } catch (error) {
    console.error('Failed to load inventory:', error);
  }
});
</script>
