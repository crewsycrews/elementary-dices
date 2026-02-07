import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { playerApi } from '@/composables/useApiHelpers'

// Import types from shared package (no duplication!)
import type {
  Elemental,
  PlayerElementalWithDetails,
  BaseStats,
  ApiElementalsResponse,
  ApiPlayerElementalsResponse,
  ApiElementalResponse,
} from '@elementary-dices/shared'

export const useElementalsStore = defineStore('elementals', () => {
  // State
  const allElementals = ref<Elemental[]>([])
  const playerElementals = ref<PlayerElementalWithDetails[]>([])

  // Computed
  const activeParty = computed(() =>
    playerElementals.value
      .filter(e => e.is_in_active_party)
      .sort((a, b) => (a.party_position || 0) - (b.party_position || 0))
  )

  const backpack = computed(() =>
    playerElementals.value.filter(e => !e.is_in_active_party)
  )

  const baseElementals = computed(() =>
    allElementals.value.filter(e => e.is_base_elemental)
  )

  // Actions
  async function fetchAllElementals(filters?: { level?: number; element_type?: string }) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.elementals.get({ $query: filters }),
        { silent: true }
      )

      if (response.data) {
        allElementals.value = response.data.elementals
      }
    } catch (error) {
      console.error('Failed to fetch elementals:', error)
      throw error
    }
  }

  async function fetchBaseElementals() {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.elementals.base.get(),
        { silent: true }
      )

      if (response.data) {
        allElementals.value = response.data.elementals
      }
    } catch (error) {
      console.error('Failed to fetch base elementals:', error)
      throw error
    }
  }

  async function fetchPlayerElementals(playerId: string) {
    const { apiCall } = useApi()

    try {
      const response = await apiCall(
        playerApi.getElementals(playerId),
        { silent: true }
      )

      if (response.data) {
        playerElementals.value = response.data.elementals
      }
    } catch (error) {
      console.error('Failed to fetch player elementals:', error)
      throw error
    }
  }

  async function updatePlayerElemental(
    playerId: string,
    elementalId: string,
    updates: { is_in_active_party?: boolean; party_position?: number | null; current_stats?: BaseStats }
  ) {
    const { apiCall } = useApi()

    try {
      const response = await apiCall(
        playerApi.updateElemental(playerId, elementalId, updates),
        { silent: true }
      )

      if (response.data) {
        // Update local state
        const index = playerElementals.value.findIndex(e => e.id === elementalId)
        if (index !== -1) {
          playerElementals.value[index] = response.data.elemental
        }
      }
    } catch (error) {
      console.error('Failed to update player elemental:', error)
      throw error
    }
  }

  async function getElementalById(id: string): Promise<Elemental | null> {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.elementals[id].get(),
        { silent: true }
      )

      if (response.data) {
        return response.data.elemental
      }
      return null
    } catch (error) {
      console.error('Failed to fetch elemental:', error)
      return null
    }
  }

  function getElementalsByLevel(level: number): Elemental[] {
    return allElementals.value.filter(e => e.level === level)
  }

  function getElementalsByElement(elementType: string): Elemental[] {
    return allElementals.value.filter(e =>
      e.element_types.includes(elementType)
    )
  }

  return {
    // State
    allElementals,
    playerElementals,
    // Computed
    activeParty,
    backpack,
    baseElementals,
    // Actions
    fetchAllElementals,
    fetchBaseElementals,
    fetchPlayerElementals,
    updatePlayerElemental,
    getElementalById,
    getElementalsByLevel,
    getElementalsByElement,
  }
})
