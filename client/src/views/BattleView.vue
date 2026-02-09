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
      <p class="text-xl font-semibold">Loading battle...</p>
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

    <!-- PvP Battle Event -->
    <div v-else class="space-y-6 min-h-screen flex flex-col">
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">⚔️ PvP Battle!</h1>
        <p class="text-muted-foreground">
          Opponent: {{ eventStore.pvpData?.opponent_name }} | Reward: 💰
          {{ eventStore.pvpData?.potential_reward }}
        </p>
      </div>

      <!-- Battle Arena: Side-by-Side Party Grids -->
      <div v-if="!battleResult" class="flex-1 flex flex-col justify-start">
        <div class="max-w-6xl mx-auto w-full">
          <!-- Battle Grid Layout -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <!-- Your Party (Left) -->
            <div class="space-y-3">
              <h3 class="text-xl font-bold text-center text-blue-500">
                Your Party
              </h3>
              <CompactPartyGrid :party="playerPartyArray" :show-stats="true" />
              <div class="text-center text-sm text-muted-foreground">
                Total Power:
                <span class="font-bold text-blue-500">{{
                  playerTotalPower
                }}</span>
              </div>
            </div>

            <!-- VS Indicator (Center) -->
            <div class="flex flex-col items-center justify-center gap-6">
              <div
                class="text-6xl md:text-8xl font-black text-primary animate-pulse"
              >
                VS
              </div>
            </div>

            <!-- Opponent Party (Right) -->
            <div class="space-y-3">
              <h3 class="text-xl font-bold text-center text-red-500">
                Opponent
              </h3>
              <CompactPartyGrid
                :party="opponentPartyArray"
                :show-stats="true"
              />
              <div class="text-center text-sm text-muted-foreground">
                Total Power:
                <span class="font-bold text-red-500">{{
                  eventStore.pvpData?.opponent_power_level
                }}</span>
              </div>
            </div>
          </div>
          <!-- Dice Selection (integrated in center) -->
          <div class="flex flex-col items-center w-full space-y-3">
            <HandDiceSelector
              v-if="!isRolling && !showDiceRoll"
              :available-dice="groupedDice"
              :selected-dice-type="selectedDiceType"
              @select="handleDiceTypeSelect"
            />

            <!-- Roll Button -->
            <button
              v-if="!showDiceRoll"
              @click="handleBattleAttempt"
              :disabled="!selectedDice || isRolling"
              class="max-w-md px-6 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
            >
              {{ isRolling ? "⚔️ Fighting..." : "🎲 Roll the dice!" }}
            </button>
          </div>
        </div>
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

      <!-- Battle Result -->
      <div v-if="battleResult" class="max-w-md mx-auto text-center space-y-4">
        <div
          class="p-6 rounded-lg"
          :class="
            battleResult.victory
              ? 'bg-green-500/10 border-2 border-green-500'
              : 'bg-red-500/10 border-2 border-red-500'
          "
        >
          <div class="text-6xl mb-4">
            {{ battleResult.victory ? "🏆" : "💀" }}
          </div>
          <h2 class="text-2xl font-bold mb-2">
            {{ battleResult.victory ? "Victory!" : "Defeat!" }}
          </h2>
          <p class="text-lg mb-4">{{ battleResult.message }}</p>

          <!-- Power Comparison -->
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="p-3 bg-blue-500/10 rounded-lg">
              <p class="text-sm text-muted-foreground">Your Power</p>
              <p class="text-2xl font-bold">{{ battleResult.player_power }}</p>
            </div>
            <div class="p-3 bg-red-500/10 rounded-lg">
              <p class="text-sm text-muted-foreground">Opponent Power</p>
              <p class="text-2xl font-bold">
                {{ battleResult.opponent_power }}
              </p>
            </div>
          </div>

          <!-- Rewards/Penalties -->
          <div
            v-if="battleResult.victory && battleResult.reward"
            class="mt-4 p-3 bg-yellow-500/10 rounded-lg"
          >
            <p class="text-sm text-muted-foreground mb-1">Reward Earned:</p>
            <p class="font-bold text-xl text-yellow-600">
              💰 {{ battleResult.reward }} coins
            </p>
          </div>
          <div
            v-else-if="!battleResult.victory && battleResult.penalty_message"
            class="mt-4 p-3 bg-orange-500/10 rounded-lg"
          >
            <p class="text-sm text-orange-600">
              {{ battleResult.penalty_message }}
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
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import { useApi } from "@/composables/useApi";
import DiceRollVisualization from "@/components/game/DiceRollVisualization.vue";
import CompactPartyGrid from "@/components/game/CompactPartyGrid.vue";
import HandDiceSelector from "@/components/game/HandDiceSelector.vue";
import type {
  DiceType,
  PlayerDice,
  PlayerElemental,
} from "@elementary-dices/shared";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const { api, apiCall } = useApi();

