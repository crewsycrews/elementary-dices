<template>
  <div class="container mx-auto p-4 md:p-6 space-y-6">
    <!-- Back Button -->
    <button
      @click="router.push('/')"
      class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <span class="text-xl">&larr;</span>
      <span class="font-semibold">Back</span>
    </button>

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
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-1">PvP Battle!</h1>
        <p class="text-muted-foreground">
          vs {{ eventStore.pvpData?.opponent_name }}
          <span v-if="eventStore.pvpData?.potential_reward" class="ml-2">
            | Reward: {{ eventStore.pvpData?.potential_reward }}
          </span>
        </p>
      </div>

      <!-- ==================== PHASE 1: TARGETING ==================== -->
      <template v-if="battle.battlePhase.value === 'targeting'">
        <div class="text-center mb-4">
          <div class="inline-block px-4 py-2 bg-primary/10 rounded-lg">
            <span class="text-sm font-bold text-primary">Phase 1: Target Assignment</span>
          </div>
          <p class="text-sm text-muted-foreground mt-2">
            Your elementals have chosen their targets. Green arrows indicate element advantage (+10% power).
          </p>
        </div>

        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? 'Opponent'"
          :show-targets="true"
          :target-lines="battle.targetLines.value"
        />

        <div class="flex justify-center">
          <button
            @click="handleStartBattle"
            :disabled="isStarting"
            class="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
          >
            {{ isStarting ? 'Starting...' : 'Start Battle!' }}
          </button>
        </div>
      </template>

      <!-- ==================== PHASE 2: DICE ROLLING ==================== -->
      <template v-if="battle.battlePhase.value === 'rolling'">
        <!-- Turn Indicator -->
        <div class="text-center mb-4">
          <div class="inline-block px-4 py-2 rounded-lg" :class="battle.isPlayerTurn.value ? 'bg-blue-500/10' : 'bg-red-500/10'">
            <span class="text-sm font-bold" :class="battle.isPlayerTurn.value ? 'text-blue-400' : 'text-red-400'">
              Phase 2: {{ battle.isPlayerTurn.value ? 'Your Turn' : "Opponent's Turn" }}
            </span>
            <span class="text-xs text-muted-foreground ml-2">
              Round {{ battle.playerRollsDone.value + 1 }} of 3
            </span>
          </div>
        </div>

        <!-- Arena (no target lines during rolling) -->
        <BattleArena
          :player-party="battle.playerParty.value"
          :opponent-party="battle.opponentParty.value"
          :opponent-name="eventStore.pvpData?.opponent_name ?? 'Opponent'"
          :buffed-element="battle.recentlyBuffedElement.value"
        />

        <!-- Dice Selection + Roll (only when it's player's turn) -->
        <div v-if="battle.isPlayerTurn.value && !battle.isRolling.value && !showDiceRoll" class="space-y-4">
          <HandDiceSelector
            :selected-dice-type="selectedDiceType"
            :disabled="battle.isRolling.value"
            @select="handleDiceTypeSelect"
          />

          <div class="flex justify-center">
            <button
              @click="handleRoll"
              :disabled="!selectedDice || battle.isRolling.value"
              class="px-6 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
            >
              Roll the dice!
            </button>
          </div>
        </div>

        <!-- Player Dice Roll Visualization -->
        <div v-if="showDiceRoll && !battle.showingAiRoll.value" class="mt-4">
          <DiceRollVisualization
            ref="diceVisualizationRef"
            :dice-type="getDiceType(selectedDice)"
            :auto-roll="true"
            :result="rollResult"
            @roll-complete="handlePlayerRollComplete"
            :affinity="selectedDiceAffinity"
          />
          <!-- Player Roll Effect Description -->
          <div v-if="battle.lastPlayerRoll.value" class="text-center mt-2">
            <p class="text-sm" :class="battle.getOutcomeColor(battle.lastPlayerRoll.value.outcome)">
              {{ battle.getRollDescription(battle.lastPlayerRoll.value) }}
            </p>
          </div>
        </div>

        <!-- AI Roll Display -->
        <div v-if="battle.showingAiRoll.value" class="text-center space-y-4 py-6">
          <div class="text-lg font-bold text-red-400 animate-pulse">
            Opponent is rolling...
          </div>
          <div v-if="showAiResult && battle.lastOpponentRoll.value" class="space-y-2">
            <div class="inline-block px-4 py-2 rounded-lg bg-red-500/10">
              <span class="text-lg">
                {{ battle.getElementConfig(battle.lastOpponentRoll.value.dice_element).emoji }}
              </span>
              <span
                class="font-bold ml-2"
                :class="battle.getOutcomeColor(battle.lastOpponentRoll.value.outcome)"
              >
                {{ battle.getOutcomeLabel(battle.lastOpponentRoll.value.outcome) }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ battle.getRollDescription(battle.lastOpponentRoll.value) }}
            </p>
          </div>
        </div>

        <!-- Roll Log -->
        <BattleRollLog :rolls="battle.rollHistory.value" />
      </template>

      <!-- ==================== PHASE 3: RESOLUTION ==================== -->
      <template v-if="battle.battlePhase.value === 'resolved' || battle.battleResult.value">
        <div class="max-w-lg mx-auto text-center space-y-6">
          <!-- Victory/Defeat Banner -->
          <div
            class="p-8 rounded-xl"
            :class="battle.battleResult.value?.victory
              ? 'bg-green-500/10 border-2 border-green-500'
              : 'bg-red-500/10 border-2 border-red-500'
            "
          >
            <div class="text-7xl mb-4">
              {{ battle.battleResult.value?.victory ? '&#x1F3C6;' : '&#x1F480;' }}
            </div>
            <h2 class="text-3xl font-bold mb-2">
              {{ battle.battleResult.value?.victory ? 'Victory!' : 'Defeat!' }}
            </h2>
            <p class="text-lg text-muted-foreground">
              {{ battle.battleResult.value?.message }}
            </p>

            <!-- Power Comparison -->
            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="p-4 bg-blue-500/10 rounded-lg">
                <p class="text-sm text-muted-foreground mb-1">Your Power</p>
                <p class="text-3xl font-bold text-blue-400">
                  {{ battle.battleResult.value?.player_total_power?.toFixed(1) }}
                </p>
              </div>
              <div class="p-4 bg-red-500/10 rounded-lg">
                <p class="text-sm text-muted-foreground mb-1">Opponent Power</p>
                <p class="text-3xl font-bold text-red-400">
                  {{ battle.battleResult.value?.opponent_total_power?.toFixed(1) }}
                </p>
              </div>
            </div>

            <!-- Reward -->
            <div
              v-if="battle.battleResult.value?.victory && battle.battleResult.value?.reward"
              class="mt-4 p-3 bg-yellow-500/10 rounded-lg"
            >
              <p class="text-sm text-muted-foreground mb-1">Reward Earned</p>
              <p class="font-bold text-xl text-yellow-500">
                {{ battle.battleResult.value.reward }} coins
              </p>
            </div>

            <!-- Penalty -->
            <div
              v-if="!battle.battleResult.value?.victory && battle.battleResult.value?.penalty?.downgraded_elemental"
              class="mt-4 p-3 bg-orange-500/10 rounded-lg"
            >
              <p class="text-sm text-orange-500">
                {{ battle.battleResult.value.penalty.downgraded_elemental }} was downgraded!
              </p>
            </div>
          </div>

          <!-- Roll Log (final) -->
          <BattleRollLog :rolls="battle.rollHistory.value" />

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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/stores/event'
import { useUserStore } from '@/stores/user'
import { useElementalsStore } from '@/stores/elementals'
import { useInventoryStore } from '@/stores/inventory'
import { useBattle } from '@/composables/useBattle'
import DiceRollVisualization from '@/components/game/DiceRollVisualization.vue'
import HandDiceSelector from '@/components/game/HandDiceSelector.vue'
import BattleArena from '@/components/game/BattleArena.vue'
import BattleRollLog from '@/components/game/BattleRollLog.vue'

