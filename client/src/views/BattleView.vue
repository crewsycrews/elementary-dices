<template>
  <div class="container mx-auto p-4 md:p-6 space-y-4 md:space-y-5">
    <ViewOnboardingModal
      v-if="showOnboarding"
      :title="t('battle.title')"
      :subtitle="onboardingSubtitle"
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-6xl mb-4">&#x23F3;</div>
      <p class="text-xl font-semibold">{{ t("battle.loading") }}</p>
    </div>

    <!-- No Active Event -->
    <div v-else-if="!eventStore.isEventActive" class="text-center py-12">
      <div class="text-6xl mb-4">&#x1F3B2;</div>
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

    <!-- Battle Content -->
    <div v-else class="space-y-4 md:space-y-5">
      <!-- Header -->
      <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span class="text-xl">&larr;</span>
          <span class="font-semibold">{{ t("common.back") }}</span>
        </button>

        <div class="text-center">
          <h1 class="text-3xl font-bold mb-1">{{ t("battle.title") }}</h1>
          <p class="text-muted-foreground">
            {{ t("battle.vs", { name: eventStore.pvpData?.opponent_name ?? t("battle.opponent_name") }) }}
            <span v-if="eventStore.pvpData?.potential_reward" class="ml-2">
              | {{ t("battle.reward", { reward: eventStore.pvpData?.potential_reward }) }}
            </span>
          </p>
        </div>

        <span class="w-14" aria-hidden="true"></span>
      </div>

      <BattleArena
        v-if="showBattleArena"
        :player-party="battle.playerParty.value"
        :opponent-party="battle.opponentParty.value"
        :opponent-name="opponentName"
        :phase-label="battleArenaPhaseLabel"
        :status-label="battleArenaStatusLabel"
        :center-title="t('battle.arena_center')"
        :show-targets="showArenaTargets"
        :target-lines="arenaTargetLines"
        :player-deployed-indices="arenaPlayerDeployedIndices"
        :opponent-deployed-indices="arenaOpponentDeployedIndices"
        :is-player-party-droppable="isArenaPlayerPartyDroppable"
        :highlighted-player-indices="arenaHighlightedPlayerIndices"
        :player-infusion-elements="arenaPlayerInfusionElements"
        @player-party-drop="handleDropToParty"
      >
        <template #centerActions>
          <div
            v-if="isTargetingPhase"
            class="w-full rounded-lg border border-border/70 bg-card/60 p-3 text-center shadow-sm"
          >
            <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {{ t("battle.phase1") }}
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ t("battle.targets_chosen") }}
            </p>
            <button
              @click="handleStartBattle"
              :disabled="isStarting"
              class="mt-3 w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {{ isStarting ? t("battle.starting") : t("battle.start") }}
            </button>
          </div>

          <BattlePlayerTurnPanel
            v-else-if="isPlayerTurnPhase"
            :round="battle.currentTurn.value"
            :instruction="battleTurnInstruction"
            :dice="battle.farkleDice.value"
            :combinations="battle.detectedCombinations.value"
            :force-animate-indices="forcedAnimationIndices"
            :force-animate-nonce="forceAnimationNonce"
            :is-busted="battle.isBusted.value"
            :is-busy="isBusy"
            :can-roll-remaining="canRollRemaining"
            :can-end-turn="canEndTurn"
            :roll-button-label="battleRollButtonLabel"
            :show-deploy-resolve="battle.canEndTurn.value || battle.farkleTurnState.value !== null"
            @roll="handleFarkleRoll"
            @end-turn="handleFarkleEndTurn"
            @die-drag-start="handleDieDragStart"
            @die-drag-end="handleDieDragEnd"
            @rolling-start="isDiceAnimating = true"
            @rolling-complete="isDiceAnimating = false"
          />

          <BattleResolvedSummary
            v-else-if="isResolvedPhase"
            :is-victory="isVictory"
            :resolved-message="resolvedMessage"
            :total-opponent-damage="totalOpponentDamage"
            :total-opponent-units-destroyed="totalOpponentUnitsDestroyed"
            :total-player-damage="totalPlayerDamage"
            :total-player-units-destroyed="totalPlayerUnitsDestroyed"
            :rounds-resolved="roundsResolved"
            :reward="battleReward"
            :downgraded-elemental="downgradedElemental"
            @proceed="proceedToNext"
          />
        </template>
      </BattleArena>

      <!-- ==================== PHASE: PLAYER TURN ==================== -->
      <template v-if="isPlayerTurnPhase">

        <!-- DICE RUSH Banner -->
        <div
          v-if="battle.isDiceRush.value"
          class="text-center py-3 bg-purple-500/20 rounded-xl border border-purple-500 animate-pulse"
        >
          <p class="text-lg font-bold text-purple-300">
            {{ t("battle.dice_rush") }}
          </p>
        </div>

        <!-- BUST Banner -->
        <div
          v-if="battle.isBusted.value"
          class="text-center py-3 bg-red-500/20 rounded-xl border border-red-500"
        >
          <p class="text-lg font-bold text-red-400">
            {{ t("battle.bust") }}
          </p>
          <p class="text-sm text-muted-foreground mt-1">
            {{ t("battle.deploy_now") }}
          </p>
        </div>
        <BattleRoundSummary
          v-if="lastRoundSummary"
          :title="t('battle.round_resolved', { round: lastRoundSummary.round })"
          :first-attacker-label="t('battle.first_attacker')"
          :first-attacker-value="lastRoundSummary.firstAttacker === 'player' ? t('battle.you') : opponentName"
          :your-deployment-label="t('battle.your_deployment')"
          :opponent-deployment-label="t('battle.opponent_deployment')"
          :impact-label="t('battle.round_impact')"
          :destroyed-label="t('battle.destroyed')"
          :player-deployment="deployedPlayerNames"
          :opponent-deployment="deployedOpponentNames"
          :player-damage-taken="lastRoundSummary.playerDamageTaken"
          :opponent-damage-taken="lastRoundSummary.opponentDamageTaken"
          :player-units-destroyed="lastRoundSummary.playerUnitsDestroyed"
          :opponent-units-destroyed="lastRoundSummary.opponentUnitsDestroyed"
        />

        <BattleOpponentTurnPanel
          v-if="battle.opponentTurnResult.value"
          :title="t('battle.opponent_private_roll')"
          :show-history-label="t('battle.show_combat_log')"
          :hide-history-label="t('battle.hide_combat_log')"
          :busted-label="t('battle.opponent_busted')"
          :history-groups="groupedBattleLogEntries"
          :has-history="groupedBattleLogEntries.length > 0"
          :is-history-open="isCombatHistoryOpen"
          :dice="battle.opponentTurnResult.value.dice"
          :is-busted="battle.opponentTurnResult.value.busted"
          :combination-label="battle.opponentTurnResult.value.combination ? getCombinationLabel(battle.opponentTurnResult.value.combination) : null"
          :get-element-emoji="getElementEmoji"
          :activated-label="(label) => t('battle.combination_activated', { label })"
          :format-entry="formatBattleLogEntry"
          :entry-class="battleLogEntryClass"
          @toggle-history="isCombatHistoryOpen = !isCombatHistoryOpen"
        />
      </template>

      <!-- ==================== PHASE: RESOLVED ==================== -->
      <template v-if="isResolvedPhase">
        <div
          v-if="groupedBattleLogEntries.length > 0"
          class="max-w-3xl mx-auto rounded-xl border border-border bg-card/40 p-4 space-y-3"
        >
          <p class="text-sm font-bold text-muted-foreground">{{ t("battle.full_combat_log") }}</p>
          <div class="space-y-3 max-h-96 overflow-y-auto rounded-lg border border-border/60 p-3">
            <BattleCombatLogEntries
              :groups="groupedBattleLogEntries"
              :format-entry="formatBattleLogEntry"
              :entry-class="battleLogEntryClass"
            />
          </div>
        </div>
      </template>
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
import { useBattle } from "@/composables/useBattle";
import { useBattleCombatLog } from "@/composables/useBattleCombatLog";
import BattleArena from "@/components/game/BattleArena.vue";
import BattleCombatLogEntries from "@/components/game/BattleCombatLogEntries.vue";
import BattleOpponentTurnPanel from "@/components/game/BattleOpponentTurnPanel.vue";
import BattlePlayerTurnPanel from "@/components/game/BattlePlayerTurnPanel.vue";
import BattleRoundSummary from "@/components/game/BattleRoundSummary.vue";
import BattleResolvedSummary from "@/components/game/BattleResolvedSummary.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";
import type { Combination } from "@/stores/event";
import { useI18n } from "@/i18n";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const battle = useBattle();
const { t, locale } = useI18n();