const loading = ref(false);
const isRolling = ref(false);
const selectedDice = ref("");
const selectedDiceType = ref<string | null>(null);
const showDiceRoll = ref(false);
const rollResult = ref<any>(null);
const battleResult = ref<any>(null);
const currentDiceRollId = ref<string | null>(null);
const diceVisualizationRef = ref<InstanceType<
  typeof DiceRollVisualization
> | null>(null);

// Available dice from inventory
const availableDice = computed(() => {
  return inventoryStore.playerDice;
});

// Group dice by type for HandDiceSelector
const groupedDice = computed(() => {
  const grouped: Record<string, PlayerDice[]> = {
    d4: [],
    d6: [],
    d10: [],
    d12: [],
    d20: [],
  };

  availableDice.value.forEach((dice: any) => {
    const diceType = dice.dice_type?.dice_notation;
    if (diceType && grouped[diceType]) {
      grouped[diceType].push(dice);
    }
  });

  return grouped;
});

// Convert active party to array with nulls for empty slots
const playerPartyArray = computed(() => {
  const party: (PlayerElemental | null)[] = [];
  for (let i = 0; i < 5; i++) {
    party.push(elementalsStore.activeParty[i] || null);
  }
  return party;
});

// Mock opponent party for display (replace with actual data when available)
const opponentPartyArray = computed(() => {
  // For now, return null array - could be populated from eventStore.pvpData
  return Array(5).fill(null);
});

// Calculate player total power
const playerTotalPower = computed(() => {
  return elementalsStore.activeParty.reduce(
    (sum, elemental) =>
      sum +
      (Object.values(elemental.current_stats).reduce(
        (acc, val) => acc + (val || 0),
        0,
      ) || 0),
    0,
  );
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

// Handle dice type selection from HandDiceSelector
const handleDiceTypeSelect = (diceType: string) => {
  selectedDiceType.value = diceType;
  // Auto-select the first dice of that type
  const diceOfType = groupedDice.value[diceType];
  if (diceOfType && diceOfType.length > 0) {
    selectedDice.value = diceOfType[0].id;
  }
};

// Handle battle attempt
const handleBattleAttempt = async () => {
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
        context: "combat",
      }),
      { silent: true },
    );

    if (!rollResponse.data?.roll) {
      throw new Error("No roll data returned");
    }
    const diceRoll = rollResponse.data.roll;

    // Set roll result for visualization
    rollResult.value = {
      roll_value: diceRoll.roll_value,
      outcome: diceRoll.outcome,
    };

    // Save dice roll ID for later resolution
    currentDiceRollId.value = diceRoll.id;
    
    nextTick(() => {
      diceVisualizationRef.value?.roll();
    });
    // Save last roll to inventory store
    const diceType = getDiceType(selectedDice.value);
    inventoryStore.updateLastRoll(diceType, {
      diceType,
      result: diceRoll.roll_value,
      outcome: diceRoll.outcome,
    } as any);
  } catch (error) {
    console.error("Failed to resolve battle:", error);
  } finally {
    isRolling.value = false;
  }
};

// Handle roll complete
const handleRollComplete = async () => {
  console.log("Roll visualization complete");
  if (!currentDiceRollId.value || !userStore.userId) {
    console.error("No current dice roll ID found for resolution");
    return;
  }
  // Resolve battle to get the result
  const resolveResponse = await apiCall(
    api.api.events["pvp-battle"].resolve.post({
      player_id: userStore.userId,
      dice_roll_id: currentDiceRollId.value,
    }),
    { silent: true },
  );

  battleResult.value = resolveResponse.data?.result;
};

// Proceed to next event or dashboard
const proceedToNext = async () => {
  if (!userStore.userId) {
    eventStore.clearEvent();
    router.push("/");
    return;
  }

  try {
    // Refresh user currency and stats after battle
    await userStore.fetchUser(userStore.userId);
    await inventoryStore.fetchPlayerItems(userStore.userId);
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } catch (error) {
    console.error("Failed to refresh user data:", error);
  } finally {
    // Clear event from store now that player has reviewed results
    eventStore.clearEvent();
    router.push("/");
  }
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
  } catch (error) {
    console.error("Failed to load event data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
