<template>
  <div class="container mx-auto p-4 md:p-6 space-y-6">
    <ViewOnboardingModal
      v-if="showOnboarding"
      title="Wild Encounter Basics"
      subtitle="Shown once when you first open Wild Encounter."
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <div v-if="loading" class="text-center py-12">
      <p class="text-xl font-semibold">Loading encounter...</p>
    </div>

    <div
      v-else-if="
        (!eventStore.isEventActive || !eventStore.isWildEncounter) &&
        !captureResult
      "
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
      <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span class="text-xl">&larr;</span>
          <span class="font-semibold">Back</span>
        </button>
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-2">Wild Encounter</h1>
          <div
            v-if="!captureResult"
            class="inline-block px-4 py-2 rounded-lg font-semibold"
            :class="
              getDifficultyClass(eventStore.wildEncounterData?.capture_difficulty)
            "
          >
            Capture difficulty:
            {{ eventStore.wildEncounterData?.capture_difficulty?.toUpperCase() }}
          </div>
        </div>
        <span class="w-14" aria-hidden="true"></span>
      </div>

      <div class="flex flex-col gap-6 items-center">
        <div class="space-y-4 flex flex-col w-full max-w-md">
          <ElementalCard
            v-if="wildElemental && canRoll && !captureResult"
            :elemental="wildElemental"
            :show-stats="false"
            :show-description="true"
          />

          <div
            v-if="encounterElement && !captureResult"
            class="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card/60 px-3 py-2"
          >
            <span class="text-lg">{{ getElementEmoji(encounterElement) }}</span>
            <span class="text-sm text-muted-foreground">Encounter element:</span>
            <span class="text-sm font-semibold capitalize">{{ encounterElement }}</span>
          </div>

          <div
            v-if="chosenSetAsideElement && !captureResult"
            class="inline-flex items-center gap-2 self-start rounded-lg border border-yellow-500/60 bg-card/60 px-3 py-2"
          >
            <span class="text-lg">{{ getElementEmoji(chosenSetAsideElement) }}</span>
            <span class="text-sm text-muted-foreground">Set-aside element:</span>
            <span class="text-sm font-semibold capitalize">{{ chosenSetAsideElement }}</span>
          </div>

          <div v-if="needsSetAsideSelection && !captureResult" class="space-y-3">
            <p class="text-sm text-muted-foreground">
              Pick one element from your party for set-aside bonuses.
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="el in selectablePartyElements"
                :key="el"
                @click="handleChooseSetAsideElement(el)"
                :disabled="isBusy"
                class="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl border-2 border-border hover:border-primary transition-all disabled:opacity-50 bg-card"
              >
                <span class="text-2xl">{{ getElementEmoji(el) }}</span>
                <span class="text-sm font-semibold capitalize">{{ el }}</span>
                <span class="text-[11px] text-muted-foreground leading-tight">
                  {{ getPartyCountForElement(el) }} in party
                </span>
              </button>
            </div>
          </div>

          <button
            v-if="canRoll && !captureResult && !needsSetAsideSelection"
            @click="handleRoll"
            :disabled="isBusy"
            class="px-7 py-3 bg-primary text-primary-foreground rounded-full font-extrabold tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
          >
            {{ isBusy ? "ROLLING..." : "Start round" }}
          </button>
        </div>

        <div
          v-if="wildBattleState && !captureResult"
          class="w-full max-w-6xl space-y-3"
        >
          <BattleArena
            :player-party="wildBattleState.player_party"
            :opponent-party="wildBattleState.enemy_party"
            :player-health="wildBattleState.player_health"
            :opponent-health="wildBattleState.enemy_health"
            :opponent-name="wildElemental?.name ?? 'Wild Elemental'"
          />

          <div class="rounded-xl border border-border bg-card/40 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>
                Current round:
                <span class="font-semibold">{{ wildBattleState.round }}</span>
              </p>
              <p>
                Resolved rounds:
                <span class="font-semibold">{{ roundsResolved }}</span>
              </p>
            </div>
            <p v-if="roundStatusMessage" class="mt-2 text-sm text-muted-foreground">
              {{ roundStatusMessage }}
            </p>
          </div>

          <div
            v-if="lastRoundSummary"
            class="rounded-xl border border-border bg-card/40 p-4 space-y-1.5 text-sm"
          >
            <p class="text-xs uppercase tracking-wide text-muted-foreground">
              Round {{ lastRoundSummary.round }} summary
            </p>
            <p>
              First attacker:
              <span class="font-semibold">{{
                lastRoundSummary.firstAttacker === "player" ? "You" : "Wild"
              }}</span>
            </p>
            <p>
              You took
              <span class="font-semibold text-red-300">{{
                lastRoundSummary.playerHealthDamage
              }}</span>
              direct HP damage.
            </p>
            <p>
              Wild took
              <span class="font-semibold text-blue-300">{{
                lastRoundSummary.opponentHealthDamage
              }}</span>
              direct HP damage.
            </p>
          </div>
        </div>

        <div class="space-y-4 w-full max-w-2xl">
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
              {{ captureResult.success ? "Capture Successful" : "Capture Failed" }}
            </h2>
            <p class="text-lg mb-2">{{ captureResult.message }}</p>
            <p v-if="finalHealthSummary" class="text-sm text-muted-foreground">
              Final HP: You {{ finalHealthSummary.player }} / Wild
              {{ finalHealthSummary.enemy }}
            </p>

            <div
              v-if="captureResult.success && captureResult.elemental_caught"
              class="mt-4 p-4 bg-background/50 rounded-lg"
            >
              <p class="font-bold text-xl">
                {{ captureResult.elemental_caught.name }}
              </p>
              <p class="text-sm text-muted-foreground">
                Level {{ captureResult.elemental_caught.level }}
              </p>
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
              <div class="flex justify-end">
                <DiceCombinationsHint />
              </div>

              <FarkleDiceRow
                :dice="farkleState.dice"
                :selected-indices="selectedDiceIndices"
                :force-animate-indices="forcedAnimationIndices"
                :force-animate-nonce="forceAnimationNonce"
                @toggle-select="toggleDiceSelection"
                @rolling-start="isDiceAnimating = true"
                @rolling-complete="isDiceAnimating = false"
              />

              <CombinationDisplay
                v-if="!isBusy"
                :combinations="detectedCombinations"
                :selectable="false"
                :show-empty="true"
              />
            </div>

            <div class="space-y-3">
              <div v-if="!isBusy" class="flex flex-wrap gap-3">
                <button
                  v-if="canReroll"
                  @click="handleReroll"
                  :disabled="isBusy || selectedDiceIndices.length === 0"
                  class="px-4 py-2 bg-yellow-500/20 text-foreground border border-yellow-500 rounded-lg font-bold hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                >
                  Reroll selected ({{ selectedDiceIndices.length }})
                </button>

                <button
                  v-if="canSetAside"
                  @click="handleSetAside"
                  :disabled="isBusy"
                  class="px-4 py-2 bg-green-500/20 text-foreground border border-green-500 rounded-lg font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                >
                  Set aside best combo
                </button>

                <button
                  v-if="canSetAsideTargetElement"
                  @click="handleSetAsideTargetElement"
                  :disabled="isBusy"
                  class="px-4 py-2 bg-blue-500/20 text-foreground border border-blue-500 rounded-lg font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50"
                >
                  Set aside chosen element
                </button>

                <button
                  v-if="canContinue"
                  @click="handleContinue"
                  :disabled="isBusy"
                  class="px-4 py-2 bg-sky-500/20 text-foreground border border-sky-500 rounded-lg font-bold hover:bg-sky-500/30 transition-all disabled:opacity-50"
                >
                  Roll remaining dice
                </button>
              </div>

              <button
                v-if="canEndTurn && !isBusy"
                @click="handleEndTurn"
                :disabled="isBusy"
                :class="
                  isCaptureSetAsideBonusActive
                    ? 'px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 border border-emerald-400 bg-emerald-500/15 text-foreground hover:bg-emerald-500/25 shadow-md shadow-emerald-500/20'
                    : 'px-6 py-3 bg-card border border-border rounded-lg font-semibold text-foreground hover:bg-card/80 transition-all disabled:opacity-50'
                "
              >
                Deploy &amp; Resolve Round
              </button>
            </div>
          </template>
        </div>
      </div>

      <button
        v-if="!captureResult"
        @click="handleSkipEncounter"
        :disabled="isBusy || !!captureResult"
        class="mx-auto block w-fit px-6 py-3 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all disabled:opacity-50"
      >
        Skip Encounter
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  useEventStore,
  type BattlePartyMember,
  type Combination,
  type WildEncounterFarkleState,
} from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import ElementalCard from "@/components/game/ElementalCard.vue";
import BattleArena from "@/components/game/BattleArena.vue";
import FarkleDiceRow from "@/components/game/FarkleDiceRow.vue";
import CombinationDisplay from "@/components/game/CombinationDisplay.vue";
import DiceCombinationsHint from "@/components/game/DiceCombinationsHint.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();