const router = useRouter()
const eventStore = useEventStore()
const userStore = useUserStore()
const elementalsStore = useElementalsStore()
const inventoryStore = useInventoryStore()
const battle = useBattle()

const loading = ref(false)
const isStarting = ref(false)
const selectedDice = ref('')
const selectedDiceType = ref<string | null>(null)
const showDiceRoll = ref(false)
const rollResult = ref<any>(null)
const showAiResult = ref(false)
const diceVisualizationRef = ref<InstanceType<typeof DiceRollVisualization> | null>(null)

// Available dice from inventory
const availableDice = computed(() => inventoryStore.playerDice)
const selectedPlayerDice = computed(() =>
  availableDice.value.find((d) => d.id === selectedDice.value)
)
const selectedDiceAffinity = computed(() =>
  selectedPlayerDice.value?.dice_type?.stat_bonuses?.element_affinity as
    'fire' | 'water' | 'earth' | 'air' | 'lightning' | undefined
)

// Get dice type notation from dice ID
const getDiceType = (diceId: string): 'd4' | 'd6' | 'd10' | 'd12' | 'd20' => {
  const dice = availableDice.value.find((d) => d.id === diceId)
  return (dice?.dice_type?.dice_notation || 'd6') as 'd4' | 'd6' | 'd10' | 'd12' | 'd20'
}

