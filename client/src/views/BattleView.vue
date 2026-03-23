<template>
  <div class="container mx-auto p-4 md:p-6 space-y-4 md:space-y-5">
    <ViewOnboardingModal
      v-if="showOnboarding"
      title="Battle + Farkle Basics"
      subtitle="Shown once when you first open PvP Battle."
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-6xl mb-4">&#x23F3;</div>
      <p class="text-xl font-semibold">Loading battle...</p>
    </div>

    <!-- No Active Event -->
    <div v-else-if="!eventStore.isEventActive" class="text-center py-12">
      <div class="text-6xl mb-4">&#x1F3B2;</div>
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

    <!-- Battle Content -->
    <div v-else class="space-y-4 md:space-y-5">
      <!-- Header -->
      <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span class="text-xl">&larr;</span>
          <span class="font-semibold">Back</span>
        </button>

        <div class="text-center">
          <h1 class="text-3xl font-bold mb-1">PvP Battle!</h1>
          <p class="text-muted-foreground">
            vs {{ eventStore.pvpData?.opponent_name }}
            <span v-if="eventStore.pvpData?.potential_reward" class="ml-2">
              | Reward: {{ eventStore.pvpData?.potential_reward }}
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
              >Phase 1: Target Assignment</span
            >
          </div>
          <p class="text-sm text-muted-foreground mt-2">
            Your elementals have chosen their targets.
          </p>
        </div>

        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :player-health="battle.playerHealth.value"
          :opponent-health="battle.opponentHealth.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? 'Opponent'"
          :show-targets="true"
          :target-lines="battle.targetLines.value"
        >
          <template #centerActions>
            <button
              @click="handleStartBattle"
              :disabled="isStarting"
              class="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
            >
              {{ isStarting ? "Starting..." : "Start Battle!" }}
            </button>
          </template>
        </BattleArena>
      </template>

      <!-- ==================== PHASE: CHOOSE ELEMENT ==================== -->
      <template v-if="battle.battlePhase.value === 'choose_element'">
        <div class="text-center mb-4">
          <div class="inline-block px-4 py-2 bg-yellow-500/10 rounded-lg">
            <span class="text-sm font-bold text-yellow-400"
              >Choose Your Set-Aside Element</span
            >
          </div>
          <p class="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Pick one element. Dice showing this element can always be set aside
            for a
            <strong>+10% attack bonus</strong>, even without a combination.
          </p>
        </div>

        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :player-health="battle.playerHealth.value"
          :opponent-health="battle.opponentHealth.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? 'Opponent'"
        >
          <template #centerActions>
            <div class="flex justify-center gap-2 flex-wrap max-w-md">
              <button
                v-for="el in battle.getPartyElementsPresent()"
                :key="el"
                @click="handleChooseElement(el)"
                :disabled="isChoosing"
                class="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl border-2 border-border hover:border-primary transition-all disabled:opacity-50 bg-card"
              >
                <span class="text-2xl">{{
                  battle.getElementConfig(el).emoji
                }}</span>
                <span class="text-sm font-semibold capitalize">{{ el }}</span>
                <span class="text-[11px] text-muted-foreground leading-tight">
                  {{ getPartyCountForElement(el) }} in party
                </span>
              </button>
            </div>
          </template>
        </BattleArena>
      </template>

      <!-- ==================== PHASE: PLAYER TURN ==================== -->
      <template v-if="battle.battlePhase.value === 'player_turn'">
        <!-- Bonus Tracker -->
        <FarkleBonusTracker
          :current-turn="battle.currentTurn.value"
          :bonuses-total="battle.playerBonusesTotal.value"
          :set-aside-element="battle.setAsideElement.value"
        />
        <p class="text-center text-xs text-muted-foreground">
          Battle continues until one player reaches 0 HP.
        </p>

        <!-- Battle Arena -->
        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :player-health="battle.playerHealth.value"
          :opponent-health="battle.opponentHealth.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? 'Opponent'"
          :player-deployed-indices="battle.battleState.value?.last_player_deployment ?? null"
          :opponent-deployed-indices="battle.battleState.value?.last_opponent_deployment ?? null"
        >
          <template #centerActions>
            <div class="w-full max-w-md rounded-xl border border-border/60 bg-card/40 p-3 space-y-3">
              <div v-if="battle.farkleDice.value.length > 0" class="space-y-3">
                <div class="flex justify-end">
                  <DiceCombinationsHint />
                </div>

                <FarkleDiceRow
                  :dice="battle.farkleDice.value"
                  :selected-indices="battle.selectedDiceIndices.value"
                  :force-animate-indices="forcedAnimationIndices"
                  :force-animate-nonce="forceAnimationNonce"
                  @toggle-select="battle.toggleDiceSelection($event)"
                  @rolling-start="isDiceAnimating = true"
                  @rolling-complete="isDiceAnimating = false"
                />

                <CombinationDisplay
                  v-if="!isBusy"
                  :combinations="battle.detectedCombinations.value"
                  :selectable="false"
                  :show-empty="true"
                />

                <div
                  v-if="battle.activeCombinations.value.length > 0"
                  class="space-y-1"
                >
                  <p
                    class="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center"
                  >
                    Set aside:
                  </p>
                  <CombinationDisplay
                    v-if="!isBusy"
                    :combinations="battle.activeCombinations.value"
                    :selectable="false"
                  />
                </div>
              </div>

              <div class="flex justify-center" v-if="battle.canRoll.value">
                <button
                  @click="handleFarkleRoll"
                  :disabled="isBusy"
                  class="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
                >
                  {{ isBusy ? "Rolling..." : "&#x1F3B2; Roll all dice!" }}
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
                  v-if="battle.canReroll.value"
                  @click="handleFarkleReroll"
                  :disabled="
                    isBusy || battle.selectedDiceIndices.value.length === 0
                  "
                  class="px-3 py-1.5 bg-yellow-500/20 text-foreground border border-yellow-500 rounded-lg font-bold hover:bg-yellow-500/30 transition-all disabled:opacity-50 text-sm"
                >Reroll ({{ battle.selectedDiceIndices.value.length }})</button>

                <button
                  v-if="battle.canSetAside.value"
                  @click="handleSetAside"
                  :disabled="isBusy"
                  class="px-3 py-1.5 bg-green-500/20 text-foreground border border-green-500 rounded-lg font-bold hover:bg-green-500/30 transition-all disabled:opacity-50 text-sm"
                >Set aside combo</button>

                <button
                  v-if="canSetAsideChosenElement"
                  @click="handleSetAsideChosenElement"
                  :disabled="isBusy"
                  class="px-3 py-1.5 bg-yellow-500/20 text-foreground border border-yellow-500/50 rounded-lg font-semibold hover:bg-yellow-500/30 transition-all disabled:opacity-50 text-sm"
                >
                  {{ battle.getElementConfig(battle.setAsideElement.value!).emoji }}
                  Set aside element
                </button>

                <button
                  v-if="battle.canContinue.value"
                  @click="handleFarkleContinue"
                  :disabled="isBusy"
                  class="px-3 py-1.5 bg-blue-500/20 text-foreground border border-blue-500 rounded-lg font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50 text-sm"
                >
                  &#x1F3B2; Roll undeployed dice
                </button>

                <button
                  v-if="
                    battle.canEndTurn.value || battle.farkleTurnState.value !== null
                  "
                  @click="handleFarkleEndTurn"
                  :disabled="isBusy || !canEndTurn"
                  class="px-3 py-1.5 bg-card border border-border rounded-lg font-semibold text-foreground hover:bg-card/80 transition-all disabled:opacity-50 text-sm"
                >Deploy &amp; Resolve Round</button>
              </div>

              <div
                v-if="battle.isBusted.value && !isBusy"
                class="flex justify-center"
              >
                <button
                  @click="handleFarkleEndTurn"
                  :disabled="isBusy"
                  class="px-4 py-2 bg-card border border-border rounded-lg font-bold text-foreground hover:bg-card/80 transition-all disabled:opacity-50"
                >Deploy &amp; Resolve Round (no bonuses)</button>
              </div>
              <p v-if="!canEndTurn && !battle.isBusted.value" class="text-center text-xs text-muted-foreground">
                Set aside a valid combination or chosen element before deploying.
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
            &#x1F3B2; DICE RUSH! All 5 dice used — roll again or end turn.
          </p>
        </div>

        <!-- BUST Banner -->
        <div
          v-if="battle.isBusted.value"
          class="text-center py-3 bg-red-500/20 rounded-xl border border-red-500"
        >
          <p class="text-lg font-bold text-red-400">
            &#x1F4A5; BUST! No combinations — all turn bonuses lost.
          </p>
          <p class="text-sm text-muted-foreground mt-1">
            Deploy now to resolve this round.
          </p>
        </div>
        <div v-if="lastRoundSummary" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">
              Round {{ lastRoundSummary.round }} resolved
            </p>
            <p class="text-sm">
              First attacker:
              <span class="font-semibold">
                {{ lastRoundSummary.firstAttacker === "player" ? "You" : eventStore.pvpData?.opponent_name ?? "Opponent" }}
              </span>
            </p>
            <p class="text-sm">
              Your deployment:
              <span class="font-semibold">{{ deployedPlayerNames }}</span>
            </p>
            <p class="text-sm">
              Opponent deployment:
              <span class="font-semibold">{{ deployedOpponentNames }}</span>
            </p>
          </div>
          <div class="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Round impact</p>
            <p class="text-sm text-red-300">
              You took {{ lastRoundSummary.playerHealthDamage }} direct HP damage
            </p>
            <p class="text-sm text-blue-300">
              Opponent took {{ lastRoundSummary.opponentHealthDamage }} direct HP damage
            </p>
            <p class="text-sm">
              Units destroyed: You lost {{ lastRoundSummary.playerUnitsDestroyed }}, Opponent lost {{ lastRoundSummary.opponentUnitsDestroyed }}
            </p>
          </div>
        </div>

        <div
          v-if="battle.opponentTurnResult.value"
          class="rounded-xl border border-border bg-card/40 p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold text-red-400">Opponent private roll (revealed after resolution)</p>
            <button
              @click="isCombatHistoryOpen = !isCombatHistoryOpen"
              class="text-xs px-2 py-1 rounded border border-border hover:bg-card transition-colors"
            >
              {{ isCombatHistoryOpen ? "Hide combat log" : "Show combat log" }}
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
              Opponent busted this round.
            </span>
            <span v-else-if="battle.opponentTurnResult.value.combination" class="font-semibold">
              {{ getCombinationLabel(battle.opponentTurnResult.value.combination) }} activated.
            </span>
            <span v-else-if="battle.opponentTurnResult.value.set_aside_element_used" class="text-yellow-400">
              Set-aside element bonus applied.
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
              <span class="font-semibold">Step {{ entry.step }}:</span>
              {{ entry.attacker_name }} ({{ getElementEmoji(entry.attacker_element) }})
              attacked
              <span v-if="entry.target === 'unit'">
                {{ entry.defender_name }} ({{ getElementEmoji(entry.defender_element ?? "") }})
              </span>
              <span v-else>player HP</span>
              for <span class="font-semibold">{{ entry.damage }}</span>.
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
              {{ isVictory ? "Victory!" : "Defeat!" }}
            </h2>
            <p class="text-lg text-muted-foreground">
              {{ resolvedMessage }}
            </p>
            <p class="text-sm text-muted-foreground mt-1">
              Final HP: You {{ battle.playerHealth.value }} / Opponent {{ battle.opponentHealth.value }}
            </p>

            <!-- Core Summary -->
            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="p-4 bg-blue-500/10 rounded-lg space-y-1">
                <p class="text-sm text-muted-foreground">Damage to Opponent HP</p>
                <p class="text-3xl font-bold text-blue-400">{{ totalOpponentHealthDamage }}</p>
                <p class="text-xs text-muted-foreground">
                  Opponent units destroyed: {{ totalOpponentUnitsDestroyed }}
                </p>
              </div>
              <div class="p-4 bg-red-500/10 rounded-lg space-y-1">
                <p class="text-sm text-muted-foreground">Damage to Your HP</p>
                <p class="text-3xl font-bold text-red-400">{{ totalPlayerHealthDamage }}</p>
                <p class="text-xs text-muted-foreground">
                  Your units destroyed: {{ totalPlayerUnitsDestroyed }}
                </p>
              </div>
            </div>

            <div class="p-4 bg-card/40 border border-border rounded-lg">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Battle length</p>
              <p class="text-2xl font-bold">{{ roundsResolved }} rounds</p>
            </div>

            <!-- Legacy Attack Snapshot -->
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p class="font-bold mb-1">Remaining attack (you)</p>
                <p class="text-blue-300 font-semibold">
                  {{ battle.battleResult.value?.player_total_attack?.toFixed(0) ?? "—" }}
                </p>
              </div>
              <div>
                <p class="font-bold mb-1">Remaining attack (opponent)</p>
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
                <p class="font-bold mb-1">Your bonuses</p>
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
                <p class="font-bold mb-1">Opponent bonuses</p>
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
              <p class="text-sm text-muted-foreground mb-1">Reward Earned</p>
              <p class="font-bold text-xl text-yellow-500">
                {{ battle.battleResult.value.reward }} coins
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
                {{ battle.battleResult.value.penalty.downgraded_elemental }} was
                downgraded!
              </p>
            </div>
          </div>

          <!-- Proceed Button -->
          <button
            @click="proceedToNext"
            class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
          >
            Proceed to Next Event
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

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const battle = useBattle();