const loading = ref(false);
const isActing = ref(false);
const isDiceAnimating = ref(false);
const selectedDiceIndices = ref<number[]>([]);
const forceAnimationNonce = ref(0);
const forcedAnimationIndices = ref<number[]>([]);
const captureResult = ref<any>(null);
const roundStatusMessage = ref<string | null>(null);
const detectedCombinations = ref<Combination[]>([]);
const wildElemental = ref<any>(null);
const showOnboarding = ref(false);
const onboardingStorageScope = "wild-encounter-v1";

const onboardingSteps = [
  {
    title: "Capture flow",
    description:
      "Wild encounters now use battle rounds. You resolve rounds with Farkle actions, then battle simulation determines capture outcome.",
    bullets: [
      "Start a wild encounter from Current Event.",
      "Deploy and resolve rounds until the encounter battle ends.",
      "If the wild elemental is defeated, capture succeeds.",
    ],
  },
  {
    title: "Encounter turn decisions",
    description:
      "Use rerolls and set-aside choices to bias bonuses toward your current objective and survive long enough to close the fight.",
    bullets: [
      "Set aside best combinations or chosen set-aside element opportunities.",
      "Bust removes turn bonuses, so commit deployment at the right time.",
      "Review round summaries to adjust next turn choices.",
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

type WildBattleCombatLogEntry = {
  round: number;
  step: number;
  side: "player" | "opponent";
  target: "unit" | "player";
  damage: number;
};

type WildBattleState = {
  player_health: number;
  enemy_health: number;
  player_party: BattlePartyMember[];
  enemy_party: BattlePartyMember[];
  combat_log: WildBattleCombatLogEntry[];
  round: number;
};

const farkleState = computed(
  () =>
    (eventStore.wildEncounterData?.farkle_state as
      | WildEncounterFarkleState
      | undefined) ?? null,
);

const wildBattleState = computed<WildBattleState | null>(() => {
  const data = eventStore.wildEncounterData as
    | ({ wild_battle_state?: WildBattleState } & Record<string, unknown>)
    | null;
  return data?.wild_battle_state ?? null;
});

const combatLogEntries = computed<WildBattleCombatLogEntry[]>(() => {
  const raw = (wildBattleState.value?.combat_log ?? []) as Array<
    Partial<WildBattleCombatLogEntry>
  >;
  return raw
    .filter(
      (entry): entry is WildBattleCombatLogEntry =>
        typeof entry.round === "number" &&
        typeof entry.step === "number" &&
        (entry.side === "player" || entry.side === "opponent") &&
        (entry.target === "unit" || entry.target === "player") &&
        typeof entry.damage === "number",
    )
    .sort((a, b) => a.round - b.round || a.step - b.step);
});

const roundsResolved = computed(() => {
  return new Set(combatLogEntries.value.map((entry) => entry.round)).size;
});

const lastResolvedRoundNumber = computed<number | null>(() => {
  if (combatLogEntries.value.length === 0) return null;
  return Math.max(...combatLogEntries.value.map((entry) => entry.round));
});

const lastRoundLogs = computed(() => {
  if (!lastResolvedRoundNumber.value) return [] as WildBattleCombatLogEntry[];
  return combatLogEntries.value.filter(
    (entry) => entry.round === lastResolvedRoundNumber.value,
  );
});

const lastRoundSummary = computed(() => {
  if (lastRoundLogs.value.length === 0 || !lastResolvedRoundNumber.value) {
    return null;
  }
  const firstAttacker = lastRoundLogs.value[0].side;
  const playerHealthDamage = lastRoundLogs.value
    .filter((entry) => entry.side === "opponent" && entry.target === "player")
    .reduce((sum, entry) => sum + entry.damage, 0);
  const opponentHealthDamage = lastRoundLogs.value
    .filter((entry) => entry.side === "player" && entry.target === "player")
    .reduce((sum, entry) => sum + entry.damage, 0);

  return {
    round: lastResolvedRoundNumber.value,
    firstAttacker,
    playerHealthDamage,
    opponentHealthDamage,
  };
});

const finalHealthSummary = computed(() => {
  if (!captureResult.value || !wildBattleState.value) return null;
  return {
    player: wildBattleState.value.player_health,
    enemy: wildBattleState.value.enemy_health,
  };
});

const targetElement = computed(
  () => eventStore.wildEncounterData?.set_aside_element ?? null,
);

const encounterElement = computed(
  () =>
    eventStore.wildEncounterData?.encounter_element ??
    wildElemental.value?.element_types?.[0] ??
    null,
);

const chosenSetAsideElement = computed(() => targetElement.value);

const partyElementCounts = computed(() => {
  const counts: Record<string, number> = {};
  const fromBattleState =
    (wildBattleState.value?.player_party as Array<{ element?: string }> | undefined) ?? [];

  if (fromBattleState.length > 0) {
    fromBattleState.forEach((member) => {
      const element = member.element;
      if (!element) return;
      counts[element] = (counts[element] ?? 0) + 1;
    });
    return counts;
  }

  elementalsStore.activeParty.forEach((member: any) => {
    const element = member.element_types?.[0] ?? member.element;
    if (!element) return;
    counts[element] = (counts[element] ?? 0) + 1;
  });
  return counts;
});

const selectablePartyElements = computed(() => Object.keys(partyElementCounts.value));

const needsSetAsideSelection = computed(() => {
  if (!eventStore.isWildEncounter || captureResult.value) return false;
  if (chosenSetAsideElement.value) return false;
  return !eventStore.wildEncounterData?.farkle_session_id;
});

const canRoll = computed(
  () => !farkleState.value || farkleState.value.phase === "initial_roll",
);
const canReroll = computed(
  () =>
    farkleState.value?.phase === "can_reroll" &&
    !farkleState.value?.has_used_reroll,
);
const availableSetAsideCombinations = computed(() => {
  if (!farkleState.value) return [] as Combination[];

  return detectedCombinations.value.filter((combo) =>
    combo.dice_indices.some(
      (index) => !farkleState.value?.dice[index]?.is_set_aside,
    ),
  );
});
const canSetAside = computed(
  () =>
    !!farkleState.value &&
    ["can_reroll", "set_aside", "rolling_remaining"].includes(
      farkleState.value.phase,
    ) &&
    availableSetAsideCombinations.value.length > 0,
);
const canSetAsideTargetElement = computed(() => {
  if (!farkleState.value || !chosenSetAsideElement.value) return false;
  if (
    !["can_reroll", "set_aside", "rolling_remaining"].includes(
      farkleState.value.phase,
    )
  ) {
    return false;
  }
  return farkleState.value.dice.some(
    (d) => !d.is_set_aside && d.current_result === chosenSetAsideElement.value,
  );
});
const canContinue = computed(
  () =>
    !!farkleState.value &&
    farkleState.value.phase === "rolling_remaining" &&
    farkleState.value.dice.some((die) => !die.is_set_aside),
);
const canEndTurn = computed(() => {
  if (!farkleState.value) return false;
  if (farkleState.value.busted) return true;
  return (
    farkleState.value.active_combinations.length > 0 ||
    farkleState.value.set_aside_element_bonus !== null
  );
});

const isCaptureSetAsideBonusActive = computed(() => {
  if (!farkleState.value || !chosenSetAsideElement.value) return false;
  if (farkleState.value.busted) return false;

  const targetSetAsideCount = farkleState.value.dice.filter(
    (die) => die.is_set_aside && die.current_result === chosenSetAsideElement.value,
  ).length;
  const hasTargetCombination = farkleState.value.active_combinations.some(
    (combo) => combo.elements.includes(chosenSetAsideElement.value!),
  );

  return targetSetAsideCount >= 2 || hasTargetCombination;
});

const isBusy = computed(() => isActing.value || isDiceAnimating.value);

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🏔️",
  air: "💨",
  lightning: "⚡",
};

const getElementEmoji = (element: string): string =>
  ELEMENT_EMOJIS[element] ?? "❓";

const getPartyCountForElement = (element: string): number =>
  partyElementCounts.value[element] ?? 0;

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

const scheduleForcedDiceAnimation = (indices: number[]) => {
  if (indices.length > 0) {
    isDiceAnimating.value = true;
  }
  forcedAnimationIndices.value = [...indices];
  forceAnimationNonce.value += 1;
};

const updateFromTurnResult = (result: any) => {
  detectedCombinations.value = (result?.detected_combinations ??
    []) as Combination[];
  selectedDiceIndices.value = [];
};

const handleRoll = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  roundStatusMessage.value = null;
  try {
    const response = await eventStore.wildEncounterFarkleRoll(userStore.userId);
    const rolledDice = response?.result?.farkle_state?.dice ?? [];
    const indicesToAnimate = rolledDice
      .map((die: { is_set_aside: boolean }, index: number) => ({ die, index }))
      .filter(
        ({ die }: { die: { is_set_aside: boolean } }) => !die.is_set_aside,
      )
      .map(({ index }: { index: number }) => index);
    scheduleForcedDiceAnimation(indicesToAnimate);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter roll:", error);
  } finally {
    isActing.value = false;
  }
};

const handleReroll = async () => {
  if (!userStore.userId || selectedDiceIndices.value.length === 0) return;
  const indicesToAnimate = [...selectedDiceIndices.value];
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleReroll(
      userStore.userId,
      [...selectedDiceIndices.value],
    );
    scheduleForcedDiceAnimation(indicesToAnimate);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter reroll:", error);
  } finally {
    isActing.value = false;
  }
};

