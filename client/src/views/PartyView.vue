<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start gap-3">
    <button
      @click="$router.push('/')"
      class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">Back</span>
    </button>

    <div>
      <h1 class="text-3xl font-bold mb-2">👥 Party</h1>
      <p class="text-muted-foreground">
        Manage your active party and backpack elementals
      </p>
    </div>
    </div>

    <!-- Active Party -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">
          Active Party ({{ activePartyWithData.filter(Boolean).length }}/5)
        </h2>
        <p class="text-sm text-muted-foreground">Drag & drop to reorder</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <PartySlot
          v-for="(member, index) in activePartyWithData"
          :key="member?.playerElemental?.id || `empty-${index}`"
          :position="index + 1"
          :player-elemental="member?.playerElemental"
          :elemental="member?.elemental"
          :is-draggable="!!member"
          :show-health="true"
          :show-stats="false"
          @click="handlePartySlotClick(index + 1)"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @drop="handleDrop"
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

    <!-- Evolution Link -->
    <div>
      <button
        @click="$router.push('/evolutions')"
        class="w-full p-6 border-2 border-dashed border-primary/50 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
      >
        <div class="flex items-center justify-center gap-4">
          <div class="text-4xl">🔮</div>
          <div class="text-left">
            <h3 class="text-xl font-bold group-hover:text-primary">
              Elemental Evolutions
            </h3>
            <p class="text-sm text-muted-foreground">
              Combine elementals to create powerful evolutions
            </p>
          </div>
          <div class="text-2xl">→</div>
        </div>
      </button>
    </div>

    <!-- Backpack -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">
          Backpack ({{ backpackWithData.length }}/{{ maxBackpackSize }})
        </h2>
        <p class="text-sm text-muted-foreground">
          Select an elemental to add to party
        </p>
      </div>

      <div
        v-if="backpackWithData.length > 0"
        class="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <ElementalCard
          v-for="member in backpackWithData"
          :key="member.playerElemental.id"
          :elemental="member.elemental"
          :stats="member.playerElemental.current_stats"
          :is-selectable="true"
          :is-draggable="true"
          :player-elemental-id="member.playerElemental.id"
          @click="handleAddToParty(member)"
          @drag-start="handleBackpackDragStart(member)"
          @drag-end="handleDragEnd"
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
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useUIStore } from "@/stores/ui";
import { useApi } from "@/composables/useApi";
import { playerApi } from "@/composables/useApiHelpers";
import PartySlot from "@/components/game/PartySlot.vue";
import ElementalCard from "@/components/game/ElementalCard.vue";

const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const uiStore = useUIStore();

const maxBackpackSize = 20;

// Track dragged elemental
const draggedElemental = ref<{
  playerElemental: any;
  elemental: any;
  position?: number;
} | null>(null);

// Elemental data with full details - always returns 5 slots (some may be null)
const activePartyWithData = computed(() => {
  const slots: Array<{ playerElemental: any; elemental: any } | null> =
    Array(5).fill(null);

  elementalsStore.activeParty.forEach((playerElemental) => {
    const elemental = elementalsStore.allElementals.find(
      (e) => e.id === playerElemental.elemental_id,
    );
    if (elemental && playerElemental.party_position) {
      const index = playerElemental.party_position - 1; // party_position is 1-indexed
      if (index >= 0 && index < 5) {
        slots[index] = { playerElemental, elemental };
      }
    }
  });

  return slots;
});

