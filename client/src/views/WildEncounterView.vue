<template>
  <div class="container mx-auto p-4 md:p-6 space-y-6">
    <button
      @click="router.push('/')"
      class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <span class="text-xl">&larr;</span>
      <span class="font-semibold">Back</span>
    </button>

    <div v-if="loading" class="text-center py-12">
      <p class="text-xl font-semibold">Loading encounter...</p>
    </div>

    <div
      v-else-if="(!eventStore.isEventActive || !eventStore.isWildEncounter) && !captureResult"
      class="text-center py-12"
    >
      <h1 class="text-3xl font-bold mb-4">No Active Event</h1>
      <p class="text-muted-foreground mb-6">
        Trigger an event from the dashboard to start your adventure.
      </p>
      <button
        @click="router.push('/')"
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
      >
        Back to Dashboard
      </button>
    </div>

    <div v-else class="space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">Wild Encounter</h1>
        <div
          class="inline-block px-4 py-2 rounded-lg font-semibold"
          :class="getDifficultyClass(eventStore.wildEncounterData?.capture_difficulty)"
        >
          Capture difficulty: {{ eventStore.wildEncounterData?.capture_difficulty?.toUpperCase() }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div class="space-y-4">
          <ElementalCard
            v-if="wildElemental"
            :elemental="wildElemental"
            :show-stats="true"
            :show-description="true"
          />

          <div class="space-y-2">
            <label class="text-sm font-semibold">Use Item (Optional)</label>
            <select
              v-model="selectedItem"
              class="w-full p-3 border rounded-lg bg-background"
              :disabled="isActing || !!captureResult"
            >
              <option value="">No item</option>
              <option
                v-for="item in captureItems"
                :key="item.item_id"
                :value="item.item_id"
              >
                {{ item.item?.name }} (x{{ item.quantity }}) - +{{ getCaptureBonus(item) }}
              </option>
            </select>
          </div>

          <button
            @click="handleSkipEncounter"
            :disabled="isActing || !!captureResult"
            class="w-full px-6 py-3 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all disabled:opacity-50"
          >
            Skip Encounter
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-if="captureResult"
            class="p-6 rounded-lg"
            :class="
              captureResult.success
                ? 'bg-green-500/10 border-2 border-green-500'
                : 'bg-red-500/10 border-2 border-red-500'
            "
          >
            <h2 class="text-2xl font-bold mb-2">
              {{ captureResult.success ? 'Capture Successful' : 'Capture Failed' }}
            </h2>
            <p class="text-lg mb-4">{{ captureResult.message }}</p>

            <div
              v-if="captureResult.success && captureResult.elemental_caught"
              class="mt-4 p-4 bg-background/50 rounded-lg"
            >
              <p class="font-bold text-xl">{{ captureResult.elemental_caught.name }}</p>
              <p class="text-sm text-muted-foreground">Level {{ captureResult.elemental_caught.level }}</p>
            </div>

            <button
              @click="proceedToNext"
              class="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
            >
              Proceed
            </button>
          </div>

          <template v-else>
            <div v-if="farkleState?.dice?.length" class="space-y-3">
              <FarkleDiceRow
                :dice="farkleState.dice"
                :selected-indices="selectedDiceIndices"
                @toggle-select="toggleDiceSelection"
              />

              <CombinationDisplay
                :combinations="detectedCombinations"
                :selectable="false"
                :show-empty="true"
              />
            </div>

            <div class="space-y-3">
              <div class="flex flex-wrap gap-3">
                <button
                  v-if="canRoll"
                  @click="handleRoll"
                  :disabled="isActing"
                  class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  Roll all dice
                </button>

                <button
                  v-if="canReroll"
                  @click="handleReroll"
                  :disabled="isActing || selectedDiceIndices.length === 0"
                  class="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg font-bold hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                >
                  Reroll selected ({{ selectedDiceIndices.length }})
                </button>

                <button
                  v-if="canSetAside"
                  @click="handleSetAside"
                  :disabled="isActing"
                  class="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500 rounded-lg font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                >
                  Set aside best combo
                </button>

                <button
                  v-if="canSetAsideTargetElement"
                  @click="handleSetAsideTargetElement"
                  :disabled="isActing"
                  class="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500 rounded-lg font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50"
                >
                  Set aside encounter element
                </button>

                <button
                  v-if="canContinue"
                  @click="handleContinue"
                  :disabled="isActing"
                  class="px-4 py-2 bg-sky-500/20 text-sky-300 border border-sky-500 rounded-lg font-bold hover:bg-sky-500/30 transition-all disabled:opacity-50"
                >
                  Roll remaining dice
                </button>
              </div>

              <button
                v-if="canEndTurn"
                @click="handleEndTurn"
                :disabled="isActing"
                class="px-6 py-3 bg-card border border-border rounded-lg font-semibold hover:bg-card/80 transition-all disabled:opacity-50"
              >
                Resolve Capture
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useEventStore, type Combination, type WildEncounterFarkleState } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import { useApi } from "@/composables/useApi";
import ElementalCard from "@/components/game/ElementalCard.vue";
import FarkleDiceRow from "@/components/game/FarkleDiceRow.vue";
import CombinationDisplay from "@/components/game/CombinationDisplay.vue";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const { api, apiCall } = useApi();

const loading = ref(false);
const isActing = ref(false);
const selectedItem = ref("");
const selectedDiceIndices = ref<number[]>([]);
const captureResult = ref<any>(null);
const detectedCombinations = ref<Combination[]>([]);
const wildElemental = ref<any>(null);