const handleSetAside = async () => {
  if (!userStore.userId || availableSetAsideCombinations.value.length === 0)
    return;
  isActing.value = true;
  const best = [...availableSetAsideCombinations.value].sort(
    (a, b) =>
      Object.values(b.bonuses).reduce((sum, v) => sum + Number(v), 0) -
      Object.values(a.bonuses).reduce((sum, v) => sum + Number(v), 0),
  )[0];
  try {
    const response = await eventStore.wildEncounterFarkleSetAside(
      userStore.userId,
      best.dice_indices,
      best.type === "one_for_all"
        ? (chosenSetAsideElement.value ?? undefined)
        : undefined,
    );
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter set aside:", error);
  } finally {
    isActing.value = false;
  }
};

const handleSetAsideTargetElement = async () => {
  if (!userStore.userId || !farkleState.value || !chosenSetAsideElement.value)
    return;
  const indices = farkleState.value.dice
    .map((d, i) => ({ d, i }))
    .filter(
      ({ d }) =>
        !d.is_set_aside && d.current_result === chosenSetAsideElement.value,
    )
    .map(({ i }) => i);
  if (indices.length < 1) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleSetAside(
      userStore.userId,
      indices,
    );
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed target-element set aside:", error);
  } finally {
    isActing.value = false;
  }
};

