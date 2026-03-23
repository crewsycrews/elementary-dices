<template>
  <div class="container mx-auto p-6 space-y-6">
    <ViewOnboardingModal
      v-if="showOnboarding"
      title="Dice Inventory Basics"
      subtitle="Shown once when you first open Dices."
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <!-- Header -->
    <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
    <button
      @click="$router.push('/')"
      class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">Back</span>
    </button>

    <div class="text-center">
      <h1 class="text-3xl font-bold mb-2">🎲 Dice Collection</h1>
      <p class="text-muted-foreground">
        Manage and equip your dice for events and battles
      </p>
    </div>
      <span class="w-14" aria-hidden="true"></span>
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
import { onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { useInventoryStore } from "@/stores/inventory";
import DiceInventoryPanel from "@/components/game/DiceInventoryPanel.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";

const userStore = useUserStore();
const inventoryStore = useInventoryStore();
const showOnboarding = ref(false);
const onboardingStorageScope = "dices-v1";

const onboardingSteps = [
  {
    title: "Your dice define turn options",
    description:
      "Dice choice affects which elements are easier to roll and how reliably you can build combinations during Farkle turns.",
    bullets: [
      "Equip dice that support your party element mix.",
      "Different notations and rarities shift roll consistency.",
      "Higher quality dice can create stronger turn setups.",
    ],
  },
  {
    title: "Farkle combo goals",
    description:
      "During battle turns, you roll five dice and set aside combinations to build bonuses before deployment.",
    bullets: [
      "Triplet, Quartet, All-For-One, Full House, and One-For-All give bonuses.",
      "Set-aside chosen element gives a direct +10% attack boost.",
      "If you bust after rerolling, turn bonuses are lost.",
    ],
  },
];

const getOnboardingStorageKey = () => {
  if (!userStore.userId) return null;
  return `elementary-dices:onboarding:${userStore.userId}:${onboardingStorageScope}`;
};

const dismissOnboarding = () => {
  const key = getOnboardingStorageKey();
  if (key) localStorage.setItem(key, "seen");
  showOnboarding.value = false;
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  const onboardingKey = getOnboardingStorageKey();
  if (onboardingKey && !localStorage.getItem(onboardingKey)) {
    showOnboarding.value = true;
  }

  try {
    await inventoryStore.fetchPlayerDice(userStore.userId);
  } catch (error) {
    console.error("Failed to load dice:", error);
  }
});
</script>
