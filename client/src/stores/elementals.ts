import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { playerApi } from '@/composables/useApiHelpers'

// Import types from shared package (no duplication!)
import type {
  Elemental,
  BaseStats,
  PlayerElemental,
  ElementTypeValue,
} from '@elementary-dices/shared'

export const useElementalsStore = defineStore('elementals', () => {
  // State
  const allElementals = ref<Elemental[]>([])
  const playerElementals = ref<PlayerElemental[]>([])

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
        () => api.api.elementals.get({ $query: filters || {} }),
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
        () => api.api.elementals.base.get(),
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
        () => playerApi.getElementals(playerId),
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
        () => playerApi.updateElemental(playerId, elementalId, updates),
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

  async function addToParty(playerId: string, elementalId: string) {
    const { apiCall } = useApi()

    // Find next available position (1-5)
    const occupiedPositions = activeParty.value.map(e => e.party_position || 0)
    const nextPosition = [1, 2, 3, 4, 5].find(pos => !occupiedPositions.includes(pos))

    if (!nextPosition) {
      throw new Error('Party is full')
    }

    try {
      const response = await apiCall(
        () => playerApi.updateElemental(playerId, elementalId, {
          is_in_active_party: true,
          party_position: nextPosition
        }),
        { silent: true }
      )

      if (response.data) {
        const index = playerElementals.value.findIndex(e => e.id === elementalId)
        if (index !== -1) {
          playerElementals.value[index] = response.data.elemental
        }
      }
    } catch (error) {
      console.error('Failed to add to party:', error)
      throw error
    }
  }

  async function removeFromParty(playerId: string, elementalId: string) {
    const { apiCall } = useApi()

    try {
      const response = await apiCall(
        () => playerApi.updateElemental(playerId, elementalId, {
          is_in_active_party: false,
          party_position: null
        }),
        { silent: true }
      )

      if (response.data) {
        const index = playerElementals.value.findIndex(e => e.id === elementalId)
        if (index !== -1) {
          playerElementals.value[index] = response.data.elemental
        }
      }
    } catch (error) {
      console.error('Failed to remove from party:', error)
      throw error
    }
  }

  async function getElementalById(id: string): Promise<Elemental | null> {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        () => api.api.elementals[id].get(),
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

  function getElementalsByElement(elementType: ElementTypeValue): Elemental[] {
    return allElementals.value.filter(e =>
      e.element_types.includes(elementType)
    )
  }

  function resetState() {
    allElementals.value = []
    playerElementals.value = []
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
    addToParty,
    removeFromParty,
    getElementalById,
    getElementalsByLevel,
    getElementalsByElement,
    resetState,
  }
})