const loading = ref(false);
const isStarting = ref(false);
const isChoosing = ref(false);
const isActing = ref(false);
const isDiceAnimating = ref(false);
const forceAnimationNonce = ref(0);
const forcedAnimationIndices = ref<number[]>([]);
const isCombatHistoryOpen = ref(false);
const showOnboarding = ref(false);
const onboardingStorageScope = "battle-v1";
const isBusy = computed(() => isActing.value || isDiceAnimating.value);

const onboardingSteps = [
  {
    title: "Round flow: roll, set aside, deploy",
    description:
      "Each round starts with Farkle actions, then you can commit current bonuses and deploy available elementals into combat.",
    bullets: [
      "Choose one set-aside element for direct +10% attack access.",
      "Roll all five dice, reroll once after first throw, then set aside valid outcomes.",
      "You may stop after set-aside and deploy immediately.",
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
      "Enemy attacks hit deployed defenders first. Remaining attacks overflow to player HP. Destroyed elementals stay destroyed for this battle.",
    bullets: [
      "If you deploy nothing, all enemy deployed attacks hit player HP directly.",
      "Battle continues until one player reaches 0 HP.",
      "Rewards and penalties resolve only when the full battle ends.",
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

type CombatLogEntry = {
  round: number;
  step: number;
  side: "player" | "opponent";
  attacker_index: number;
  attacker_name: string;
  attacker_element: string;
  target: "unit" | "player";
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
    triplet: "Triplet",
    quartet: "Quartet",
    all_for_one: "All-For-One",
    one_for_all: "One-For-All",
    full_house: "Full House",
  };
  return labels[combo.type] ?? combo.type;
}

function getPartyCountForElement(el: string): number {
  return battle.playerParty.value.filter((m) => m.element === el).length;
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
        (entry.target === "unit" || entry.target === "player") &&
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
  const playerHealthDamage = lastRoundLogs.value
    .filter((entry) => entry.side === "opponent" && entry.target === "player")
    .reduce((sum, entry) => sum + entry.damage, 0);
  const opponentHealthDamage = lastRoundLogs.value
    .filter((entry) => entry.side === "player" && entry.target === "player")
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
    playerHealthDamage,
    opponentHealthDamage,
    playerUnitsDestroyed,
    opponentUnitsDestroyed,
  };
});

const deployedPlayerNames = computed(() => {
  const indices = battle.battleState.value?.last_player_deployment ?? [];
  if (indices.length === 0) return "None";
  return indices
    .map((idx) => battle.playerParty.value[idx]?.name)
    .filter(Boolean)
    .join(", ");
});

const deployedOpponentNames = computed(() => {
  const indices = battle.battleState.value?.last_opponent_deployment ?? [];
  if (indices.length === 0) return "None";
  return indices
    .map((idx) => battle.opponentParty.value[idx]?.name)
    .filter(Boolean)
    .join(", ");
});

const totalPlayerHealthDamage = computed(() =>
  combatLogEntries.value
    .filter((entry) => entry.side === "opponent" && entry.target === "player")
    .reduce((sum, entry) => sum + entry.damage, 0),
);

const totalOpponentHealthDamage = computed(() =>
  combatLogEntries.value
    .filter((entry) => entry.side === "player" && entry.target === "player")
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
  if (winner === "player") return "You won by reducing enemy HP to zero.";
  if (winner === "opponent") return "Your HP reached zero first.";
  if (winner === "draw") return "The battle ended in a draw.";
  return "Battle resolved.";
});

