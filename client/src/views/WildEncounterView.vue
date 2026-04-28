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
          <div
            v-if="hasReachedRosterCap && !captureResult"
            class="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
          >
            {{ t("wild.roster_limit_reached", { max: MAX_PLAYER_ELEMENTALS }) }}
          </div>

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
            :disabled="isBusy || hasReachedRosterCap"
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
            :is-player-party-droppable="!!farkleState && !farkleState?.busted && !isBusy"
            :highlighted-player-indices="highlightedDroppablePartyIndices"
            :player-infusion-elements="playerInfusionElements"
            @player-party-drop="handleDropToParty"
          >
            <template #centerActions>
              <WildEncounterTurnPanel
                :round="wildBattleState.round"
                :rounds-resolved="roundsResolved"
                :instruction="wildTurnInstruction"
                :round-status-message="roundStatusMessage"
                :dice="farkleState?.dice ?? []"
                :combinations="detectedCombinations"
                :force-animate-indices="forcedAnimationIndices"
                :force-animate-nonce="forceAnimationNonce"
                :is-busted="!!farkleState?.busted"
                :is-busy="isBusy"
                :can-roll="canRoll && !hasReachedRosterCap"
                :can-roll-remaining="canRollRemaining && !hasReachedRosterCap"
                :can-end-turn="canEndTurn && !hasReachedRosterCap"
                :current-round-label="t('wild.current_round')"
                :resolved-rounds-label="t('wild.resolved_rounds')"
                :rolling-label="t('wild.rolling')"
                :start-round-label="t('wild.start_round')"
                :roll-remaining-label="t('wild.roll_remaining')"
                :deploy-resolve-label="t('wild.deploy_resolve')"
                @roll="handleRoll"
                @end-turn="handleEndTurn"
                @die-drag-start="handleDieDragStart"
                @die-drag-end="handleDieDragEnd"
                @rolling-start="isDiceAnimating = true"
                @rolling-complete="isDiceAnimating = false"
              />
            </template>
          </BattleArena>

          <WildEncounterRoundSummary
            v-if="lastRoundSummary"
            :title="t('wild.round_summary', { round: lastRoundSummary.round })"
            :first-attacker-label="t('wild.first_attacker')"
            :first-attacker-value="lastRoundSummary.firstAttacker === 'player' ? t('wild.attacker_you') : t('wild.attacker_wild')"
            :player-damage-label="t('wild.you_took')"
            :opponent-damage-label="t('wild.wild_took')"
            :damage-unit-label="t('wild.damage')"
            :player-damage="lastRoundSummary.playerDamageTaken"
            :opponent-damage="lastRoundSummary.opponentDamageTaken"
          />
        </div>

        <div class="space-y-4 w-full max-w-2xl">
          <WildEncounterCaptureResult
            v-if="captureResult"
            :success="captureResult.success"
            :message="captureResult.message"
            :elemental-caught="captureResult.success ? captureResult.elemental_caught ?? null : null"
            :success-title="t('wild.capture_success')"
            :failure-title="t('wild.capture_failed')"
            :proceed-label="t('wild.proceed')"
            :level-label="(level) => t('wild.level', { level })"
            @proceed="proceedToNext"
          />
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
import { useUIStore } from "@/stores/ui";
import ElementalCard from "@/components/game/ElementalCard.vue";
import BattleArena from "@/components/game/BattleArena.vue";
import WildEncounterCaptureResult from "@/components/game/WildEncounterCaptureResult.vue";
import WildEncounterRoundSummary from "@/components/game/WildEncounterRoundSummary.vue";
import WildEncounterTurnPanel from "@/components/game/WildEncounterTurnPanel.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";
import { useI18n } from "@/i18n";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const uiStore = useUIStore();
const { t, locale } = useI18n();
const MAX_PLAYER_ELEMENTALS = 15;

const loading = ref(false);
const isActing = ref(false);
const isDiceAnimating = ref(false);
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
            "Используйте перебросы и назначения костей, чтобы направлять бонусы под текущую цель и продержаться достаточно долго для завершения боя.",
          bullets: [
            "Перетаскивайте нераспределенные кости на живых элементалей, чтобы сразу закреплять их эффекты.",
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
            "Assign dice directly onto alive elementals to shape combinations and survive long enough to close the fight.",
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
const canRollRemaining = computed(
  () =>
    !!farkleState.value &&
    !farkleState.value.busted &&
    farkleState.value.phase !== "done" &&
    farkleState.value.dice.some((die) => !die.is_set_aside),
);
const canEndTurn = computed(() => {
  if (!farkleState.value) return false;
  if (farkleState.value.busted) return true;
  return Boolean(farkleState.value.can_commit);
});
const hasReachedRosterCap = computed(
  () => elementalsStore.playerElementals.length >= MAX_PLAYER_ELEMENTALS,
);

const isBusy = computed(() => isActing.value || isDiceAnimating.value);

const wildArenaStatusLabel = computed(() => {
  if (!wildBattleState.value) return "";
  return `${t("common.round")} ${wildBattleState.value.round} - ${roundsResolved.value} ${t("battle.rounds_resolved_short")}`;
});

const wildTurnInstruction = computed(() => {
  if (hasReachedRosterCap.value) {
    return t("wild.roster_limit_reached", { max: MAX_PLAYER_ELEMENTALS });
  }
  if (isBusy.value) return t("battle.instruction_wait");
  if (farkleState.value?.busted) return t("battle.instruction_bust");
  if (!farkleState.value || farkleState.value.dice.length === 0) {
    return t("battle.instruction_roll");
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
};

const notifyRosterCapReached = () => {
  uiStore.showToast(
    t("wild.roster_limit_reached", { max: MAX_PLAYER_ELEMENTALS }),
    "error",
  );
};

const handleRoll = async () => {
  if (!userStore.userId) return;
  if (hasReachedRosterCap.value) {
    notifyRosterCapReached();
    return;
  }
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

const playerInfusionElements = computed<Record<number, string[]>>(() => {
  const infused: Record<number, string[]> = {};
  farkleState.value?.dice.forEach((die) => {
    if (
      die.is_assigned &&
      typeof die.assigned_to_party_index === "number" &&
      typeof die.current_result === "string"
    ) {
      infused[die.assigned_to_party_index] ??= [];
      infused[die.assigned_to_party_index].push(die.current_result);
    }
  });
  return infused;
});

const highlightedDroppablePartyIndices = computed(() => {
  if (draggingDieIndex.value === null || !wildBattleState.value) return [] as number[];
  return wildBattleState.value.player_party
    .map((member, index) => ({ member, index }))
    .filter(
      ({ member }) =>
        !member.is_destroyed,
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
    updateFromTurnResult(response?.result);
  } catch (error) {
    console.error("Failed wild encounter assign:", error);
  } finally {
    isActing.value = false;
  }
};

const handleEndTurn = async () => {
  if (!userStore.userId) return;
  if (hasReachedRosterCap.value) {
    notifyRosterCapReached();
    return;
  }
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