const backpackWithData = computed(() => {
  return elementalsStore.backpack
    .map((playerElemental) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === playerElemental.elemental_id,
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

const totalPartyPower = computed(() => {
  return elementalsStore.activeParty.reduce((sum, elemental) => {
    const stats = elemental.current_stats;
    return sum + stats.attack + stats.defense + stats.speed;
  }, 0);
});

// Handle drag start from party slot
const handleDragStart = (position: number, playerElemental: any) => {
  const member = activePartyWithData.value[position - 1];
  if (member) {
    draggedElemental.value = { ...member, position };
  }
};

// Handle drag start from backpack
const handleBackpackDragStart = (member: {
  playerElemental: any;
  elemental: any;
}) => {
  draggedElemental.value = { ...member }; // No position means it's from backpack
};

// Handle drag end
const handleDragEnd = () => {
  draggedElemental.value = null;
};

// Handle drop on party slot (reordering)
const handleDrop = async (targetPosition: number) => {
  const userId = userStore.userId;
  if (!draggedElemental.value || !userId) return;

  const sourcePosition = draggedElemental.value.position;

  if (!sourcePosition) {
    // Dragged from backpack - add to party at target position
    await handleAddToPartyAtPosition(draggedElemental.value, targetPosition);
  } else if (sourcePosition !== targetPosition) {
    // Dragged within party - swap positions
    try {
      const { apiCall } = useApi();
      const response = await apiCall(
        () => playerApi.swapPartyPositions(userId, {
          position1: sourcePosition,
          position2: targetPosition,
        }),
        { silent: true },
      );

      if (response.data) {
        // Refresh party data
        await elementalsStore.fetchPlayerElementals(userId);
        uiStore.showToast("Party positions swapped!", "success");
      }
    } catch (error) {
      console.error("Failed to swap positions:", error);
      uiStore.showToast("Failed to swap positions", "error");
    }
  }

  draggedElemental.value = null;
};

// Handle adding from backpack to specific position
const handleAddToPartyAtPosition = async (
  member: { playerElemental: any; elemental: any },
  position: number,
) => {
  const userId = userStore.userId;
  if (!userId) return;

  const targetSlot = activePartyWithData.value[position - 1];

  // If target slot is occupied, remove the occupant first
  if (targetSlot) {
    try {
      const { apiCall } = useApi();
      await apiCall(
        () => playerApi.updateElemental(
          userId,
          targetSlot.playerElemental.id,
          {
            is_in_active_party: false,
            party_position: null,
          },
        ),
        { silent: true },
      );
    } catch (error) {
      console.error("Failed to remove elemental from slot:", error);
      uiStore.showToast("Failed to swap elementals", "error");
      return;
    }
  }

  // Check if party is full (excluding the target slot we just cleared)
  const filledSlots = activePartyWithData.value.filter(Boolean).length;
  if (!targetSlot && filledSlots >= 5) {
    uiStore.showToast("Party is full! Remove an elemental first.", "error");
    return;
  }

  try {
    const { apiCall } = useApi();
    await apiCall(
      () => playerApi.updateElemental(userId, member.playerElemental.id, {
        is_in_active_party: true,
        party_position: position,
      }),
      { silent: true },
    );

    await elementalsStore.fetchPlayerElementals(userId);

    if (targetSlot) {
      uiStore.showToast(
        `${member.elemental.name} swapped with ${targetSlot.elemental.name}!`,
        "success",
      );
    } else {
      uiStore.showToast(`${member.elemental.name} added to party!`, "success");
    }
  } catch (error) {
    console.error("Failed to add to party:", error);
    uiStore.showToast("Failed to add elemental to party", "error");
  }
};

// Handle removing from party
const handleRemoveFromParty = async (position: number) => {
  if (!userStore.userId) return;

  const member = activePartyWithData.value[position - 1];
  if (!member) return;

  try {
    await elementalsStore.removeFromParty(
      userStore.userId,
      member.playerElemental.id,
    );
    uiStore.showToast(`${member.elemental.name} moved to backpack`, "success");
  } catch (error) {
    console.error("Failed to remove from party:", error);
    uiStore.showToast("Failed to remove from party", "error");
  }
};

// Handle party slot click
const handlePartySlotClick = (position: number) => {
  const member = activePartyWithData.value[position - 1];
  if (member) {
    // Show confirmation to remove from party
    if (confirm(`Remove ${member.elemental.name} from party?`)) {
      handleRemoveFromParty(position);
    }
  }
};

// Handle adding elemental to party (click on backpack card)
const handleAddToParty = async (member: {
  playerElemental: any;
  elemental: any;
}) => {
  if (!userStore.userId) return;

  if (activePartyWithData.value.filter(Boolean).length >= 5) {
    uiStore.showToast("Party is full! Remove an elemental first.", "error");
    return;
  }

  try {
    await elementalsStore.addToParty(
      userStore.userId,
      member.playerElemental.id,
    );
    uiStore.showToast(`${member.elemental.name} added to party!`, "success");
  } catch (error) {
    console.error("Failed to add to party:", error);
    uiStore.showToast("Failed to add elemental to party", "error");
  }
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  try {
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } catch (error) {
    console.error("Failed to load party data:", error);
  }
});
</script>