const loading = ref(false);
const isStarting = ref(false);
const isActing = ref(false);
const isDiceAnimating = ref(false);
const forceAnimationNonce = ref(0);
const forcedAnimationIndices = ref<number[]>([]);
const isCombatHistoryOpen = ref(false);
const showOnboarding = ref(false);
const onboardingStorageScope = "battle-v1";
const isBusy = computed(() => isActing.value || isDiceAnimating.value);
const draggingDieIndex = ref<number | null>(null);
const isDeploying = ref(false);
const opponentName = computed(
  () => eventStore.pvpData?.opponent_name ?? t("battle.opponent_name"),
);
const battleReward = computed(() => battle.battleResult.value?.reward ?? null);
const downgradedElemental = computed(
  () => battle.battleResult.value?.penalty?.downgraded_elemental ?? null,
);

const onboardingSubtitle = computed(() =>
  locale.value === "ru"
    ? "Показывается один раз при первом открытии PvP-битвы."
    : "Shown once when you first open PvP Battle.",
);

const onboardingSteps = computed(() =>
  locale.value === "ru"
    ? [
        {
          title: "Ход раунда: бросок, назначение, выставить",
          description:
            "Каждый раунд начинается с бросков, затем назначайте кости элементалям и фиксируйте эффекты перед боем.",
          bullets: [
            "Бросьте все пять костей и продолжайте бросать только неназначенные кости.",
            "Перетащите кость на живого элементаля, чтобы назначить и выставить его.",
            "Назначение одностороннее: снятие назначения в текущем ходу недоступно.",
          ],
        },
        {
          title: "Взаимодействие элементов и выбор целей",
          description:
            "Бой использует атаку и здоровье. Преимущество по слабостям дает +10% урона, когда атакующий контрит защитника.",
          bullets: [
            "Water -> Fire, Fire -> Air, Air -> Earth, Earth -> Water.",
            "Lightning нейтрален: без пассивной слабости и бонуса.",
            "Таргетинг сначала приоритизирует уязвимости, затем любую живую цель.",
          ],
        },
        {
          title: "Переполнение урона и условие победы",
          description:
            "Атаки соперника сначала бьют выставленных защитников. Если выставленных целей нет, урон идет по любому живому элементалю. Уничтоженные элементали остаются уничтоженными до конца битвы.",
          bullets: [
            "Даже без выставления соперник все равно бьет живых элементалей.",
            "Битва продолжается, пока у одной из сторон не закончатся живые элементали.",
            "Награды и штрафы применяются только после полного завершения битвы.",
          ],
        },
      ]
    : [
        {
          title: "Round flow: roll, assign, deploy",
          description:
            "Each round starts with rolling, then assign dice to elementals and commit effects before combat.",
          bullets: [
            "Roll all five dice and keep rolling only unassigned dice.",
            "Drag a die onto an alive elemental to assign and deploy it.",
            "Assignment is one-way for the turn: no unassign action.",
          ],
        },
        {
          title: "Element interactions and targeting",
          description:
            "Combat uses attack and health. Weakness advantage gives +10% damage when attacker counters defender.",
          bullets: [
            "Water -> Fire, Fire -> Air, Air -> Earth, Earth -> Water.",
            "Lightning remains neutral with no passive weakness or bonus.",
            "Targeting prioritizes weakness exploitation, then any alive target.",
          ],
        },
        {
          title: "Damage overflow and win condition",
          description:
            "Enemy attacks hit deployed defenders first. If no deployed defenders are alive, attacks hit any living elemental. Destroyed elementals stay destroyed for this battle.",
          bullets: [
            "If you deploy nothing, enemy attacks still target your living elementals.",
            "Battle continues until one side has no living elementals.",
            "Rewards and penalties resolve only when the full battle ends.",
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

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🏔️",
  air: "💨",
  lightning: "⚡",
};

function getElementEmoji(element: string): string {
  return ELEMENT_EMOJIS[element] ?? "?";
}

function getCombinationLabel(combo: Combination): string {
  const labels: Record<string, string> = {
    doublet: "Doublet",
    triplet: t("battle.combo.triplet"),
    quartet: t("battle.combo.quartet"),
    quintet: "Quintet",
    all_for_one: t("battle.combo.all_for_one"),
    one_for_all: t("battle.combo.one_for_all"),
    full_house: t("battle.combo.full_house"),
  };
  return labels[combo.type] ?? combo.type;
}

const {
  groupedBattleLogEntries,
  lastRoundSummary,
  deployedPlayerNames,
  deployedOpponentNames,
  totalPlayerDamage,
  totalOpponentDamage,
  totalPlayerUnitsDestroyed,
  totalOpponentUnitsDestroyed,
  roundsResolved,
  formatBattleLogEntry,
  battleLogEntryClass,
} = useBattleCombatLog({
  combatLog: computed(() => battle.battleState.value?.combat_log ?? []),
  battlePhase: battle.battlePhase,
  currentTurn: battle.currentTurn,
  playerParty: battle.playerParty,
  opponentParty: battle.opponentParty,
  playerDeployment: computed(
    () => battle.battleState.value?.last_player_deployment ?? null,
  ),
  opponentDeployment: computed(
    () => battle.battleState.value?.last_opponent_deployment ?? null,
  ),
  opponentName,
  t,
  getElementEmoji,
});

const isVictory = computed(() => {
  if (battle.battleResult.value) {
    return battle.battleResult.value.victory;
  }
  const winner = battle.battleState.value?.winner;
  if (!winner) return false;
  return winner === "player" || winner === "draw";
});

const isTargetingPhase = computed(() => battle.battlePhase.value === "targeting");
const isPlayerTurnPhase = computed(() => battle.battlePhase.value === "player_turn");
const isResolvedPhase = computed(
  () => battle.battlePhase.value === "resolved" || !!battle.battleResult.value,
);

const showBattleArena = computed(
  () => isTargetingPhase.value || isPlayerTurnPhase.value || isResolvedPhase.value,
);

const showArenaTargets = computed(() => isTargetingPhase.value);
const arenaTargetLines = computed(() =>
  isTargetingPhase.value ? battle.targetLines.value : undefined,
);
const arenaPlayerDeployedIndices = computed(() =>
  isTargetingPhase.value
    ? null
    : (battle.battleState.value?.last_player_deployment ?? null),
);
const arenaOpponentDeployedIndices = computed(() =>
  isTargetingPhase.value
    ? null
    : (battle.battleState.value?.last_opponent_deployment ?? null),
);
const isArenaPlayerPartyDroppable = computed(
  () =>
    isPlayerTurnPhase.value &&
    !!battle.farkleTurnState.value &&
    !battle.isBusted.value &&
    !isBusy.value,
);
const arenaHighlightedPlayerIndices = computed(() =>
  isPlayerTurnPhase.value ? highlightedDroppablePartyIndices.value : [],
);
const arenaPlayerInfusionElements = computed(() =>
  isPlayerTurnPhase.value ? playerInfusionElements.value : undefined,
);

const resolvedMessage = computed(() => {
  if (battle.battleResult.value?.message) {
    return battle.battleResult.value.message;
  }
  const winner = battle.battleState.value?.winner;
  if (winner === "player") return t("battle.resolved_win");
  if (winner === "opponent") return t("battle.resolved_lose");
  if (winner === "draw") return t("battle.resolved_draw");
  return t("battle.resolved_generic");
});

const scheduleForcedDiceAnimation = (indices: number[]) => {
  if (indices.length > 0) {
    isDiceAnimating.value = true;
  }
  forcedAnimationIndices.value = [...indices];
  forceAnimationNonce.value += 1;
};

const unassignedDice = computed(() =>
  battle.farkleDice.value
    .map((die, index) => ({ die, index }))
    .filter(
      ({ die }) =>
        !die.is_assigned &&
        die.assigned_to_party_index === null,
    ),
);

const rollableDice = computed(() =>
  unassignedDice.value.filter(({ die }) => !die.is_set_aside),
);

const playerInfusionElements = computed<Record<number, string[]>>(() => {
  if (isDeploying.value) return {};
  const infused: Record<number, string[]> = {};
  battle.farkleDice.value.forEach((die) => {
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
  if (draggingDieIndex.value === null) return [] as number[];
  return battle.playerParty.value
    .map((member, index) => ({ member, index }))
    .filter(
      ({ member }) =>
        !member.is_destroyed,
    )
    .map(({ index }) => index);
});

// Can end turn when there's something set aside or busted
const canEndTurn = computed(() => {
  const turn = battle.farkleTurnState.value;
  if (!turn) return false;
  if (turn.busted) return true;
  if (turn.can_commit) return true;
  return false;
});

const canRollRemaining = computed(() => {
  if (battle.battlePhase.value !== "player_turn") return false;
  if (isBusy.value) return false;
  if (!battle.farkleTurnState.value) return true;
  if (battle.farkleTurnState.value.busted || battle.farkleTurnState.value.phase === "done") {
    return false;
  }
  return rollableDice.value.length > 0;
});

const battleArenaPhaseLabel = computed(() => {
  if (isTargetingPhase.value) return t("battle.phase1");
  if (isPlayerTurnPhase.value) return t("battle.player_turn");
  if (isResolvedPhase.value) return isVictory.value ? t("battle.victory") : t("battle.defeat");
  return "";
});

const battleArenaStatusLabel = computed(() => {
  if (isTargetingPhase.value) return t("battle.targets_chosen");
  if (isPlayerTurnPhase.value) {
    return `${t("common.round")} ${battle.currentTurn.value} - ${roundsResolved.value} ${t("battle.rounds_resolved_short")}`;
  }
  if (isResolvedPhase.value) {
    return t("battle.rounds", { count: roundsResolved.value });
  }
  return "";
});

const battleTurnInstruction = computed(() => {
  if (isBusy.value) return t("battle.instruction_wait");
  if (battle.isBusted.value) return t("battle.instruction_bust");
  if (!battle.farkleTurnState.value || battle.farkleDice.value.length === 0) {
    return t("battle.instruction_roll");
  }
  if (!canEndTurn.value) {
    return t("battle.instruction_assign");
  }
  return t("battle.instruction_deploy");
});

const battleRollButtonLabel = computed(() => {
  return battle.farkleTurnState.value ? t("battle.roll_undeployed") : t("battle.roll_all");
});

// Phase 1: Start battle
const handleStartBattle = async () => {
  if (!userStore.userId) return;
  isStarting.value = true;
  try {
    const result = await eventStore.startBattle(userStore.userId);
    if (result?.battle_state) {
      battle.initFromState(result.battle_state as any);
    }
  } catch (error) {
    console.error("Failed to start battle:", error);
  } finally {
    isStarting.value = false;
  }
};

// Initial roll of all 5 dice
const handleFarkleRoll = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.farkleRoll(userStore.userId);
    if (response?.result) {
      const rolledDice = response.result.battle_state?.player_turn?.dice ?? [];
      const indicesToAnimate: number[] = [];
      rolledDice.forEach((die: { is_assigned?: boolean }, index: number) => {
        if (!die.is_assigned) {
          indicesToAnimate.push(index);
        }
      });
      scheduleForcedDiceAnimation(indicesToAnimate);
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to roll:", error);
  } finally {
    isActing.value = false;
  }
};

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
  const member = battle.playerParty.value[partyIndex];
  if (!member || member.is_destroyed) return;
  isActing.value = true;
  try {
    const response = await eventStore.farkleAssign(userStore.userId, dieIndex, partyIndex);
    if (response?.result) {
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to assign die:", error);
  } finally {
    isActing.value = false;
  }
};

// End player turn — commit bonuses, deploy and resolve combat round
const handleFarkleEndTurn = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  isDeploying.value = true;
  try {
    const response = await eventStore.farkleEndTurn(userStore.userId);
    if (response?.result) {
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to end turn:", error);
  } finally {
    isDeploying.value = false;
    isActing.value = false;
  }
};

// Proceed after battle resolved
const proceedToNext = async () => {
  if (!userStore.userId) {
    eventStore.clearEvent();
    router.push("/");
    return;
  }
  try {
    await userStore.fetchUser(userStore.userId);
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } catch (error) {
    console.error("Failed to refresh user data:", error);
  } finally {
    battle.reset();
    eventStore.clearEvent();
    router.push("/");
  }
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

    if (eventStore.battleState) {
      battle.initFromState(eventStore.battleState as any);
    } else if (eventStore.pvpData?.battle_state) {
      battle.initFromState(eventStore.pvpData.battle_state as any);
    }
  } catch (error) {
    console.error("Failed to load battle data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
