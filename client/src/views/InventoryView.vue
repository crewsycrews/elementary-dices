<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold mb-2">Inventory</h1>
      <p class="text-muted-foreground">
        Manage your party, backpack, items, and dice
      </p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-border">
      <div class="flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-4 py-2 font-semibold transition-all"
          :class="activeTab === tab.id
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'"
        >
          {{ tab.icon }} {{ tab.label }}
          <span v-if="tab.count !== undefined" class="ml-2 text-xs px-2 py-0.5 rounded bg-muted">
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Elementals Tab -->
    <div v-if="activeTab === 'elementals'" class="space-y-6">
      <!-- Active Party -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Active Party ({{ activePartyWithData.length }}/5)</h2>
          <p class="text-sm text-muted-foreground">Drag & drop to reorder</p>
        </div>

        <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <PartySlot
            v-for="(member, index) in [... activePartyWithData, ...Array(5 - activePartyWithData.length)]"
            :key="member?.playerElemental?.id || `empty-${index}`"
            :position="index + 1"
            :player-elemental="member?.playerElemental"
            :elemental="member?.elemental"
            :is-draggable="!!member"
            :show-health="true"
            :show-stats="false"
            @click="handlePartySlotClick(index + 1)"
          />
        </div>
      </div>

      <!-- Backpack -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Backpack ({{ backpackWithData.length}}/{{ maxBackpackSize }})</h2>
          <p class="text-sm text-muted-foreground">Select an elemental to add to party</p>
        </div>

        <div v-if="backpackWithData.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ElementalCard
            v-for="member in backpackWithData"
            :key="member.playerElemental.id"
            :elemental="member.elemental"
            :stats="member.playerElemental.current_stats"
            :is-selectable="true"
            @click="handleAddToParty(member)"
          />
        </div>

        <div v-else class="p-12 border-2 border-dashed rounded-lg text-center">
          <div class="text-6xl mb-4">📦</div>
          <h3 class="text-xl font-bold mb-2">Empty Backpack</h3>
          <p class="text-muted-foreground">
            Capture elementals through events to fill your backpack
          </p>
        </div>
      </div>
    </div>

    <!-- Items Tab -->
    <div v-if="activeTab === 'items'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Items ({{ playerItemsWithData.length }})</h2>
        <div class="flex gap-2">
          <button
            v-for="filter in itemFilters"
            :key="filter.id"
            @click="selectedItemFilter = filter.id"
            class="px-3 py-1 rounded text-sm font-semibold transition-all"
            :class="selectedItemFilter === filter.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'"
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
        <h3 class="text-xl font-bold mb-2">No Items</h3>
        <p class="text-muted-foreground mb-4">
          Purchase items from the shop to use in battles
        </p>
        <router-link
          to="/shop"
          class="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
        >
          Visit Shop
        </router-link>
      </div>
    </div>

    <!-- Dice Tab -->
    <div v-if="activeTab === 'dice'" class="space-y-6">
      <!-- Equipped Dice Slots (Always 5) -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Equipped Dice (5 Slots)</h2>
        <div class="grid grid-cols-5 gap-4">
          <div
            v-for="notation in ['d4', 'd6', 'd10', 'd12', 'd20']"
            :key="notation"
            class="border-2 rounded-lg p-4 text-center transition-all hover:border-primary/50"
            :class="getEquippedForNotation(notation) ? 'border-primary bg-primary/5' : 'border-dashed border-muted'"
          >
            <div class="text-sm font-bold text-muted-foreground mb-3">
              {{ notation.toUpperCase() }}
            </div>
            <div v-if="getEquippedForNotation(notation)" class="space-y-2">
              <div class="text-2xl">🎲</div>
              <div class="text-xs font-bold">
                {{ getEquippedForNotation(notation)?.diceType.name }}
              </div>
              <div class="text-xs px-2 py-1 rounded"
                :class="{
                  'bg-green-500/20 text-green-700': getEquippedForNotation(notation)?.diceType.rarity === 'green',
                  'bg-blue-500/20 text-blue-700': getEquippedForNotation(notation)?.diceType.rarity === 'blue',
                  'bg-purple-500/20 text-purple-700': getEquippedForNotation(notation)?.diceType.rarity === 'purple',
                  'bg-yellow-500/20 text-yellow-700': getEquippedForNotation(notation)?.diceType.rarity === 'gold'
                }"
              >
                {{ getEquippedForNotation(notation)?.diceType.rarity }}
              </div>
            </div>
            <div v-else class="py-6 text-muted-foreground text-xs">
              Empty Slot
            </div>
          </div>
        </div>
      </div>

      <!-- Unequipped Dice Collection -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Dice Collection ({{ unequippedDiceWithData.length }})</h2>
          <p class="text-sm text-muted-foreground">
            Select a dice to equip in its notation slot
          </p>
        </div>

        <div v-if="unequippedDiceWithData.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InventorySlot
            v-for="playerDice in unequippedDiceWithData"
            :key="playerDice.playerDice.id"
            :dice="playerDice.playerDice"
            :dice-type="playerDice.diceType"
            :is-equipped="false"
            :is-interactive="true"
            @click="handleEquipDice(playerDice)"
          >
            <template #actions>
              <button
                @click.stop="handleEquipDice(playerDice)"
                class="w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Equip
              </button>
            </template>
          </InventorySlot>
        </div>

        <div v-else class="p-8 border-2 border-dashed rounded-lg text-center">
          <div class="text-4xl mb-2">✓</div>
          <h3 class="text-lg font-bold mb-1">All Dice Equipped</h3>
          <p class="text-muted-foreground text-sm mb-3">
            Purchase more dice from the shop to expand your collection
          </p>
          <router-link
            to="/shop"
            class="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
          >
            Visit Shop
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useElementalsStore } from '@/stores/elementals';
import { useInventoryStore } from '@/stores/inventory';
import { useUIStore } from '@/stores/ui';
import PartySlot from '@/components/game/PartySlot.vue';
import ElementalCard from '@/components/game/ElementalCard.vue';
import InventorySlot from '@/components/game/InventorySlot.vue';

