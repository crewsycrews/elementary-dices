import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

// Types based on backend schemas
type EventType = 'wild_encounter' | 'pvp_battle' | 'merchant'

type WildEncounterData = {
  elemental_id: string
  elemental_name: string
  elemental_level: number
  capture_difficulty: 'easy' | 'medium' | 'hard'
}

type MerchantData = {
  available_items: Array<{
    id: string
    name: string
    price: number
    rarity: string
  }>
  available_dice: Array<{
    id: string
    name: string
    price: number
    rarity: string
    dice_notation: string
    faces: string[]
  }>
}

export type BattlePartyMember = {
  player_elemental_id?: string
  elemental_id: string
  name: string
  element: string
  level: number
  base_power: number
  current_power: number
  target_index: number
}

// Farkle Battle types
export type FarkleDie = {
  player_dice_id: string
  dice_type_id: string
  dice_notation: string
  faces: string[]
  current_result: string
  is_set_aside: boolean
}

export type Combination = {
  type: 'triplet' | 'quartet' | 'all_for_one' | 'one_for_all' | 'full_house'
  elements: string[]
  dice_indices: number[]
  bonuses: Record<string, number>
}

export type FarkleTurnState = {
  phase: 'initial_roll' | 'can_reroll' | 'set_aside' | 'rolling_remaining' | 'done'
  dice: FarkleDie[]
  has_used_reroll: boolean
  active_combinations: Combination[]
  set_aside_element_bonus: string | null
  is_dice_rush: boolean
  busted: boolean
}

export type OpponentTurnResult = {
  dice: FarkleDie[]
  combination: Combination | null
  set_aside_element_used: boolean
  bonuses_applied: Record<string, number>
  busted: boolean
}

export type FarkleBattleState = {
  phase: 'targeting' | 'choose_element' | 'player_turn' | 'opponent_turn' | 'resolved'
  player_party: BattlePartyMember[]
  opponent_party: BattlePartyMember[]
  set_aside_element: string | null
  opponent_set_aside_element: string | null
  current_turn: number
  player_turns_done: number
  opponent_turns_done: number
  player_turn: FarkleTurnState | null
  opponent_turn_result: OpponentTurnResult | null
  player_bonuses_total: Record<string, number>
  opponent_bonuses_total: Record<string, number>
  winner?: 'player' | 'opponent' | 'draw'
  player_total_power?: number
  opponent_total_power?: number
}

// Legacy type kept for backward compatibility
export type BattleRollRecord = {
  turn: number
  side: 'player' | 'opponent'
  dice_type_id?: string
  dice_element: string
  result_element: string
  bonus_applied: number
  affected_element: string
  roll_value?: number
}

type PvPData = {
  opponent_id?: string
  opponent_name: string
  opponent_power_level: number
  potential_reward: number
  opponent_party: BattlePartyMember[]
  player_party: BattlePartyMember[]
  battle_state?: FarkleBattleState
}

export type BattleResult = {
  victory: boolean
  message: string
  player_total_power: number
  opponent_total_power: number
  reward?: number
  penalty?: {
    downgraded_elemental?: string
  }
  can_continue: boolean
}

export type FarkleTurnResult = {
  battle_state: FarkleBattleState
  detected_combinations: Combination[]
  is_busted: boolean
  is_dice_rush: boolean
  is_resolved?: boolean
  result?: BattleResult
}

type EventData = WildEncounterData | MerchantData | PvPData

type EventResponse = {
  event_type: EventType
  description: string
  data: EventData
}

