import { ref, computed } from 'vue'
import type { BattlePartyMember, BattleRollRecord, BattleState, BattleResult } from '@/stores/event'

// Element display config
const ELEMENT_CONFIG: Record<string, { emoji: string; color: string; bgColor: string }> = {
  fire: { emoji: '🔥', color: 'text-red-500', bgColor: 'bg-red-500/20' },
  water: { emoji: '💧', color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
  earth: { emoji: '🪨', color: 'text-amber-600', bgColor: 'bg-amber-600/20' },
  air: { emoji: '💨', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' },
  lightning: { emoji: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
}

export function useBattle() {
  // State
  const battleState = ref<BattleState | null>(null)
  const battleResult = ref<BattleResult | null>(null)
  const lastPlayerRoll = ref<BattleRollRecord | null>(null)
  const lastOpponentRoll = ref<BattleRollRecord | null>(null)
  const isRolling = ref(false)
  const showingAiRoll = ref(false)
  const recentlyBuffedElement = ref<string | null>(null)

  // Computed
  const battlePhase = computed(() => battleState.value?.phase ?? null)
  const playerParty = computed(() => battleState.value?.player_party ?? [])
  const opponentParty = computed(() => battleState.value?.opponent_party ?? [])
  const rollHistory = computed(() => battleState.value?.rolls ?? [])
  const currentTurn = computed(() => battleState.value?.current_turn ?? 1)
  const playerRollsDone = computed(() => battleState.value?.player_rolls_done ?? 0)
  const opponentRollsDone = computed(() => battleState.value?.opponent_rolls_done ?? 0)
  const isPlayerTurn = computed(() => playerRollsDone.value <= opponentRollsDone.value && playerRollsDone.value < 3)

  const totalPlayerPower = computed(() =>
    playerParty.value.reduce((sum, m) => sum + m.current_power, 0)
  )

  const totalOpponentPower = computed(() =>
    opponentParty.value.reduce((sum, m) => sum + m.current_power, 0)
  )

  const targetLines = computed(() => {
    return playerParty.value.map((member, index) => {
      const target = opponentParty.value[member.target_index]
      return {
        fromIndex: index,
        toIndex: member.target_index,
        attackerElement: member.element,
        defenderElement: target?.element ?? '',
      }
    })
  })

  function getElementConfig(element: string) {
    return ELEMENT_CONFIG[element] ?? ELEMENT_CONFIG.fire
  }

  function getRollDescription(roll: BattleRollRecord): string {
    const sideLabel = roll.side === 'player' ? 'You' : 'Opponent'
    const elementEmoji = getElementConfig(roll.dice_element).emoji
    const resultEmoji = getElementConfig(roll.result_element).emoji
    const affectedEmoji = getElementConfig(roll.affected_element).emoji

    return `${sideLabel} rolled ${elementEmoji} dice - got ${resultEmoji}! +${roll.bonus_applied.toFixed(1)} power to ${affectedEmoji} elementals`
  }

  // Actions
  function initFromState(state: BattleState) {
    battleState.value = state
  }

  function updateFromRollResult(data: {
    battle_state: BattleState
    player_roll?: BattleRollRecord | null
    opponent_roll?: BattleRollRecord | null
    is_resolved: boolean
    result?: BattleResult | null
  }) {
    battleState.value = data.battle_state
    lastPlayerRoll.value = data.player_roll ?? null
    lastOpponentRoll.value = data.opponent_roll ?? null

    if (data.is_resolved && data.result) {
      battleResult.value = data.result
    }

    // Track recently buffed element for animation
    if (data.player_roll) {
      recentlyBuffedElement.value = data.player_roll.affected_element
      setTimeout(() => {
        if (recentlyBuffedElement.value === data.player_roll?.affected_element) {
          recentlyBuffedElement.value = null
        }
      }, 1500)
    }
  }

  function reset() {
    battleState.value = null
    battleResult.value = null
    lastPlayerRoll.value = null
    lastOpponentRoll.value = null
    isRolling.value = false
    showingAiRoll.value = false
    recentlyBuffedElement.value = null
  }

  return {
    // State
    battleState,
    battleResult,
    lastPlayerRoll,
    lastOpponentRoll,
    isRolling,
    showingAiRoll,
    recentlyBuffedElement,
    // Computed
    battlePhase,
    playerParty,
    opponentParty,
    rollHistory,
    currentTurn,
    playerRollsDone,
    opponentRollsDone,
    isPlayerTurn,
    totalPlayerPower,
    totalOpponentPower,
    targetLines,
    // Helpers
    getElementConfig,
    getRollDescription,
    // Actions
    initFromState,
    updateFromRollResult,
    reset,
    // Constants
    ELEMENT_CONFIG,
  }
}
