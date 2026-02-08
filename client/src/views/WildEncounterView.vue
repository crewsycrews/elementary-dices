<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Back Button -->
    <button
      @click="router.push('/')"
      class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">Back</span>
    </button>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-6xl mb-4">⏳</div>
      <p class="text-xl font-semibold">Loading encounter...</p>
    </div>

    <!-- No Active Event -->
    <div v-else-if="!eventStore.isEventActive" class="text-center py-12">
      <div class="text-6xl mb-4">🎲</div>
      <h1 class="text-3xl font-bold mb-4">No Active Event</h1>
      <p class="text-muted-foreground mb-6">
        Trigger an event from the dashboard to start your adventure!
      </p>
      <button
        @click="router.push('/')"
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
      >
        Back to Dashboard
      </button>
    </div>

    <!-- Wild Encounter Event -->
    <div v-else class="space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">🌲 Wild Encounter!</h1>
        <p class="text-muted-foreground">
          {{ eventStore.currentEvent?.description }}
        </p>
      </div>

      <!-- Wild Elemental Card -->
      <div class="max-w-2xl mx-auto">
        <ElementalCard
          v-if="wildElemental"
          :elemental="wildElemental"
          :show-stats="true"
          :show-description="true"
        />
      </div>

      <!-- Capture Difficulty -->
      <div class="text-center">
        <div
          class="inline-block px-4 py-2 rounded-lg font-semibold"
          :class="
            getDifficultyClass(eventStore.wildEncounterData?.capture_difficulty)
          "
        >
          Capture Difficulty:
          {{ eventStore.wildEncounterData?.capture_difficulty?.toUpperCase() }}
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!captureResult" class="max-w-md mx-auto space-y-4">
        <div class="text-center mb-4">
          <p class="text-sm text-muted-foreground">
            Roll the dice to attempt capture!
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            Items increase your chances of success
          </p>
        </div>

        <!-- Dice Selection -->
        <div class="space-y-2">
          <label class="text-sm font-semibold">Select Dice:</label>
          <select
            v-model="selectedDice"
            class="w-full p-3 border rounded-lg bg-background"
            :disabled="isRolling"
          >
            <option value="">Choose a dice type...</option>
            <option
              v-for="dice in availableDice"
              :key="dice.id"
              :value="dice.id"
            >
              {{ dice.dice_type?.dice_notation?.toUpperCase() }} -
              {{ dice.dice_type?.name }}
            </option>
          </select>
        </div>

        <!-- Item Selection (Optional) -->
        <div class="space-y-2">
          <label class="text-sm font-semibold">Use Item (Optional):</label>
          <select
            v-model="selectedItem"
            class="w-full p-3 border rounded-lg bg-background"
            :disabled="isRolling"
          >
            <option value="">No item (lower success chance)</option>
            <option
              v-for="item in captureItems"
              :key="item.item_id"
              :value="item.item_id"
            >
              {{ item.item?.name }} (x{{ item.quantity }}) - +{{
                getCaptureBonus(item)
              }}
              bonus
            </option>
          </select>
        </div>

        <!-- Roll Button -->
        <button
          @click="handleCaptureAttempt"
          :disabled="!selectedDice || isRolling"
          class="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isRolling ? "🎲 Rolling..." : "🎲 Roll to Capture!" }}
        </button>

        <!-- Skip Button -->
        <button
          @click="handleSkipEncounter"
          :disabled="isRolling"
          class="w-full px-6 py-3 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all disabled:opacity-50"
        >
          Skip Encounter
        </button>
      </div>

      <!-- Dice Roll Visualization -->
      <div v-if="showDiceRoll" class="mt-6">
        <DiceRollVisualization
          ref="diceVisualizationRef"
          :dice-type="getDiceType(selectedDice)"
          :auto-roll="true"
          :result="rollResult"
          @roll-complete="handleRollComplete"
        />
      </div>

      <!-- Result Display -->
      <div v-if="captureResult" class="max-w-md mx-auto text-center space-y-4">
        <div
          class="p-6 rounded-lg"
          :class="
            captureResult.success
              ? 'bg-green-500/10 border-2 border-green-500'
              : 'bg-red-500/10 border-2 border-red-500'
          "
        >
          <div class="text-6xl mb-4">
            {{ captureResult.success ? "🎉" : "😞" }}
          </div>
          <h2 class="text-2xl font-bold mb-2">
            {{
              captureResult.success ? "Capture Successful!" : "Capture Failed!"
            }}
          </h2>
          <p class="text-lg mb-4">{{ captureResult.message }}</p>

          <!-- Additional details for successful capture -->
          <div
            v-if="captureResult.success && captureResult.elemental_caught"
            class="mt-4 p-4 bg-background/50 rounded-lg"
          >
            <p class="text-sm text-muted-foreground mb-2">
              New Elemental Added:
            </p>
            <p class="font-bold text-xl">
              {{ captureResult.elemental_caught.name }}
            </p>
            <p class="text-sm text-muted-foreground">
              Level {{ captureResult.elemental_caught.level }}
            </p>
          </div>

          <!-- Roll details -->
          <div class="mt-4 pt-4 border-t border-border">
            <p class="text-sm text-muted-foreground">
              Your roll:
              <span class="font-bold">{{ rollResult?.roll_value }}</span>
              <span
                class="ml-2 px-2 py-1 rounded text-xs"
                :class="
                  rollResult?.outcome === 'critical_success'
                    ? 'bg-green-500/20 text-green-600'
                    : rollResult?.outcome === 'success'
                      ? 'bg-blue-500/20 text-blue-600'
                      : rollResult?.outcome === 'failure'
                        ? 'bg-yellow-500/20 text-yellow-600'
                        : 'bg-red-500/20 text-red-600'
                "
              >
                {{ rollResult?.outcome?.replace("_", " ").toUpperCase() }}
              </span>
            </p>
          </div>
        </div>

        <button
          @click="proceedToNext"
          class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
        >
          🎲 Proceed to Next Event
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import { useApi } from "@/composables/useApi";
import ElementalCard from "@/components/game/ElementalCard.vue";
import DiceRollVisualization from "@/components/game/DiceRollVisualization.vue";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const { api, apiCall } = useApi();

