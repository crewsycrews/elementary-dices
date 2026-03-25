<template>
  <div
    class="event-choice-view min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8"
  >
    <UserBalanceHeader />

    <div class="w-full max-w-4xl mx-auto main-menu-grid">
      <div class="area-event flex justify-center items-center">
        <MainMenuButton
          :title="t('event_choice.pvp_title')"
          icon="⚔️"
          :subtitle="t('event_choice.pvp_subtitle')"
          icon-color="text-orange-500"
          :is-active="selectedType === 'pvp_battle'"
          :pulse="selectedType === 'pvp_battle'"
          :disabled="!isAvailable('pvp_battle') || isSubmitting || isLoadingOptions"
          @click="selectEvent('pvp_battle')"
        />
      </div>

      <div class="area-party flex justify-center items-center">
        <MainMenuButton
          :title="t('event_choice.wild_title')"
          icon="🌲"
          :subtitle="t('event_choice.wild_subtitle')"
          icon-color="text-green-500"
          :is-active="selectedType === 'wild_encounter'"
          :pulse="selectedType === 'wild_encounter'"
          :disabled="!isAvailable('wild_encounter') || isSubmitting || isLoadingOptions"
          @click="selectEvent('wild_encounter')"
        />
      </div>

      <div class="area-dice flex justify-center items-center">
        <CentralDiceDisplay
          :dice-notation="favoriteDiceNotation"
          :spinning="isSubmitting"
          :element-faces="favoriteDiceFaces"
        />
      </div>

      <div class="area-inventory flex justify-center items-center">
        <MainMenuButton
          :title="t('event_choice.merchant_title')"
          icon="🏪"
          :subtitle="t('event_choice.merchant_subtitle')"
          icon-color="text-amber-500"
          :is-active="selectedType === 'merchant'"
          :pulse="selectedType === 'merchant'"
          :disabled="!isAvailable('merchant') || isSubmitting || isLoadingOptions"
          @click="selectEvent('merchant')"
        />
      </div>

      <div class="area-dices flex justify-center items-center">
        <MainMenuButton
          :title="t('common.back')"
          icon="↩️"
          icon-color="text-primary"
          :disabled="isSubmitting"
          @click="goBack"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useElementalsStore } from "@/stores/elementals";
import { useEventStore } from "@/stores/event";
import { useInventoryStore } from "@/stores/inventory";
import { useUserStore } from "@/stores/user";
import MainMenuButton from "@/components/game/MainMenuButton.vue";
import CentralDiceDisplay from "@/components/game/CentralDiceDisplay.vue";
import UserBalanceHeader from "@/components/layout/UserBalanceHeader.vue";
import { useI18n } from "@/i18n";

type EventType = "wild_encounter" | "pvp_battle" | "merchant";

const router = useRouter();
const userStore = useUserStore();
const eventStore = useEventStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const { t } = useI18n();

const selectedType = ref<EventType | null>(null);
const isSubmitting = ref(false);
const isLoadingOptions = ref(false);
const availableTypes = ref<EventType[]>([]);

const favoriteDice = computed(() => inventoryStore.favoriteDice);
const favoriteDiceNotation = computed(
  () => favoriteDice.value?.dice_type?.dice_notation ?? "d20",
);
const favoriteDiceFaces = computed(
  () => (favoriteDice.value?.dice_type as any)?.faces as string[] | undefined,
);

const getEventRoute = () => {
  if (eventStore.isWildEncounter) return "/wild-encounter";
  if (eventStore.isPvPBattle) return "/battle";
  if (eventStore.isMerchant) return "/merchant";
  return "/event";
};

const isAvailable = (type: EventType) => availableTypes.value.includes(type);
const goBack = () => router.push("/");

const selectEvent = async (type: EventType) => {
  if (!userStore.userId || isSubmitting.value || !isAvailable(type)) return;

  selectedType.value = type;
  isSubmitting.value = true;
  try {
    await eventStore.createEvent(userStore.userId, type);
    router.push(getEventRoute());
  } catch (error) {
    console.error("Failed to create event:", error);
    selectedType.value = null;
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  if (eventStore.isEventActive) {
    router.replace(getEventRoute());
    return;
  }

  if (!userStore.userId) {
    router.replace("/login");
    return;
  }

  if (elementalsStore.activeParty.length === 0) {
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  }

  if (elementalsStore.activeParty.length === 0) {
    router.replace("/party");
    return;
  }

  if (inventoryStore.playerDice.length === 0) {
    await inventoryStore.fetchPlayerDice(userStore.userId);
  }

  isLoadingOptions.value = true;
  try {
    const options = await eventStore.getEventOptions();
    availableTypes.value = options?.available ?? [];
  } catch (error) {
    console.error("Failed to load event options:", error);
    availableTypes.value = [];
  } finally {
    isLoadingOptions.value = false;
  }
});
</script>

<style scoped>
.main-menu-grid {
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "event"
    "party"
    "dice"
    "inventory"
    "dices";
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto auto auto;
}

@media (min-width: 768px) {
  .main-menu-grid {
    grid-template-areas:
      ". . event . ."
      ". party dice inventory ."
      ". . dices . .";
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: auto auto auto;
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