const handleChooseSetAsideElement = async (element: string) => {
  if (!userStore.userId || !element) return;
  isActing.value = true;
  try {
    await eventStore.chooseWildSetAsideElement(userStore.userId, element);
  } catch (error) {
    console.error("Failed to choose wild set-aside element:", error);
  } finally {
    isActing.value = false;
  }
};

const handleContinue = async () => {
  if (!userStore.userId) return;
  const indicesToAnimate = (farkleState.value?.dice ?? [])
    .map((die, index) => ({ die, index }))
    .filter(({ die }) => !die.is_set_aside)
    .map(({ index }) => index);
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleContinue(
      userStore.userId,
    );
    scheduleForcedDiceAnimation(indicesToAnimate);
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
    );

    const turnResult = response?.result;
    updateFromTurnResult(turnResult);

    if (turnResult?.is_resolved) {
      captureResult.value = turnResult.result ?? null;
      roundStatusMessage.value = null;

      if (captureResult.value?.success) {
        await elementalsStore.fetchPlayerElementals(userStore.userId);
      }
      return;
    }

    roundStatusMessage.value =
      turnResult?.result?.message ?? "Battle continues. Roll again.";

    await eventStore.initializeEventState(userStore.userId);
    detectedCombinations.value = (farkleState.value?.detected_combinations ??
      []) as Combination[];
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
    await eventStore.skipWildEncounter(userId);
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
  const onboardingKey = getOnboardingStorageKey();
  if (onboardingKey && !localStorage.getItem(onboardingKey)) {
    showOnboarding.value = true;
  }
  loading.value = true;
  try {
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
    await inventoryStore.fetchPlayerDice(userStore.userId);

    if (eventStore.isWildEncounter && eventStore.wildEncounterData) {
      wildElemental.value = await elementalsStore.getElementalById(
        eventStore.wildEncounterData.elemental_id,
      );

      detectedCombinations.value = (farkleState.value?.detected_combinations ??
        []) as Combination[];

      if (!eventStore.wildEncounterData.farkle_session_id) {
        const activePartyCount = elementalsStore.activeParty.length;
        if (activePartyCount === 1) {
          const onlyMember = elementalsStore.activeParty[0] as any;
          const autoElement =
            onlyMember?.element_types?.[0] ?? onlyMember?.element ?? null;
          if (autoElement) {
            await handleChooseSetAsideElement(autoElement);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to load encounter data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