const loading = ref(false);
const isRolling = ref(false);
const selectedDice = ref("");
const selectedItem = ref("");
const showDiceRoll = ref(false);
const rollResult = ref<any>(null);
const captureResult = ref<any>(null);
const diceVisualizationRef = ref<InstanceType<
  typeof DiceRollVisualization
> | null>(null);

// Wild elemental data
const wildElemental = ref<any>(null);

// Available dice from inventory
const availableDice = computed(() => {
  return inventoryStore.equippedDice;
});

// Capture items from inventory
const captureItems = computed(() => {
  return inventoryStore.captureItems;
});

// Get dice type from dice ID
const getDiceType = (diceId: string): "d4" | "d6" | "d10" | "d12" | "d20" => {
  const dice = availableDice.value.find((d) => d.id === diceId);
  return (dice?.dice_type?.dice_notation || "d6") as
    | "d4"
    | "d6"
    | "d10"
    | "d12"
    | "d20";
};

// Get capture bonus from item
const getCaptureBonus = (item: any): number => {
  return item.effect?.capture_bonus || 0;
};

// Get difficulty class
const getDifficultyClass = (difficulty?: string) => {
  switch (difficulty) {
    case "easy":
      return "bg-green-500/20 text-green-600";
    case "medium":
      return "bg-yellow-500/20 text-yellow-600";
    case "hard":
      return "bg-red-500/20 text-red-600";
    default:
      return "bg-gray-500/20 text-gray-600";
  }
};

// Handle capture attempt
const handleCaptureAttempt = async () => {
  if (!selectedDice.value || !userStore.userId) return;

  isRolling.value = true;
  showDiceRoll.value = true;

  try {
    // Get the dice_type_id from the selected player dice
    const selectedPlayerDice = availableDice.value.find(
      (d) => d.id === selectedDice.value,
    );
    if (!selectedPlayerDice) {
      throw new Error("Selected dice not found");
    }

    // Perform dice roll
    const rollResponse = await apiCall(
      api.api.rolls.post({
        player_id: userStore.userId,
        dice_type_id: selectedPlayerDice.dice_type_id,
        context: "capture_attempt",
      }),
      { silent: true },
    );
    if (!rollResponse.data?.roll) {
      throw new Error("No roll data returned");
    }
    const diceRoll = rollResponse.data?.roll;

    // Set roll result for visualization
    rollResult.value = {
      roll_value: diceRoll.roll_value,
      outcome: diceRoll.outcome,
    };

    // Save last roll to inventory store
    const diceType = getDiceType(selectedDice.value);
    inventoryStore.updateLastRoll(diceType, diceRoll);
  } catch (error) {
    console.error("Failed to resolve capture:", error);
  } finally {
    isRolling.value = false;
  }
};

// Handle skip encounter
const handleSkipEncounter = async () => {
  if (!userStore.userId) return;

  try {
    await apiCall(
      api.api.events["wild-encounter"].skip.post({
        player_id: userStore.userId,
      }),
      { successMessage: "Encounter skipped" },
    );

    // Clear event from store
    eventStore.clearEvent();

    router.push("/");
  } catch (error) {
    console.error("Failed to skip encounter:", error);
  }
};

// Handle roll complete
const handleRollComplete = async () => {
  if (!userStore.userId) return;
  // Resolve encounter
  
  const diceType = getDiceType(selectedDice.value);
  const resolveResponse = await apiCall(
    api.api.events["wild-encounter"].resolve.post({
      player_id: userStore.userId,
      dice_roll_id: inventoryStore.getLastRollForType(diceType)?.id!,
      item_id: selectedItem.value || undefined,
    }),
    { successMessage: "Encounter resolved!" },
  );

  captureResult.value = resolveResponse.data?.result;

  // Refresh player data to show updated inventory and elementals
  if (captureResult.value?.success) {
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  }
  if (selectedItem.value) {
    await inventoryStore.fetchPlayerItems(userStore.userId);
  }
};

// Proceed to next event or dashboard
const proceedToNext = () => {
  // Clear event from store now that player has reviewed results
  eventStore.clearEvent();
  router.push("/");
};

// Load event data
onMounted(async () => {
  if (!userStore.userId) return;

  loading.value = true;

  try {
    // Load necessary data
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
    await inventoryStore.fetchPlayerDice(userStore.userId);
    await inventoryStore.fetchPlayerItems(userStore.userId);

    // Load event-specific data
    if (eventStore.isWildEncounter && eventStore.wildEncounterData) {
      // Fetch wild elemental details
      const elemental = await elementalsStore.getElementalById(
        eventStore.wildEncounterData.elemental_id,
      );
      wildElemental.value = elemental;
    }
  } catch (error) {
    console.error("Failed to load event data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