const scheduleForcedDiceAnimation = (indices: number[]) => {
  if (indices.length > 0) {
    isDiceAnimating.value = true;
  }
  forcedAnimationIndices.value = [...indices];
  forceAnimationNonce.value += 1;
};

// Whether the player can set aside chosen-element dice without a combo
const canSetAsideChosenElement = computed(() => {
  const el = battle.setAsideElement.value;
  if (!el) return false;
  const turn = battle.farkleTurnState.value;
  if (!turn) return false;
  if (turn.phase !== "can_reroll" && turn.phase !== "set_aside") return false;
  // Check there's an active die with the chosen element
  return turn.dice.some((d) => !d.is_set_aside && d.current_result === el);
});

// Can end turn when there's something set aside or busted
const canEndTurn = computed(() => {
  const turn = battle.farkleTurnState.value;
  if (!turn) return false;
  if (turn.busted) return true;
  const hasAccumulatedDiceRushBonuses = Object.values(
    turn.accumulated_dice_rush_bonuses ?? {},
  ).some((bonus) => bonus > 0);
  return (
    turn.active_combinations.length > 0 ||
    turn.set_aside_element_bonus !== null ||
    hasAccumulatedDiceRushBonuses
  );
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

// Choose set-aside element
const handleChooseElement = async (element: string) => {
  if (!userStore.userId) return;
  isChoosing.value = true;
  try {
    const result = await eventStore.chooseSetAsideElement(
      userStore.userId,
      element,
    );
    if (result?.battle_state) {
      battle.initFromState(result.battle_state as any);
    }
  } catch (error) {
    console.error("Failed to choose element:", error);
  } finally {
    isChoosing.value = false;
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
      rolledDice.forEach((die: { is_set_aside: boolean }, index: number) => {
        if (!die.is_set_aside) {
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

// Free reroll of selected dice
const handleFarkleReroll = async () => {
  if (!userStore.userId || battle.selectedDiceIndices.value.length === 0)
    return;
  isActing.value = true;
  const indices = [...battle.selectedDiceIndices.value];
  battle.clearDiceSelection();
  try {
    const response = await eventStore.farkleReroll(userStore.userId, indices);
    if (response?.result) {
      scheduleForcedDiceAnimation(indices);
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to reroll:", error);
  } finally {
    isActing.value = false;
  }
};

// Set aside the best detected combination
const handleSetAside = async () => {
  if (
    !userStore.userId ||
    battle.availableSetAsideCombinations.value.length === 0
  )
    return;
  isActing.value = true;
  const best = [...battle.availableSetAsideCombinations.value].sort(
    (a, b) =>
      Object.values(b.bonuses).reduce((s, v) => s + v, 0) -
      Object.values(a.bonuses).reduce((s, v) => s + v, 0),
  )[0];
  try {
    const response = await eventStore.farkleSetAside(
      userStore.userId,
      best.dice_indices,
      best.type === "one_for_all"
        ? (battle.setAsideElement.value ?? undefined)
        : undefined,
    );
    if (response?.result) {
      battle.updateFromTurnResult(response.result as any);
      battle.clearDiceSelection();
    }
  } catch (error) {
    console.error("Failed to set aside:", error);
  } finally {
    isActing.value = false;
  }
};

// Set aside all active dice matching the chosen element
const handleSetAsideChosenElement = async () => {
  if (!userStore.userId || !battle.setAsideElement.value) return;
  const turn = battle.farkleTurnState.value;
  if (!turn) return;

  // Find indices of non-set-aside dice showing the chosen element
  const indices = turn.dice
    .map((d, i) => ({ d, i }))
    .filter(
      ({ d }) =>
        !d.is_set_aside && d.current_result === battle.setAsideElement.value,
    )
    .map(({ i }) => i);

  if (indices.length === 0) return;
  isActing.value = true;
  try {
    const response = await eventStore.farkleSetAside(userStore.userId, indices);
    if (response?.result) {
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to set aside chosen element:", error);
  } finally {
    isActing.value = false;
  }
};

// Roll remaining (non-set-aside) dice
const handleFarkleContinue = async () => {
  if (!userStore.userId) return;
  const indicesToAnimate = battle.farkleDice.value
    .map((die, index) => ({ die, index }))
    .filter(({ die }) => !die.is_set_aside)
    .map(({ index }) => index);
  isActing.value = true;
  try {
    const response = await eventStore.farkleContinue(userStore.userId);
    if (response?.result) {
      scheduleForcedDiceAnimation(indicesToAnimate);
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to continue:", error);
  } finally {
    isActing.value = false;
  }
};

// End player turn — commit bonuses, deploy and resolve combat round
const handleFarkleEndTurn = async () => {
  if (!userStore.userId) return;
  isActing.value = true;
  try {
    const response = await eventStore.farkleEndTurn(userStore.userId);
    if (response?.result) {
      battle.updateFromTurnResult(response.result as any);
    }
  } catch (error) {
    console.error("Failed to end turn:", error);
  } finally {
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
