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
      <h1 class="text-3xl font-bold mb-2">👥 Party</h1>
      <p class="text-muted-foreground">
        Manage your active party and backpack elementals
      </p>
    </div>

    <!-- Active Party -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Active Party ({{ activePartyWithData.length }}/5)</h2>
        <p class="text-sm text-muted-foreground">Drag & drop to reorder</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <PartySlot
          v-for="(member, index) in [...activePartyWithData, ...Array(5 - activePartyWithData.length)]"
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

      <!-- Party Stats -->
      <div class="flex gap-4 justify-center">
        <div class="px-6 py-3 bg-card border-2 border-border rounded-lg">
          <p class="text-sm text-muted-foreground">Total Power</p>
          <p class="text-2xl font-bold text-primary">{{ totalPartyPower }}</p>
        </div>
      </div>
    </div>

    <!-- Backpack -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Backpack ({{ backpackWithData.length }}/{{ maxBackpackSize }})</h2>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useElementalsStore } from '@/stores/elementals';
import { useUIStore } from '@/stores/ui';
import PartySlot from '@/components/game/PartySlot.vue';
import ElementalCard from '@/components/game/ElementalCard.vue';

const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const uiStore = useUIStore();

const maxBackpackSize = 20;

// Elemental data with full details
const activePartyWithData = computed(() => {
  return elementalsStore.activeParty
    .map((playerElemental) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === playerElemental.elemental_id
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

const backpackWithData = computed(() => {
  return elementalsStore.backpack
    .map((playerElemental) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === playerElemental.elemental_id
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

const totalPartyPower = computed(() => {
  return elementalsStore.activeParty.reduce((sum, elemental) => sum + (elemental.power || 0), 0);
});

// Handle party slot click
const handlePartySlotClick = (position: number) => {
  const member = activePartyWithData.value[position - 1];
  if (member) {
    // Show modal or action sheet for elemental management
    uiStore.showNotification({
      message: `Clicked on ${member.elemental.name}`,
      type: 'info',
    });
  }
};

// Handle adding elemental to party
const handleAddToParty = async (member: { playerElemental: any; elemental: any }) => {
  if (!userStore.userId) return;

  if (activePartyWithData.value.length >= 5) {
    uiStore.showNotification({
      message: 'Party is full! Remove an elemental first.',
      type: 'error',
    });
    return;
  }

  try {
    await elementalsStore.addToParty(userStore.userId, member.playerElemental.id);
    uiStore.showNotification({
      message: `${member.elemental.name} added to party!`,
      type: 'success',
    });
  } catch (error) {
    console.error('Failed to add to party:', error);
    uiStore.showNotification({
      message: 'Failed to add elemental to party',
      type: 'error',
    });
  }
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  try {
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } catch (error) {
    console.error('Failed to load party data:', error);
  }
});
</script>
