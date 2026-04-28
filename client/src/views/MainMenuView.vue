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

    <GameHeader />

    <!-- Main Menu Grid - Rhombus Layout -->
    <div class="w-full max-w-4xl mx-auto main-menu-grid">
      <!-- Current Event Section (top) -->
      <div class="area-event flex justify-center items-center">
        <MainMenuButton
          :title="t('menu.current_event')"
          :icon="eventStore.isEventActive ? '⚡' : '✨'"
          :subtitle="
            eventStore.isEventActive
              ? getEventTypeLabel(eventStore.currentEvent?.event_type || '')
              : t('menu.choose_next_event')
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
          :title="t('menu.party')"
          icon="👥"
          :subtitle="t('menu.active_party', { count: elementalsStore.activeParty.length })"
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
          :title="t('menu.inventory')"
          icon="🎒"
          :subtitle="t('menu.temporarily_disabled')"
          icon-color="text-green-500"
          :disabled="true"
        />
      </div>

      <!-- Dice Section (bottom) -->
      <div class="area-dice-collection flex justify-center items-center">
        <MainMenuButton
          :title="t('menu.dice')"
          icon="🎲"
          :badge="inventoryStore.playerDice.length"
          icon-color="text-purple-500"
          @click="navigateTo('dice')"
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
import GameHeader from "@/components/layout/GameHeader.vue";
import { useI18n } from "@/i18n";

const router = useRouter();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const eventStore = useEventStore();
const { t } = useI18n();

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
    wild_encounter: t("menu.event_type.wild"),
    pvp_battle: t("menu.event_type.pvp"),
    merchant: t("menu.event_type.merchant"),
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
    "collection";
  grid-template-rows: auto auto auto auto auto;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .main-menu-grid {
    grid-template-areas:
      ". . event . ."
      ". party dice inventory ."
      ". . collection . .";
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

.area-dice-collection {
  grid-area: collection;
}
</style>