// Handle dice type selection
const handleDiceTypeSelect = (diceType: string) => {
  selectedDiceType.value = diceType
  const diceOfType = availableDice.value.find(
    (d) => d.dice_type?.dice_notation === diceType
  )
  if (diceOfType) {
    selectedDice.value = diceOfType.id
  }
}

// Phase 1 -> Phase 2: Start battle
const handleStartBattle = async () => {
  if (!userStore.userId) return
  isStarting.value = true

  try {
    const result = await eventStore.startBattle(userStore.userId)
    if (result?.battle_state) {
      battle.initFromState(result.battle_state as any)
    }
  } catch (error) {
    console.error('Failed to start battle:', error)
  } finally {
    isStarting.value = false
  }
}

// Phase 2: Player rolls a dice
const handleRoll = async () => {
  if (!selectedDice.value || !userStore.userId) return

  const playerDice = availableDice.value.find((d) => d.id === selectedDice.value)
  if (!playerDice) return

  battle.isRolling.value = true
  showDiceRoll.value = true

  try {
    const response = await eventStore.rollBattleDice(
      userStore.userId,
      playerDice.dice_type_id,
    )

    if (response?.result) {
      // Set roll result for dice visualization
      if (response.result.player_roll) {
        rollResult.value = {
          roll_value: response.result.player_roll.roll_value,
          outcome: response.result.player_roll.outcome,
        }
      }

      // Update battle state with the full result
      battle.updateFromRollResult(response.result as any)

      nextTick(() => {
        diceVisualizationRef.value?.roll()
      })

      inventoryStore.updateLastRoll?.({
        roll_value: response.result.player_roll?.roll_value,
        outcome: response.result.player_roll?.outcome,
      })
    }
  } catch (error) {
    console.error('Failed to roll battle dice:', error)
    showDiceRoll.value = false
  } finally {
    battle.isRolling.value = false
  }
}

// After player dice animation finishes, show AI roll
const handlePlayerRollComplete = async () => {
  showDiceRoll.value = false

  // Show AI rolling with animated delay
  if (battle.lastOpponentRoll.value) {
    battle.showingAiRoll.value = true
    showAiResult.value = false

    // Wait 1.5 seconds for suspense
    await new Promise((resolve) => setTimeout(resolve, 1500))
    showAiResult.value = true

    // Wait another 1.5 seconds to show the result
    await new Promise((resolve) => setTimeout(resolve, 1500))
    battle.showingAiRoll.value = false

    // Reset for next turn
    rollResult.value = null
    selectedDiceType.value = null
    selectedDice.value = ''
  }
}

// Go back to main menu after battle resolves
const proceedToNext = async () => {
  if (!userStore.userId) {
    eventStore.clearEvent()
    router.push('/')
    return
  }

  try {
    await userStore.fetchUser(userStore.userId)
    await inventoryStore.fetchPlayerItems(userStore.userId)
    await elementalsStore.fetchPlayerElementals(userStore.userId)
  } catch (error) {
    console.error('Failed to refresh user data:', error)
  } finally {
    battle.reset()
    eventStore.clearEvent()
    router.push('/')
  }
}

// Load event data and initialize battle state
onMounted(async () => {
  if (!userStore.userId) return

  loading.value = true

  try {
    await elementalsStore.fetchAllElementals()
    await elementalsStore.fetchPlayerElementals(userStore.userId)
    await inventoryStore.fetchPlayerDice(userStore.userId)
    await inventoryStore.fetchPlayerItems(userStore.userId)

    // Initialize battle state from event store
    if (eventStore.battleState) {
      battle.initFromState(eventStore.battleState)
    } else if (eventStore.pvpData) {
      // If battle_state is embedded in pvp data
      const pvp = eventStore.pvpData
      if (pvp.battle_state) {
        battle.initFromState(pvp.battle_state)
      }
    }
  } catch (error) {
    console.error('Failed to load battle data:', error)
  } finally {
    loading.value = false
  }
})
</script>
