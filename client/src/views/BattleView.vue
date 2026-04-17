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

      <!-- ==================== PHASE 1: TARGETING ==================== -->
      <template v-if="battle.battlePhase.value === 'targeting'">
        <div class="text-center mb-4">
          <div class="inline-block px-4 py-2 bg-primary/10 rounded-lg">
            <span class="text-sm font-bold text-primary"
              >{{ t("battle.phase1") }}</span
            >
          </div>
          <p class="text-sm text-muted-foreground mt-2">
            {{ t("battle.targets_chosen") }}
          </p>
        </div>

        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? t('battle.opponent_name')"
          :show-targets="true"
          :target-lines="battle.targetLines.value"
        >
          <template #centerActions>
            <button
              @click="handleStartBattle"
              :disabled="isStarting"
              class="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
            >
              {{ isStarting ? t("battle.starting") : t("battle.start") }}
            </button>
          </template>
        </BattleArena>
      </template>

      <!-- ==================== PHASE: PLAYER TURN ==================== -->
      <template v-if="battle.battlePhase.value === 'player_turn'">
        <!-- Bonus Tracker -->
        <FarkleBonusTracker
          :current-turn="battle.currentTurn.value"
          :bonuses-total="battle.playerBonusesTotal.value"
        />

        <!-- Battle Arena -->
        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? t('battle.opponent_name')"
          :player-deployed-indices="battle.battleState.value?.last_player_deployment ?? null"
          :opponent-deployed-indices="battle.battleState.value?.last_opponent_deployment ?? null"
          :is-player-party-droppable="!!battle.farkleTurnState.value && !isBusy"
          :highlighted-player-indices="highlightedDroppablePartyIndices"
          :player-infusion-elements="playerInfusionElements"
          @player-party-drop="handleDropToParty"
        >
          <template #centerActions>
            <div class="w-full max-w-md rounded-xl border border-border/60 bg-card/40 p-3 space-y-3">
              <div v-if="battle.farkleDice.value.length > 0" class="space-y-3">
                <div class="flex justify-end">
                  <DiceCombinationsHint />
                </div>

                <FarkleDiceRow
                  :dice="battle.farkleDice.value"
                  :force-animate-indices="forcedAnimationIndices"
                  :force-animate-nonce="forceAnimationNonce"
                  @die-drag-start="handleDieDragStart"
                  @die-drag-end="handleDieDragEnd"
                  @rolling-start="isDiceAnimating = true"
                  @rolling-complete="isDiceAnimating = false"
                />

                <CombinationDisplay
                  v-if="!isBusy"
                  :combinations="battle.detectedCombinations.value"
                  :selectable="false"
                  :show-empty="true"
                />
              </div>

              <div class="flex justify-center" v-if="canRollRemaining">
                <button
                  @click="handleFarkleRoll"
                  :disabled="isBusy"
                  class="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
                >
                  {{ isBusy ? t("battle.rolling") : t("battle.roll_all") }}
                </button>
              </div>

              <div
                v-if="
                  battle.farkleDice.value.length > 0 &&
                  !battle.isBusted.value &&
                  !isBusy
                "
                class="flex flex-wrap justify-center gap-2"
              >
                <button
                  v-if="
                    battle.canEndTurn.value || battle.farkleTurnState.value !== null
                  "
                  @click="handleFarkleEndTurn"
                  :disabled="isBusy || !canEndTurn"
                  class="px-3 py-1.5 bg-card border border-border rounded-lg font-semibold text-foreground hover:bg-card/80 transition-all disabled:opacity-50 text-sm"
                >{{ t("battle.deploy_resolve") }}</button>
              </div>

              <div
                v-if="battle.isBusted.value && !isBusy"
                class="flex justify-center"
              >
                <button
                  @click="handleFarkleEndTurn"
                  :disabled="isBusy"
                  class="px-4 py-2 bg-card border border-border rounded-lg font-bold text-foreground hover:bg-card/80 transition-all disabled:opacity-50"
                >{{ t("battle.deploy_resolve_no_bonus") }}</button>
              </div>
              <p v-if="!canEndTurn && !battle.isBusted.value" class="text-center text-xs text-muted-foreground">
                Assign dice to all deployable alive elementals to commit.
              </p>
            </div>
          </template>
        </BattleArena>

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
        <div v-if="lastRoundSummary" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">
              {{ t("battle.round_resolved", { round: lastRoundSummary.round }) }}
            </p>
            <p class="text-sm">
              {{ t("battle.first_attacker") }}
              <span class="font-semibold">
                {{ lastRoundSummary.firstAttacker === "player" ? t("battle.you") : eventStore.pvpData?.opponent_name ?? t("battle.opponent_name") }}
              </span>
            </p>
            <p class="text-sm">
              {{ t("battle.your_deployment") }}
              <span class="font-semibold">{{ deployedPlayerNames }}</span>
            </p>
            <p class="text-sm">
              {{ t("battle.opponent_deployment") }}
              <span class="font-semibold">{{ deployedOpponentNames }}</span>
            </p>
          </div>
          <div class="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ t("battle.round_impact") }}</p>
            <p class="text-sm text-red-300">
              {{ t("battle.you_took_damage", { damage: lastRoundSummary.playerDamageTaken }) }}
            </p>
            <p class="text-sm text-blue-300">
              {{ t("battle.opponent_took_damage", { damage: lastRoundSummary.opponentDamageTaken }) }}
            </p>
            <p class="text-sm">
              {{
                t("battle.units_destroyed", {
                  player: lastRoundSummary.playerUnitsDestroyed,
                  opponent: lastRoundSummary.opponentUnitsDestroyed,
                })
              }}
            </p>
          </div>
        </div>

        <div
          v-if="battle.opponentTurnResult.value"
          class="rounded-xl border border-border bg-card/40 p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold text-red-400">{{ t("battle.opponent_private_roll") }}</p>
            <button
              @click="isCombatHistoryOpen = !isCombatHistoryOpen"
              class="text-xs px-2 py-1 rounded border border-border hover:bg-card transition-colors"
            >
              {{ isCombatHistoryOpen ? t("battle.hide_combat_log") : t("battle.show_combat_log") }}
            </button>
          </div>
          <div class="flex justify-center gap-2 flex-wrap">
            <div
              v-for="(die, i) in battle.opponentTurnResult.value.dice"
              :key="i"
              class="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center text-xl"
            >
              {{ getElementEmoji(die.current_result) }}
            </div>
          </div>
          <div class="text-center text-sm">
            <span v-if="battle.opponentTurnResult.value.busted" class="text-red-400 font-semibold">
              {{ t("battle.opponent_busted") }}
            </span>
            <span v-else-if="battle.opponentTurnResult.value.combination" class="font-semibold">
              {{ t("battle.combination_activated", { label: getCombinationLabel(battle.opponentTurnResult.value.combination) }) }}
            </span>
          </div>
          <div
            v-if="isCombatHistoryOpen && lastRoundLogs.length > 0"
            class="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-border/60 p-2"
          >
            <div
              v-for="entry in lastRoundLogs"
              :key="`${entry.round}-${entry.step}-${entry.side}-${entry.attacker_index}`"
              class="text-xs rounded-md bg-card/70 p-2"
            >
              <span class="font-semibold">{{ t("battle.step", { step: entry.step }) }}</span>
              {{ entry.attacker_name }} ({{ getElementEmoji(entry.attacker_element) }})
              {{ t("battle.attacked") }}
              <span v-if="entry.target === 'unit'">
                {{ entry.defender_name }} ({{ getElementEmoji(entry.defender_element ?? "") }})
              </span>
              {{ t("battle.for_damage", { damage: entry.damage }) }}
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== PHASE: RESOLVED ==================== -->
      <template
        v-if="
          battle.battlePhase.value === 'resolved' || battle.battleResult.value
        "
      >
        <div class="max-w-lg mx-auto text-center space-y-6">
          <!-- Victory/Defeat Banner -->
          <div
            class="p-8 rounded-xl"
            :class="
              isVictory
                ? 'bg-green-500/10 border-2 border-green-500'
                : 'bg-red-500/10 border-2 border-red-500'
            "
          >
            <div class="text-7xl mb-4">
              {{
                isVictory ? "&#x1F3C6;" : "&#x1F480;"
              }}
            </div>
            <h2 class="text-3xl font-bold mb-2">
              {{ isVictory ? t("battle.victory") : t("battle.defeat") }}
            </h2>
            <p class="text-lg text-muted-foreground">
              {{ resolvedMessage }}
            </p>

            <!-- Core Summary -->
            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="p-4 bg-blue-500/10 rounded-lg space-y-1">
                <p class="text-sm text-muted-foreground">{{ t("battle.damage_to_opponent") }}</p>
                <p class="text-3xl font-bold text-blue-400">{{ totalOpponentDamage }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t("battle.opponent_units_destroyed", { count: totalOpponentUnitsDestroyed }) }}
                </p>
              </div>
              <div class="p-4 bg-red-500/10 rounded-lg space-y-1">
                <p class="text-sm text-muted-foreground">{{ t("battle.damage_to_you") }}</p>
                <p class="text-3xl font-bold text-red-400">{{ totalPlayerDamage }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t("battle.your_units_destroyed", { count: totalPlayerUnitsDestroyed }) }}
                </p>
              </div>
            </div>

            <div class="p-4 bg-card/40 border border-border rounded-lg">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ t("battle.battle_length") }}</p>
              <p class="text-2xl font-bold">{{ t("battle.rounds", { count: roundsResolved }) }}</p>
            </div>

            <!-- Legacy Attack Snapshot -->
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p class="font-bold mb-1">{{ t("battle.remaining_attack_you") }}</p>
                <p class="text-blue-300 font-semibold">
                  {{ battle.battleResult.value?.player_total_attack?.toFixed(0) ?? "—" }}
                </p>
              </div>
              <div>
                <p class="font-bold mb-1">{{ t("battle.remaining_attack_opponent") }}</p>
                <p class="text-red-300 font-semibold">
                  {{ battle.battleResult.value?.opponent_total_attack?.toFixed(0) ?? "—" }}
                </p>
              </div>
            </div>

            <!-- Bonuses summary -->
            <div
              class="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground"
            >
              <div>
                <p class="font-bold mb-1">{{ t("battle.your_bonuses") }}</p>
                <div
                  v-for="(pct, el) in battle.playerBonusesTotal.value"
                  :key="el"
                >
                  <span v-if="Number(pct) > 0"
                    >{{ getElementEmoji(el) }} +{{
                      Math.round(Number(pct) * 100)
                    }}%</span
                  >
                </div>
              </div>
              <div>
                <p class="font-bold mb-1">{{ t("battle.opponent_bonuses") }}</p>
                <div
                  v-for="(pct, el) in battle.opponentBonusesTotal.value"
                  :key="el"
                >
                  <span v-if="Number(pct) > 0"
                    >{{ getElementEmoji(el) }} +{{
                      Math.round(Number(pct) * 100)
                    }}%</span
                  >
                </div>
              </div>
            </div>

            <!-- Reward -->
            <div
              v-if="
                isVictory &&
                battle.battleResult.value?.reward
              "
              class="mt-4 p-3 bg-yellow-500/10 rounded-lg"
            >
              <p class="text-sm text-muted-foreground mb-1">{{ t("battle.reward_earned") }}</p>
              <p class="font-bold text-xl text-yellow-500">
                {{ t("battle.coins", { amount: battle.battleResult.value.reward }) }}
              </p>
            </div>

            <!-- Penalty -->
            <div
              v-if="
                !isVictory &&
                battle.battleResult.value?.penalty?.downgraded_elemental
              "
              class="mt-4 p-3 bg-orange-500/10 rounded-lg"
            >
              <p class="text-sm text-orange-500">
                {{
                  t("battle.was_downgraded", {
                    name: battle.battleResult.value.penalty.downgraded_elemental,
                  })
                }}
              </p>
            </div>
          </div>

          <!-- Proceed Button -->
          <button
            @click="proceedToNext"
            class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
          >
            {{ t("battle.proceed_next") }}
          </button>
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
import BattleArena from "@/components/game/BattleArena.vue";
import FarkleDiceRow from "@/components/game/FarkleDiceRow.vue";
import CombinationDisplay from "@/components/game/CombinationDisplay.vue";
import FarkleBonusTracker from "@/components/game/FarkleBonusTracker.vue";
import DiceCombinationsHint from "@/components/game/DiceCombinationsHint.vue";
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

