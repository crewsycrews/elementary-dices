import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

// Types based on backend schemas
type BaseStats = {
  health: number
  attack: number
  defense: number
  speed: number
}

type Elemental = {
  id: string
  name: string
  level: number
  element_types: string[]
  base_stats: BaseStats
  description: string
  image_url?: string
  is_base_elemental: boolean
}

type PlayerElemental = {
  id: string
  player_id: string
  elemental_id: string
  elemental: Elemental
  current_stats: BaseStats
  is_in_active_party: boolean
  party_position: number | null
}

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
        api.api.elementals.get({ $query: filters! }),
        { silent: true }
      )

      if (response.data) {
        allElementals.value = response.data.elementals as Elemental[]
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
        allElementals.value = response.data.elementals as Elemental[]
      }
    } catch (error) {
      console.error('Failed to fetch base elementals:', error)
      throw error
    }
  }

  // TODO: Backend endpoint needs to be implemented
  // Expected: GET /api/users/:playerId/elementals or similar
  async function fetchPlayerElementals(playerId: string) {
    // Placeholder - backend endpoint not yet implemented
    console.warn('fetchPlayerElementals: Backend endpoint not yet implemented')

    // When implemented, should be something like:
    // const { api, apiCall } = useApi()
    // const response = await apiCall(
    //   api.api.users[playerId].elementals.get()
    // )
    // playerElementals.value = response.data.elementals
  }

  // TODO: Backend endpoint needs to be implemented
  // Expected: PATCH /api/users/:playerId/elementals/:elementalId
  async function updatePlayerElemental(
    elementalId: string,
    updates: { is_in_active_party?: boolean; party_position?: number }
  ) {
    // Placeholder - backend endpoint not yet implemented
    console.warn('updatePlayerElemental: Backend endpoint not yet implemented')

    // Optimistic update for now
    const index = playerElementals.value.findIndex(e => e.id === elementalId)
    if (index !== -1) {
      playerElementals.value[index] = {
        ...playerElementals.value[index],
        ...updates,
      }
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
        return response.data.elemental as Elemental
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
