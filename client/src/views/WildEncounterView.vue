<template>
  <div class="container mx-auto p-4 md:p-6 space-y-6">
    <ViewOnboardingModal
      v-if="showOnboarding"
      :title="t('wild.title')"
      :subtitle="onboardingSubtitle"
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <div v-if="loading" class="text-center py-12">
      <p class="text-xl font-semibold">{{ t("wild.loading") }}</p>
    </div>

    <div
      v-else-if="
        (!eventStore.isEventActive || !eventStore.isWildEncounter) &&
        !captureResult
      "
      class="text-center py-12"
    >
      <h1 class="text-3xl font-bold mb-4">{{ t("common.no_active_event") }}</h1>
      <p class="text-muted-foreground mb-6">
        {{ t("wild.trigger_event_hint") }}
      </p>
      <button
        @click="router.push('/')"
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
      >
        {{ t("common.back_to_dashboard") }}
      </button>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span class="text-xl">&larr;</span>
          <span class="font-semibold">{{ t("common.back") }}</span>
        </button>
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-2">{{ t("wild.title") }}</h1>
          <div
            v-if="!captureResult"
            class="inline-block px-4 py-2 rounded-lg font-semibold"
            :class="
              getDifficultyClass(eventStore.wildEncounterData?.capture_difficulty)
            "
          >
            {{ t("wild.capture_difficulty") }}
            {{ eventStore.wildEncounterData?.capture_difficulty?.toUpperCase() }}
          </div>
        </div>
        <span class="w-14" aria-hidden="true"></span>
      </div>

      <div class="flex flex-col gap-6 items-center">
        <div class="space-y-4 flex flex-col w-full max-w-md">
          <ElementalCard
            v-if="wildElemental && canRoll && !captureResult && !wildBattleState"
            :elemental="wildElemental"
            :show-stats="false"
            :show-description="true"
          />

          <div
            v-if="encounterElement && !captureResult"
            class="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card/60 px-3 py-2"
          >
            <span class="text-lg">{{ getElementEmoji(encounterElement) }}</span>
            <span class="text-sm text-muted-foreground">{{ t("wild.encounter_element") }}</span>
            <span class="text-sm font-semibold capitalize">{{ encounterElement }}</span>
          </div>

          <button
            v-if="canRoll && !captureResult && !wildBattleState"
            @click="handleRoll"
            :disabled="isBusy"
            class="px-7 py-3 bg-primary text-primary-foreground rounded-full font-extrabold tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
          >
            {{ isBusy ? t("wild.rolling") : t("wild.start_round") }}
          </button>
        </div>

        <div
          v-if="wildBattleState && !captureResult"
          class="w-full max-w-6xl space-y-3"
        >
          <BattleArena
            :player-party="wildBattleState.player_party"
            :opponent-party="wildBattleState.enemy_party"
            :opponent-name="wildElemental?.name ?? t('wild.opponent_name')"
            :phase-label="t('wild.title')"
            :status-label="wildArenaStatusLabel"
            :center-title="t('battle.arena_center')"
            :is-player-party-droppable="!!farkleState && !isBusy"
            :highlighted-player-indices="highlightedDroppablePartyIndices"
            :player-infusion-elements="playerInfusionElements"
            @player-party-drop="handleDropToParty"
          >
            <template #centerActions>
              <div class="w-full min-w-[18rem] max-w-md space-y-3 rounded-xl border border-border/70 bg-card/65 p-3 shadow-sm">
                <div class="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                  <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <p>
                      {{ t("wild.current_round") }}
                      <span class="text-foreground">{{ wildBattleState.round }}</span>
                    </p>
                    <p>
                      {{ t("wild.resolved_rounds") }}
                      <span class="text-foreground">{{ roundsResolved }}</span>
                    </p>
                  </div>
                  <p class="mt-1 text-sm font-semibold">
                    {{ wildTurnInstruction }}
                  </p>
                </div>

                <p
                  v-if="roundStatusMessage"
                  class="text-sm text-muted-foreground"
                >
                  {{ roundStatusMessage }}
                </p>

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
                    @die-drag-start="handleDieDragStart"
                    @die-drag-end="handleDieDragEnd"
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

                <div v-if="!isBusy" class="flex flex-wrap justify-center gap-3">
                  <button
                    v-if="canRoll"
                    @click="handleRoll"
                    :disabled="isBusy"
                    class="px-7 py-3 bg-primary text-primary-foreground rounded-full font-extrabold tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
                  >
                    {{ isBusy ? t("wild.rolling") : t("wild.start_round") }}
                  </button>

                  <button
                    v-if="canSetAside"
                    @click="handleSetAside"
                    :disabled="isBusy || selectedDiceIndices.length === 0"
                    class="rounded-lg border border-green-500 bg-green-500/20 px-4 py-2 font-bold text-foreground hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {{ t("battle.set_aside_selected") }}
                  </button>

                  <button
                    v-if="canRollRemaining"
                    @click="handleRoll"
                    :disabled="isBusy"
                    class="rounded-lg border border-sky-500 bg-sky-500/20 px-4 py-2 font-bold text-foreground hover:bg-sky-500/30 disabled:opacity-50"
                  >
                    {{ t("wild.roll_remaining") }}
                  </button>
                </div>

                <div v-if="canEndTurn && !isBusy" class="flex justify-center">
                  <button
                    @click="handleEndTurn"
                    :disabled="isBusy"
                    class="w-full rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-card disabled:opacity-50"
                  >
                    {{ t("wild.deploy_resolve") }}
                  </button>
                </div>
              </div>
            </template>
          </BattleArena>

          <div
            v-if="lastRoundSummary"
            class="rounded-xl border border-border bg-card/55 p-3 text-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {{ t("wild.round_summary", { round: lastRoundSummary.round }) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ t("wild.first_attacker") }}
                <span class="font-semibold text-foreground">{{
                  lastRoundSummary.firstAttacker === "player"
                    ? t("wild.attacker_you")
                    : t("wild.attacker_wild")
                }}</span>
              </p>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div class="rounded-md bg-background/45 p-2">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {{ t("wild.you_took") }}
                </p>
                <p class="font-semibold text-red-300">
                  {{ lastRoundSummary.playerDamageTaken }} {{ t("wild.damage") }}
                </p>
              </div>
              <div class="rounded-md bg-background/45 p-2">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {{ t("wild.wild_took") }}
                </p>
                <p class="font-semibold text-blue-300">
                  {{ lastRoundSummary.opponentDamageTaken }} {{ t("wild.damage") }}
                </p>
              </div>
            </div>
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
              {{
                captureResult.success
                  ? t("wild.capture_success")
                  : t("wild.capture_failed")
              }}
            </h2>
            <p class="text-lg mb-2">{{ captureResult.message }}</p>

            <div
              v-if="captureResult.success && captureResult.elemental_caught"
              class="mt-4 p-4 bg-background/50 rounded-lg"
            >
              <p class="font-bold text-xl">
                {{ captureResult.elemental_caught.name }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{
                  t("wild.level", { level: captureResult.elemental_caught.level })
                }}
              </p>
            </div>

            <button
              @click="proceedToNext"
              class="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
            >
              {{ t("wild.proceed") }}
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="!captureResult"
        @click="handleSkipEncounter"
        :disabled="isBusy || !!captureResult"
        class="mx-auto block w-fit px-6 py-3 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all disabled:opacity-50"
      >
        {{ t("wild.skip_encounter") }}
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
import { useI18n } from "@/i18n";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const { t, locale } = useI18n();

