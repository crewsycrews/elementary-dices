<template>
  <div
    class="main-menu-view min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8"
  >
    <!-- Start Game Modal (for new players) -->
    <StartGameModal
      v-if="showStartGameModal"
      @close="showStartGameModal = false"
      @complete="handleOnboardingComplete"
    />

    <!-- Optional: Header with username and currency -->
    <div class="absolute top-4 right-4 flex items-center gap-4 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-2xl">💰</span>
        <span class="font-bold">{{ userStore.currency }}</span>
      </div>
      <div class="text-muted-foreground">{{ userStore.username }}</div>
    </div>

    <!-- Main Menu Grid - Rhombus Layout -->
    <div class="w-full max-w-4xl mx-auto main-menu-grid">
      <!-- Current Event Section (top) -->
      <div class="area-event flex justify-center items-center">
        <MainMenuButton
          title="Current Event"
          :icon="eventStore.isEventActive ? '⚡' : '✨'"
          :subtitle="
            eventStore.isEventActive
              ? getEventTypeLabel(eventStore.currentEvent?.event_type || '')
              : 'Choose your next event'
          "
          :is-active="eventStore.isEventActive"
          :pulse="eventStore.isEventActive"
          :icon-color="
            eventStore.isEventActive ? 'text-orange-500' : 'text-primary'
          "
          @click="handleEventClick"
        />
      </div>

      <!-- Party Section (left) -->
      <div class="area-party flex justify-center items-center">
        <MainMenuButton
          title="Party"
          icon="👥"
          :subtitle="`${elementalsStore.activeParty.length}/5 active`"
          :badge="elementalsStore.activeParty.length"
          icon-color="text-blue-500"
          @click="navigateTo('party')"
        />
      </div>

      <!-- Central Dice Display (center) -->
      <div class="area-dice flex justify-center items-center">
        <CentralDiceDisplay
          :dice-notation="favoriteDiceNotation"
          :spinning="isRolling"
          :element-faces="favoriteDiceFaces"
        />
      </div>

      <!-- Inventory Section (right) -->
      <div class="area-inventory flex justify-center items-center">
        <MainMenuButton
          title="Inventory"
          icon="🎒"
          subtitle="Temporarily disabled"
          icon-color="text-green-500"
          :disabled="true"
        />
      </div>

      <!-- Dices Section (bottom) -->
      <div class="area-dices flex justify-center items-center">
        <MainMenuButton
          title="Dices"
          icon="🎲"
          :badge="inventoryStore.playerDice.length"
          icon-color="text-purple-500"
          @click="navigateTo('dices')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import { useEventStore } from "@/stores/event";
import MainMenuButton from "@/components/game/MainMenuButton.vue";
import CentralDiceDisplay from "@/components/game/CentralDiceDisplay.vue";
import StartGameModal from "@/components/onboarding/StartGameModal.vue";

const router = useRouter();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const eventStore = useEventStore();

// Show start game modal for new players
const showStartGameModal = ref(false);
const isRolling = ref(false);

const favoriteDice = computed(() => inventoryStore.favoriteDice);
const favoriteDiceNotation = computed(
  () => favoriteDice.value?.dice_type?.dice_notation ?? "d20",
);
const favoriteDiceFaces = computed(
  () => (favoriteDice.value?.dice_type as any)?.faces as string[] | undefined,
);

// Handle onboarding completion
const handleOnboardingComplete = () => {
  showStartGameModal.value = false;
  // Reload data to reflect the new elemental
  if (userStore.userId) {
    elementalsStore.fetchPlayerElementals(userStore.userId);
    userStore.fetchUser(userStore.userId);
  }
};

// Get event type label
const getEventTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    wild_encounter: "🌲 Wild Encounter",
    pvp_battle: "⚔️ PvP Battle",
    merchant: "🏪 Merchant",
  };
  return labels[type] || type;
};

// Get route for event type
const getEventRoute = () => {
  if (eventStore.isWildEncounter) return "/wild-encounter";
  if (eventStore.isPvPBattle) return "/battle";
  if (eventStore.isMerchant) return "/merchant";
  return "/event"; // fallback
};

// Handle event click
const handleEventClick = async () => {
  if (eventStore.isEventActive) {
    // Continue existing event - route to specific event view
    router.push(getEventRoute());
  } else {
    // Check if player has active party
    if (elementalsStore.activeParty.length === 0) {
      router.push("/party");
      return;
    }
    router.push("/event-choice");
  }
};

// Navigate to section
const navigateTo = (section: string) => {
  router.push(`/${section}`);
};

// Load initial data
onMounted(async () => {
  if (userStore.userId) {
    try {
      // Load user data
      await userStore.fetchUser(userStore.userId);

      // Load elementals
      await elementalsStore.fetchAllElementals();
      await elementalsStore.fetchPlayerElementals(userStore.userId);

      // Check if player needs onboarding
      if (elementalsStore.playerElementals.length === 0) {
        showStartGameModal.value = true;
      }

      // Load dice inventory
      await inventoryStore.fetchPlayerDice(userStore.userId);
    } catch (error) {
      console.error("Failed to load main menu data:", error);
    }
  }
});
</script>

<style scoped>
/* Grid layout for main menu - Rhombus/Diamond Pattern */
.main-menu-grid {
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "event"
    "party"
    "dice"
    "inventory"
    "dices";
  grid-template-rows: auto auto auto auto auto;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .main-menu-grid {
    grid-template-areas:
      ". . event . ."
      ". party dice inventory ."
      ". . dices . .";
    grid-template-rows: auto auto auto;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    min-height: 600px;
    gap: 2rem;
  }
}

.area-event {
  grid-area: event;
}

.area-party {
  grid-area: party;
}

.area-dice {
  grid-area: dice;
}

.area-inventory {
  grid-area: inventory;
}

.area-dices {
  grid-area: dices;
}
</style>