const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const uiStore = useUIStore();

const activeTab = ref('elementals');
const selectedItemFilter = ref('all');

const maxBackpackSize = 20;

// Tabs
const tabs = computed(() => [
  {
    id: 'elementals',
    label: 'Elementals',
    icon: '🐉',
    count: elementalsStore.playerElementals.length,
  },
  {
    id: 'items',
    label: 'Items',
    icon: '🎒',
    count: inventoryStore.playerItems.length,
  },
  {
    id: 'dice',
    label: 'Dice',
    icon: '🎲',
    count: inventoryStore.playerDice.length,
  },
]);

// Elemental data with full details
const activePartyWithData = computed(() => {
  return elementalsStore.activeParty
    .map(playerElemental => {
      const elemental = elementalsStore.allElementals.find(
        e => e.id === playerElemental.elemental_id
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

const backpackWithData = computed(() => {
  return elementalsStore.backpack
    .map(playerElemental => {
      const elemental = elementalsStore.allElementals.find(
        e => e.id === playerElemental.elemental_id
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

// Items data
const playerItemsWithData = computed(() => {
  return inventoryStore.playerItems
    .map(playerInventory => {
      const item = inventoryStore.shopItems.find(
        i => i.id === playerInventory.item_id
      );
      return item ? { playerInventory, item } : null;
    })
    .filter(Boolean) as Array<{ playerInventory: any; item: any }>;
});

const itemFilters = [
  { id: 'all', label: 'All' },
  { id: 'capture', label: 'Capture' },
  { id: 'consumable', label: 'Consumable' },
  { id: 'buff', label: 'Buff' },
];

const filteredItems = computed(() => {
  if (selectedItemFilter.value === 'all') {
    return playerItemsWithData.value;
  }
  return playerItemsWithData.value.filter(
    item => item.item.item_type === selectedItemFilter.value
  );
});

// Dice data
const playerDiceWithData = computed(() => {
  return inventoryStore.playerDice
    .map(playerDice => {
      const diceType = inventoryStore.shopDice.find(
        d => d.id === playerDice.dice_type_id
      );
      return diceType ? { playerDice, diceType } : null;
    })
    .filter(Boolean) as Array<{ playerDice: any; diceType: any }>;
});

const equippedDiceWithData = computed(() => {
  return playerDiceWithData.value.filter(d => d.playerDice.is_equipped);
});

const unequippedDiceWithData = computed(() => {
  return playerDiceWithData.value.filter(d => !d.playerDice.is_equipped);
});

const getEquippedForNotation = (notation: string) => {
  return equippedDiceWithData.value.find(
    d => d.diceType.dice_notation === notation
  );
};

// Handlers
const handlePartySlotClick = (position: number) => {
  console.log('Party slot clicked:', position);
  // Could open a modal or detail view
};

const handleAddToParty = async (member: { playerElemental: any; elemental: any }) => {
  if (activePartyWithData.value.length >= 5) {
    uiStore.showError('Party is full! Remove an elemental first.');
    return;
  }

  try {
    // TODO: Implement when backend endpoint is ready
    // await elementalsStore.updatePlayerElemental(userStore.userId!, member.playerElemental.id, {
    //   is_in_active_party: true,
    //   party_position: activePartyWithData.value.length + 1
    // });
    uiStore.showToast(`${member.elemental.name} added to party!`, 'success');
  } catch (error) {
    console.error('Failed to add to party:', error);
  }
};

const handleUseItem = async (playerItem: { playerInventory: any; item: any }) => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.useItem(userStore.userId, playerItem.item.id);
    uiStore.showToast(`Used ${playerItem.item.name}!`, 'success');
  } catch (error) {
    console.error('Failed to use item:', error);
  }
};

const handleEquipDice = async (playerDice: { playerDice: any; diceType: any }) => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.equipDice(userStore.userId, playerDice.playerDice.id);
    const action = playerDice.playerDice.is_equipped ? 'Unequipped' : 'Equipped';
    uiStore.showToast(`${action} ${playerDice.diceType.name}!`, 'success');
  } catch (error) {
    console.error('Failed to equip dice:', error);
  }
};

// Load data
onMounted(async () => {
  if (userStore.userId) {
    try {
      await Promise.all([
        elementalsStore.fetchAllElementals(),
        inventoryStore.fetchPlayerItems(userStore.userId),
        inventoryStore.fetchPlayerDice(userStore.userId),
        inventoryStore.fetchShopItems(),
        inventoryStore.fetchShopDice(),
      ]);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    }
  }
});
</script>
