import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

// Types based on backend schemas
type EvolutionRecipe = {
  id: string
  result_elemental_id: string
  required_level: number
  required_count: number
  required_same_element?: string
  required_element_1?: string
  required_element_2?: string
  required_elemental_ids?: string[]
  hint_text?: string
  is_discovered_by_default: boolean
}

type CombineResult = {
  success: boolean
  message: string
  new_elemental?: {
    id: string
    elemental_id: string
    elemental_name: string
    level: number
  }
  consumed_elementals: string[]
  recipe_discovered?: boolean
}

export const useEvolutionStore = defineStore('evolution', () => {
  // State
  const allRecipes = ref<EvolutionRecipe[]>([])
  const discoveredRecipes = ref<EvolutionRecipe[]>([])
  const lastCombineResult = ref<CombineResult | null>(null)

  // Computed
  const undiscoveredRecipes = computed(() =>
    allRecipes.value.filter(
      recipe =>
        !recipe.is_discovered_by_default &&
        !discoveredRecipes.value.some(d => d.id === recipe.id)
    )
  )

  const recipesWithHints = computed(() =>
    discoveredRecipes.value.filter(r => r.hint_text)
  )

  // Actions
  async function fetchAllRecipes() {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.evolution.get(),
        { silent: true }
      )

      if (response.data) {
        allRecipes.value = response.data.recipes as EvolutionRecipe[]
      }
    } catch (error) {
      console.error('Failed to fetch evolution recipes:', error)
      throw error
    }
  }

  async function fetchDiscoveredRecipes(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.evolution.players[playerId].discovered.get(),
        { silent: true }
      )

      if (response.data) {
        discoveredRecipes.value = response.data.recipes as EvolutionRecipe[]
      }
    } catch (error) {
      console.error('Failed to fetch discovered recipes:', error)
      throw error
    }
  }

  async function combineElementals(playerId: string, playerElementalIds: string[]) {
    const { api, apiCall } = useApi()

    // Validation
    if (playerElementalIds.length !== 3) {
      throw new Error('Must select exactly 3 elementals to combine')
    }

    try {
      const response = await apiCall(
        api.api.evolution.combine.post({
          player_id: playerId,
          player_elemental_ids: playerElementalIds,
        }),
        { silent: false }
      )

      if (response.data) {
        const result = response.data as CombineResult
        lastCombineResult.value = result

        // If recipe was discovered, refresh discovered recipes
        if (result.recipe_discovered) {
          await fetchDiscoveredRecipes(playerId)
        }

        return result
      }
    } catch (error) {
      console.error('Failed to combine elementals:', error)
      throw error
    }
  }

  function getRecipeById(id: string): EvolutionRecipe | undefined {
    return allRecipes.value.find(r => r.id === id)
  }

  function isRecipeDiscovered(recipeId: string): boolean {
    return discoveredRecipes.value.some(r => r.id === recipeId) ||
      allRecipes.value.find(r => r.id === recipeId)?.is_discovered_by_default ||
      false
  }

  function getRecipeHint(recipeId: string): string | undefined {
    const recipe = discoveredRecipes.value.find(r => r.id === recipeId)
    return recipe?.hint_text
  }

  function validateCombination(playerElementalIds: string[]): {
    valid: boolean
    reason?: string
  } {
    if (playerElementalIds.length !== 3) {
      return {
        valid: false,
        reason: 'Must select exactly 3 elementals',
      }
    }

    // Check for duplicates
    const uniqueIds = new Set(playerElementalIds)
    if (uniqueIds.size !== playerElementalIds.length) {
      return {
        valid: false,
        reason: 'Cannot use the same elemental multiple times',
      }
    }

    return { valid: true }
  }

  function clearLastResult() {
    lastCombineResult.value = null
  }

  return {
    // State
    allRecipes,
    discoveredRecipes,
    lastCombineResult,
    // Computed
    undiscoveredRecipes,
    recipesWithHints,
    // Actions
    fetchAllRecipes,
    fetchDiscoveredRecipes,
    combineElementals,
    getRecipeById,
    isRecipeDiscovered,
    getRecipeHint,
    validateCombination,
    clearLastResult,
  }
})