type CombatLogEntry = {
  round: number;
  step: number;
  side: "player" | "opponent";
  attacker_index: number;
  attacker_name: string;
  attacker_element: string;
  target: "unit";
  defender_index?: number;
  defender_name?: string;
  defender_element?: string;
  damage: number;
  defender_remaining_health?: number;
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

const combatLogEntries = computed<CombatLogEntry[]>(() => {
  const raw = (battle.battleState.value?.combat_log ?? []) as Array<
    Partial<CombatLogEntry>
  >;
  return raw
    .filter(
      (entry): entry is CombatLogEntry =>
        typeof entry.round === "number" &&
        typeof entry.step === "number" &&
        (entry.side === "player" || entry.side === "opponent") &&
        typeof entry.attacker_name === "string" &&
        typeof entry.attacker_element === "string" &&
        entry.target === "unit" &&
        typeof entry.damage === "number",
    )
    .sort((a, b) => a.round - b.round || a.step - b.step);
});

const lastResolvedRoundNumber = computed<number | null>(() => {
  if (combatLogEntries.value.length === 0) return null;
  const maxRound = Math.max(...combatLogEntries.value.map((entry) => entry.round));
  if (battle.battlePhase.value === "resolved") return maxRound;
  const cappedRound = battle.currentTurn.value - 1;
  if (cappedRound < 1) return null;
  const resolvedRounds = combatLogEntries.value
    .map((entry) => entry.round)
    .filter((round) => round <= cappedRound);
  return resolvedRounds.length > 0 ? Math.max(...resolvedRounds) : null;
});

const lastRoundLogs = computed(() => {
  if (!lastResolvedRoundNumber.value) return [] as CombatLogEntry[];
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
  const playerUnitsDestroyed = lastRoundLogs.value.filter(
    (entry) =>
      entry.side === "opponent" &&
      entry.target === "unit" &&
      entry.defender_remaining_health === 0,
  ).length;
  const opponentUnitsDestroyed = lastRoundLogs.value.filter(
    (entry) =>
      entry.side === "player" &&
      entry.target === "unit" &&
      entry.defender_remaining_health === 0,
  ).length;

  return {
    round: lastResolvedRoundNumber.value,
    firstAttacker,
    playerDamageTaken,
    opponentDamageTaken,
    playerUnitsDestroyed,
    opponentUnitsDestroyed,
  };
});

const deployedPlayerNames = computed(() => {
  const indices = battle.battleState.value?.last_player_deployment ?? [];
  if (indices.length === 0) return t("battle.none");
  return indices
    .map((idx) => battle.playerParty.value[idx]?.name)
    .filter(Boolean)
    .join(", ");
});

const deployedOpponentNames = computed(() => {
  const indices = battle.battleState.value?.last_opponent_deployment ?? [];
  if (indices.length === 0) return t("battle.none");
  return indices
    .map((idx) => battle.opponentParty.value[idx]?.name)
    .filter(Boolean)
    .join(", ");
});

const totalPlayerDamage = computed(() =>
  combatLogEntries.value
    .filter((entry) => entry.side === "opponent" && entry.target === "unit")
    .reduce((sum, entry) => sum + entry.damage, 0),
);

const totalOpponentDamage = computed(() =>
  combatLogEntries.value
    .filter((entry) => entry.side === "player" && entry.target === "unit")
    .reduce((sum, entry) => sum + entry.damage, 0),
);

const totalPlayerUnitsDestroyed = computed(
  () =>
    combatLogEntries.value.filter(
      (entry) =>
        entry.side === "opponent" &&
        entry.target === "unit" &&
        entry.defender_remaining_health === 0,
    ).length,
);

const totalOpponentUnitsDestroyed = computed(
  () =>
    combatLogEntries.value.filter(
      (entry) =>
        entry.side === "player" &&
        entry.target === "unit" &&
        entry.defender_remaining_health === 0,
    ).length,
);

const roundsResolved = computed(() => {
  const rounds = new Set(combatLogEntries.value.map((entry) => entry.round));
  return rounds.size;
});

const isVictory = computed(() => {
  if (battle.battleResult.value) {
    return battle.battleResult.value.victory;
  }
  const winner = battle.battleState.value?.winner;
  if (!winner) return false;
  return winner === "player" || winner === "draw";
});

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

const assignedPartyIndexSet = computed(() => {
  const assigned = new Set<number>();
  battle.farkleDice.value.forEach((die) => {
    if (die.is_assigned && typeof die.assigned_to_party_index === "number") {
      assigned.add(die.assigned_to_party_index);
    }
  });
  return assigned;
});

const playerInfusionElements = computed<Record<number, string>>(() => {
  if (isDeploying.value) return {};
  const infused: Record<number, string> = {};
  battle.farkleDice.value.forEach((die) => {
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
  if (draggingDieIndex.value === null) return [] as number[];
  return battle.playerParty.value
    .map((member, index) => ({ member, index }))
    .filter(
      ({ member, index }) =>
        !member.is_destroyed && !assignedPartyIndexSet.value.has(index),
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
  return unassignedDice.value.length > 0;
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
