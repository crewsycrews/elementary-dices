import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

// Types based on backend schemas
type ItemEffect = {
  capture_bonus?: number
  stat_modifier?: {
    health?: number
    attack?: number
    defense?: number
    speed?: number
  }
  duration?: number
}

type Item = {
  id: string
  name: string
  item_type: 'capture' | 'consumable' | 'buff'
  effect: ItemEffect
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
  is_consumable: boolean
}

type PlayerInventoryItem = {
  id: string
  player_id: string
  item_id: string
  quantity: number
  item?: Item
}

type DiceType = {
  id: string
  dice_notation: 'd4' | 'd6' | 'd10' | 'd12' | 'd20'
  rarity: 'green' | 'blue' | 'purple' | 'gold'
  name: string
  stat_bonuses: {
    bonus_multiplier: number
    element_affinity?: string
  }
  outcome_thresholds: {
    crit_success_range: [number, number]
    success_range: [number, number]
    fail_range: [number, number]
    crit_fail_range: [number, number]
  }
  price: number
  description: string
}

type PlayerDice = {
  id: string
  player_id: string
  dice_type_id: string
  dice_notation: string
  is_equipped: boolean
  dice_type?: DiceType
}

export const useInventoryStore = defineStore('inventory', () => {
  // State
  const playerItems = ref<PlayerInventoryItem[]>([])
  const playerDice = ref<PlayerDice[]>([])
  const shopItems = ref<Item[]>([])
  const shopDice = ref<DiceType[]>([])

  // Computed
  const equippedDice = computed(() =>
    playerDice.value.filter(d => d.is_equipped)
  )

  const getEquippedDiceByNotation = (notation: string) => {
    return playerDice.value.find(
      d => d.is_equipped && d.dice_type?.dice_notation === notation
    )
  }

  const captureItems = computed(() =>
    playerItems.value.filter(i => i.item?.item_type === 'capture')
  )

  const consumableItems = computed(() =>
    playerItems.value.filter(i => i.item?.item_type === 'consumable')
  )

  const buffItems = computed(() =>
    playerItems.value.filter(i => i.item?.item_type === 'buff')
  )

  // Actions - Items
  async function fetchPlayerItems(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.items.players[playerId].inventory.get(),
        { silent: true }
      )

      if (response.data) {
        playerItems.value = response.data.inventory as PlayerInventoryItem[]
      }
    } catch (error) {
      console.error('Failed to fetch player items:', error)
      throw error
    }
  }

  async function fetchShopItems(filters?: { item_type?: string; rarity?: string }) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.items.get({ query: filters }),
        { silent: true }
      )

      if (response.data) {
        shopItems.value = response.data.items as Item[]
      }
    } catch (error) {
      console.error('Failed to fetch shop items:', error)
      throw error
    }
  }

  async function purchaseItem(playerId: string, itemId: string, quantity = 1) {
    const { api, apiCall } = useApi()

    try {
      await apiCall(
        api.api.items.players[playerId].inventory.post({ item_id: itemId, quantity }),
        { successMessage: 'Item purchased!' }
      )

      // Refresh inventory
      await fetchPlayerItems(playerId)
    } catch (error) {
      console.error('Failed to purchase item:', error)
      throw error
    }
  }

  async function useItem(playerId: string, inventoryItemId: string, quantityToUse = 1) {
    const { api, apiCall } = useApi()

    const item = playerItems.value.find(i => i.id === inventoryItemId)
    if (!item) return

    const newQuantity = Math.max(0, item.quantity - quantityToUse)

    try {
      await apiCall(
        api.api.items.players[playerId].inventory[inventoryItemId].patch({
          quantity: newQuantity,
        }),
        { silent: true }
      )

      // Update local state
      item.quantity = newQuantity

      // Remove item if quantity is 0
      if (newQuantity === 0) {
        const index = playerItems.value.findIndex(i => i.id === inventoryItemId)
        if (index !== -1) {
          playerItems.value.splice(index, 1)
        }
      }
    } catch (error) {
      console.error('Failed to use item:', error)
      throw error
    }
  }

  // Actions - Dice
  async function fetchPlayerDice(playerId: string) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.dice.players[playerId].get(),
        { silent: true }
      )

      if (response.data) {
        playerDice.value = response.data.dice as PlayerDice[]
      }
    } catch (error) {
      console.error('Failed to fetch player dice:', error)
      throw error
    }
  }

  async function fetchShopDice(filters?: { rarity?: string; dice_notation?: string }) {
    const { api, apiCall } = useApi()

    try {
      const response = await apiCall(
        api.api.dice.types.get({ query: filters }),
        { silent: true }
      )

      if (response.data) {
        shopDice.value = response.data.diceTypes as DiceType[]
      }
    } catch (error) {
      console.error('Failed to fetch shop dice:', error)
      throw error
    }
  }

  async function purchaseDice(playerId: string, diceTypeId: string) {
    const { api, apiCall } = useApi()

    try {
      await apiCall(
        api.api.dice.players[playerId].post({ dice_type_id: diceTypeId }),
        { successMessage: 'Dice purchased!' }
      )

      // Refresh dice collection
      await fetchPlayerDice(playerId)
    } catch (error) {
      console.error('Failed to purchase dice:', error)
      throw error
    }
  }

  async function equipDice(playerId: string, playerDiceId: string) {
    const { api, apiCall } = useApi()

    try {
      // Find the dice to equip
      const diceToEquip = playerDice.value.find(d => d.id === playerDiceId)
      if (!diceToEquip || !diceToEquip.dice_type) {
        throw new Error('Dice not found')
      }

      const notation = diceToEquip.dice_type.dice_notation

      // Find currently equipped dice of the same notation
      const currentEquipped = playerDice.value.find(
        d => d.is_equipped && d.dice_type?.dice_notation === notation && d.id !== playerDiceId
      )

      // Unequip the old dice of same notation (if exists)
      if (currentEquipped) {
        await apiCall(
          api.api.dice.players[playerId][currentEquipped.id].unequip.patch(),
          { silent: true }
        )
      }

      // Equip new dice
      await apiCall(
        api.api.dice.players[playerId][playerDiceId].equip.patch(),
        { silent: true }
      )

      // Refresh dice collection
      await fetchPlayerDice(playerId)
    } catch (error) {
      console.error('Failed to equip dice:', error)
      throw error
    }
  }

  return {
    // State
    playerItems,
    playerDice,
    shopItems,
    shopDice,
    // Computed
    equippedDice,
    captureItems,
    consumableItems,
    buffItems,
    // Helpers
    getEquippedDiceByNotation,
    // Actions
    fetchPlayerItems,
    fetchShopItems,
    purchaseItem,
    useItem,
    fetchPlayerDice,
    fetchShopDice,
    purchaseDice,
    equipDice,
  }
})