const captureItems = computed(() => inventoryStore.captureItems);

const farkleState = computed(
  () => (eventStore.wildEncounterData?.farkle_state as WildEncounterFarkleState | undefined) ?? null,
);

const targetElement = computed(
  () => eventStore.wildEncounterData?.encounter_element ?? wildElemental.value?.element_types?.[0] ?? null,
);

const canRoll = computed(() => !farkleState.value || farkleState.value.phase === "initial_roll");
const canReroll = computed(
  () => farkleState.value?.phase === "can_reroll" && !farkleState.value?.has_used_reroll,
);
const canSetAside = computed(
  () =>
    !!farkleState.value &&
    ["can_reroll", "set_aside", "rolling_remaining"].includes(farkleState.value.phase) &&
    detectedCombinations.value.length > 0,
);
const canSetAsideTargetElement = computed(() => {
  if (!farkleState.value || !targetElement.value) return false;
  if (!["can_reroll", "set_aside", "rolling_remaining"].includes(farkleState.value.phase)) {
    return false;
  }
  return farkleState.value.dice.some(
    (d) => !d.is_set_aside && d.current_result === targetElement.value,
  );
});
const canContinue = computed(
  () =>
    !!farkleState.value &&
    farkleState.value.phase === "rolling_remaining",
);
const canEndTurn = computed(() => {
  if (!farkleState.value) return false;
  if (farkleState.value.busted) return true;
  return (
    farkleState.value.active_combinations.length > 0 ||
    farkleState.value.set_aside_element_bonus !== null
  );
});

const getCaptureBonus = (item: any): number => item.effect?.capture_bonus || 0;

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

const toggleDiceSelection = (index: number) => {
  if (!canReroll.value) return;
  const existing = selectedDiceIndices.value.indexOf(index);
  if (existing >= 0) selectedDiceIndices.value.splice(existing, 1);
  else selectedDiceIndices.value.push(index);
};

const updateFromTurnResult = (result: any) => {
  detectedCombinations.value = (result?.detected_combinations ?? []) as Combination[];
  selectedDiceIndices.value = [];
};

const handleRoll = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleRoll(userStore.userId);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter roll:", error);
  } finally {
    isActing.value = false;
  }
};

const handleReroll = async () => {
  if (!userStore.userId || selectedDiceIndices.value.length === 0) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleReroll(
      userStore.userId,
      [...selectedDiceIndices.value],
    );
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter reroll:", error);
  } finally {
    isActing.value = false;
  }
};

const handleSetAside = async () => {
  if (!userStore.userId || detectedCombinations.value.length === 0) return;
  isActing.value = true;
  const best = [...detectedCombinations.value].sort(
    (a, b) =>
      Object.values(b.bonuses).reduce((sum, v) => sum + Number(v), 0) -
      Object.values(a.bonuses).reduce((sum, v) => sum + Number(v), 0),
  )[0];
  try {
    const response = await eventStore.wildEncounterFarkleSetAside(
      userStore.userId,
      best.dice_indices,
      best.type === "one_for_all" ? targetElement.value ?? undefined : undefined,
    );
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter set aside:", error);
  } finally {
    isActing.value = false;
  }
};

const handleSetAsideTargetElement = async () => {
  if (!userStore.userId || !farkleState.value || !targetElement.value) return;
  const indices = farkleState.value.dice.map((d, i) => ({ d, i }))
    .filter(
      ({ d }) =>
        !d.is_set_aside && d.current_result === targetElement.value,
    )
    .map(({ i }) => i);
  if (indices.length < 1) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleSetAside(userStore.userId, indices);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed target-element set aside:", error);
  } finally {
    isActing.value = false;
  }
};

const handleContinue = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleContinue(userStore.userId);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter continue:", error);
  } finally {
    isActing.value = false;
  }
};

const handleEndTurn = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleEndTurn(
      userStore.userId,
      selectedItem.value || undefined,
    );
    captureResult.value = response?.result?.result ?? null;

    if (captureResult.value?.success) {
      await elementalsStore.fetchPlayerElementals(userStore.userId);
    }
    if (selectedItem.value) {
      await inventoryStore.fetchPlayerItems(userStore.userId);
    }
  } catch (error) {
    console.error("Failed to resolve encounter:", error);
  } finally {
    isActing.value = false;
  }
};

const handleSkipEncounter = async () => {
  const userId = userStore.userId;
  if (!userId) return;

  try {
    await apiCall(
      () =>
        api.api.events["wild-encounter"].skip.post({
          player_id: userId,
        }),
      { successMessage: "Encounter skipped" },
    );
    eventStore.clearEvent();
    router.push("/");
  } catch (error) {
    console.error("Failed to skip encounter:", error);
  }
};

const proceedToNext = () => {
  eventStore.clearEvent();
  router.push("/");
};

onMounted(async () => {
  if (!userStore.userId) return;
  loading.value = true;
  try {
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
    await inventoryStore.fetchPlayerDice(userStore.userId);
    await inventoryStore.fetchPlayerItems(userStore.userId);

    if (eventStore.isWildEncounter && eventStore.wildEncounterData) {
      wildElemental.value = await elementalsStore.getElementalById(
        eventStore.wildEncounterData.elemental_id,
      );

      detectedCombinations.value = (
        farkleState.value?.detected_combinations ?? []
      ) as Combination[];
    }
  } catch (error) {
    console.error("Failed to load encounter data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