const loading = ref(false);
const isActing = ref(false);
const isDiceAnimating = ref(false);
const selectedDiceIndices = ref<number[]>([]);
const draggingDieIndex = ref<number | null>(null);
const forceAnimationNonce = ref(0);
const forcedAnimationIndices = ref<number[]>([]);
const captureResult = ref<any>(null);
const roundStatusMessage = ref<string | null>(null);
const detectedCombinations = ref<Combination[]>([]);
const wildElemental = ref<any>(null);
const showOnboarding = ref(false);
const onboardingStorageScope = "wild-encounter-v1";

const onboardingSubtitle = computed(() =>
  locale.value === "ru"
    ? "Показывается один раз при первом открытии Дикой встречи."
    : "Shown once when you first open Wild Encounter.",
);

const onboardingSteps = computed(() =>
  locale.value === "ru"
    ? [
        {
          title: "Поток поимки",
          description:
            "Дикие встречи теперь используют боевые раунды. Вы разыгрываете раунды через Farkle, затем симуляция боя определяет исход поимки.",
          bullets: [
            "Запустите дикую встречу через Текущее событие.",
            "Выставляйтесь и завершайте раунды, пока бой встречи не закончится.",
            "Если дикий элементаль побежден, поимка успешна.",
          ],
        },
        {
          title: "Решения в ходе встречи",
          description:
            "Используйте перебросы и откладывание костей, чтобы направлять бонусы под текущую цель и продержаться достаточно долго для завершения боя.",
          bullets: [
            "Откладывайте лучшие комбинации или возможности выбранного отложенного элемента.",
            "Bust сбрасывает бонусы хода, поэтому выставляйтесь в подходящий момент.",
            "Смотрите сводки раундов, чтобы скорректировать следующий ход.",
          ],
        },
      ]
    : [
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
            "Assign dice directly onto alive elementals or set them aside to shape combinations and survive long enough to close the fight.",
          bullets: [
            "Drag any unassigned die onto an alive elemental to assign and deploy it immediately.",
            "Bust removes turn bonuses, so commit deployment at the right time.",
            "Review round summaries to adjust next turn choices.",
          ],
        },
      ],
);

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
  target: "unit";
  damage: number;
};