export const useEventStore = defineStore('event', () => {
  // State
  const currentEvent = ref<EventResponse | null>(null)
  const eventHistory = ref<Array<{ event_type: EventType; timestamp: Date }>>([])
  const isEventActive = ref(false)

  // Computed
  const eventType = computed(() => currentEvent.value?.event_type ?? null)

  const isWildEncounter = computed(() => eventType.value === 'wild_encounter')
  const isMerchant = computed(() => eventType.value === 'merchant')
  const isPvPBattle = computed(() => eventType.value === 'pvp_battle')

  const wildEncounterData = computed(() =>
    isWildEncounter.value ? (currentEvent.value?.data as WildEncounterData) : null
  )

  const merchantData = computed(() =>
    isMerchant.value ? (currentEvent.value?.data as MerchantData) : null
  )

  const pvpData = computed(() =>
    isPvPBattle.value ? (currentEvent.value?.data as PvPData) : null
  )

  const battleState = computed(() =>
    pvpData.value?.battle_state ?? null
  )

  // Actions
  async function triggerEvent(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events.trigger.post({ player_id: playerId }),
        { silent: false }
      )

      if (response.data) {
        currentEvent.value = response.data.event as EventResponse
        isEventActive.value = true

        eventHistory.value.unshift({
          event_type: currentEvent.value.event_type,
          timestamp: new Date(),
        })

        if (eventHistory.value.length > 10) {
          eventHistory.value = eventHistory.value.slice(0, 10)
        }
      }
    } catch (error) {
      console.error('Failed to trigger event:', error)
      throw error
    }
  }

  async function resolveWildEncounter(
    playerId: string,
    diceRollId: string,
    itemId?: string
  ) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events['wild-encounter'].resolve.post({
          player_id: playerId,
          dice_roll_id: diceRollId,
          item_id: itemId,
        }),
        { silent: false }
      )

      if (response.data?.result.can_continue) {
        clearEvent()
      }

      return response.data
    } catch (error) {
      console.error('Failed to resolve wild encounter:', error)
      throw error
    }
  }

  async function startBattle(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events['pvp-battle'].start.post({
          player_id: playerId,
        }),
        { silent: true }
      )

      if (response.data?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to start battle:', error)
      throw error
    }
  }

  async function chooseSetAsideElement(playerId: string, element: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => (api.api.events['pvp-battle'] as any)['choose-element'].post({
          player_id: playerId,
          element,
        }),
        { silent: true }
      )

      if (response.data?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to choose element:', error)
      throw error
    }
  }

  async function farkleRoll(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events['pvp-battle'].roll.post({
          player_id: playerId,
        }),
        { silent: true }
      )

      if (response.data?.result?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.result.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to roll Farkle dice:', error)
      throw error
    }
  }

  async function farkleReroll(playerId: string, diceIndicesToReroll: number[]) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => (api.api.events['pvp-battle'] as any).reroll.post({
          player_id: playerId,
          dice_indices_to_reroll: diceIndicesToReroll,
        }),
        { silent: true }
      )

      if (response.data?.result?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.result.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to reroll:', error)
      throw error
    }
  }

  async function farkleSetAside(
    playerId: string,
    diceIndices: number[],
    oneForAllElement?: string
  ) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => (api.api.events['pvp-battle'] as any)['set-aside'].post({
          player_id: playerId,
          dice_indices: diceIndices,
          one_for_all_element: oneForAllElement,
        }),
        { silent: true }
      )

      if (response.data?.result?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.result.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to set aside:', error)
      throw error
    }
  }

  async function farkleContinue(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => (api.api.events['pvp-battle'] as any).continue.post({
          player_id: playerId,
        }),
        { silent: true }
      )

      if (response.data?.result?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.result.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to continue:', error)
      throw error
    }
  }

  async function farkleEndTurn(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => (api.api.events['pvp-battle'] as any)['end-turn'].post({
          player_id: playerId,
        }),
        { silent: true }
      )

      if (response.data?.result?.battle_state && currentEvent.value) {
        const data = currentEvent.value.data as PvPData
        data.battle_state = response.data.result.battle_state as FarkleBattleState
      }

      return response.data
    } catch (error) {
      console.error('Failed to end turn:', error)
      throw error
    }
  }

  async function skipWildEncounter(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events['wild-encounter'].skip.post({
          player_id: playerId,
        }),
        { silent: false, successMessage: 'Encounter skipped' }
      )

      if (response.data?.result.can_continue) {
        clearEvent()
      }

      return response.data
    } catch (error) {
      console.error('Failed to skip wild encounter:', error)
      throw error
    }
  }

  async function leaveMerchant(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events.merchant.leave.post({
          player_id: playerId,
        }),
        { silent: false, successMessage: 'Left merchant' }
      )

      if (response.data?.result.can_continue) {
        clearEvent()
      }

      return response.data
    } catch (error) {
      console.error('Failed to leave merchant:', error)
      throw error
    }
  }

  async function getEventProbabilities() {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events.probabilities.get(),
        { silent: true }
      )

      return response.data
    } catch (error) {
      console.error('Failed to fetch event probabilities:', error)
      throw error
    }
  }

  async function initializeEventState(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.events.current[playerId].get(),
        { silent: true }
      )

      if (response.data?.event) {
        currentEvent.value = response.data.event as EventResponse
        isEventActive.value = true
        console.log('Restored active event from server:', currentEvent.value?.event_type)
      } else {
        clearEvent()
      }
    } catch (error) {
      console.error('Failed to initialize event state:', error)
      clearEvent()
    }
  }

  function clearEvent() {
    currentEvent.value = null
    isEventActive.value = false
  }

  return {
    // State
    currentEvent,
    eventHistory,
    isEventActive,
    // Computed
    eventType,
    isWildEncounter,
    isMerchant,
    isPvPBattle,
    wildEncounterData,
    merchantData,
    pvpData,
    battleState,
    // Actions
    triggerEvent,
    resolveWildEncounter,
    startBattle,
    chooseSetAsideElement,
    farkleRoll,
    farkleReroll,
    farkleSetAside,
    farkleContinue,
    farkleEndTurn,
    skipWildEncounter,
    leaveMerchant,
    getEventProbabilities,
    initializeEventState,
    clearEvent,
  }
}, {
  persist: {
    key: 'elementary-dices-event',
    storage: localStorage,
    paths: ['currentEvent', 'isEventActive'],
  },
})