type WildBattleState = {
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
        entry.target === "unit" &&
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
  const playerDamageTaken = lastRoundLogs.value
    .filter((entry) => entry.side === "opponent" && entry.target === "unit")
    .reduce((sum, entry) => sum + entry.damage, 0);
  const opponentDamageTaken = lastRoundLogs.value
    .filter((entry) => entry.side === "player" && entry.target === "unit")
    .reduce((sum, entry) => sum + entry.damage, 0);

  return {
    round: lastResolvedRoundNumber.value,
    firstAttacker,
    playerDamageTaken,
    opponentDamageTaken,
  };
});

const encounterElement = computed(
  () =>
    eventStore.wildEncounterData?.encounter_element ??
    wildElemental.value?.element_types?.[0] ??
    null,
);

const canRoll = computed(
  () => !farkleState.value || farkleState.value.phase === "initial_roll",
);
const canSetAside = computed(
  () =>
    !!farkleState.value &&
    selectedDiceIndices.value.length > 0,
);
const canRollRemaining = computed(
  () =>
    !!farkleState.value &&
    farkleState.value.dice.some((die) => !die.is_set_aside),
);
const canEndTurn = computed(() => {
  if (!farkleState.value) return false;
  if (farkleState.value.busted) return true;
  return Boolean(farkleState.value.can_commit);
});

const isBusy = computed(() => isActing.value || isDiceAnimating.value);

const wildArenaStatusLabel = computed(() => {
  if (!wildBattleState.value) return "";
  return `${t("common.round")} ${wildBattleState.value.round} - ${roundsResolved.value} ${t("battle.rounds_resolved_short")}`;
});

const wildTurnInstruction = computed(() => {
  if (isBusy.value) return t("battle.instruction_wait");
  if (farkleState.value?.busted) return t("battle.instruction_bust");
  if (!farkleState.value || farkleState.value.dice.length === 0) {
    return t("battle.instruction_roll");
  }
  if (selectedDiceIndices.value.length > 0) {
    return t("battle.instruction_set_aside");
  }
  if (!canEndTurn.value) {
    return t("battle.instruction_assign");
  }
  return t("battle.instruction_deploy");
});

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🏔️",
  air: "💨",
  lightning: "⚡",
};

const getElementEmoji = (element: string): string =>
  ELEMENT_EMOJIS[element] ?? "❓";

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

const handleSetAside = async () => {
  if (!userStore.userId || selectedDiceIndices.value.length === 0) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleSetAside(
      userStore.userId,
      [...selectedDiceIndices.value],
    );
    selectedDiceIndices.value = [];
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter set aside:", error);
  } finally {
    isActing.value = false;
  }
};

const assignedPartyIndexSet = computed(() => {
  const assigned = new Set<number>();
  farkleState.value?.dice.forEach((die) => {
    if (die.is_assigned && typeof die.assigned_to_party_index === "number") {
      assigned.add(die.assigned_to_party_index);
    }
  });
  return assigned;
});

const playerInfusionElements = computed<Record<number, string>>(() => {
  const infused: Record<number, string> = {};
  farkleState.value?.dice.forEach((die) => {
    if (
      die.is_assigned &&
      typeof die.assigned_to_party_index === "number" &&
      typeof die.current_result === "string"
    ) {
      infused[die.assigned_to_party_index] = die.current_result;
    }
  });
  return infused;
});

const highlightedDroppablePartyIndices = computed(() => {
  if (draggingDieIndex.value === null || !wildBattleState.value) return [] as number[];
  return wildBattleState.value.player_party
    .map((member, index) => ({ member, index }))
    .filter(
      ({ member, index }) =>
        !member.is_destroyed && !assignedPartyIndexSet.value.has(index),
    )
    .map(({ index }) => index);
});

const handleDieDragStart = (dieIndex: number) => {
  draggingDieIndex.value = dieIndex;
};

const handleDieDragEnd = () => {
  draggingDieIndex.value = null;
};

const handleDropToParty = async (partyIndex: number) => {
  if (!userStore.userId) return;
  const dieIndex = draggingDieIndex.value;
  draggingDieIndex.value = null;
  if (dieIndex === null) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleAssign(
      userStore.userId,
      dieIndex,
      partyIndex,
    );
    selectedDiceIndices.value = selectedDiceIndices.value.filter((index) => index !== dieIndex);
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter assign:", error);
  } finally {
    isActing.value = false;
  }
};

const handleEndTurn = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.wildEncounterFarkleCommit(
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

    roundStatusMessage.value = turnResult?.result?.message ?? t("wild.battle_continues");

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

    }
  } catch (error) {
    console.error("Failed to load encounter data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
