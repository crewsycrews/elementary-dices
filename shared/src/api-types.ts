import type {
  User,
  Elemental,
  DiceType,
  PlayerDice,
  PlayerDiceWithDetails,
  PlayerElementalWithDetails,
  Item,
  PlayerInventoryItem,
  DiceRoll,
  Battle,
  ElementalEvolution,
  DiceRollOutcomeValue,
  BaseStats,
  PlayerElemental,
} from './types'

/**
 * Eden Treaty response envelope structure
 * This is what Eden Treaty actually returns when you await an API call
 *
 * Eden Treaty returns a discriminated union based on success/error
 */
export type EdenResponse<TData> = {
  data: TData | null
  error: {
    value: string
    status: number
  } | null
  status: number
  response: unknown // Eden Treaty's response object structure varies
  headers: Record<string, string>
}

/**
 * Backend API response payloads (what's inside response.data)
 * These match the return values from backend controllers
 */

// User responses
export type ApiUserResponse = { user: User }
export type ApiUsersResponse = { users: User[] }

// Elemental responses
export type ApiElementalResponse = { elemental: Elemental }
export type ApiElementalsResponse = { elementals: Elemental[] }

// Player elemental responses (with joined data)
export type ApiPlayerElementalResponse = { elemental: PlayerElemental }
export type ApiPlayerElementalsResponse = { elementals: PlayerElemental[] }
export type ApiPlayerPartyResponse = { party: PlayerElemental[] }
export type ApiPlayerBackpackResponse = { backpack: PlayerElemental[] }

// Dice responses
export type ApiDiceTypesResponse = { diceTypes: DiceType[] }
export type ApiPlayerDiceResponse = { dice: PlayerDiceWithDetails[] }
export type ApiEquippedDiceResponse = { dice: PlayerDiceWithDetails | null }

// Item responses
export type ApiItemsResponse = { items: Item[] }
export type ApiInventoryResponse = { inventory: PlayerInventoryItem[] }

// Battle responses
export type ApiBattleResponse = { battle: Battle }
export type ApiBattlesResponse = { battles: Battle[] }

// Evolution responses
export type ApiEvolutionRecipesResponse = { recipes: ElementalEvolution[] }
export type ApiDiscoveredRecipesResponse = { recipes: ElementalEvolution[] }

// Special game flow responses
export type ApiStartGameResponse = {
  success: boolean
  message: string
  first_elemental: PlayerElementalWithDetails
  dice_roll: {
    roll_value: number
    selected_index: number
  }
}

export type ApiEventResponse = {
  event: {
    id: string
    event_type: 'wild_encounter' | 'pvp_battle' | 'merchant'
    description: string
    data: {
      // Wild encounter
      wild_elemental?: Elemental
      encounter_stats?: BaseStats
      capture_difficulty?: 'easy' | 'medium' | 'hard'
      // PVP battle
      opponent_id?: string
      opponent_party?: PlayerElemental[]
      // Merchant
      available_items?: Item[]
      available_dice?: DiceType[]
    }
  }
}

export type ApiDiceRollResponse = {
  roll: DiceRoll & {
    outcome: DiceRollOutcomeValue
    roll_value: number
  }
  details?: {
    dice_notation: string
    base_roll: number
    modifiers_applied: number
    final_value: number
  }
}

export type ApiResolveEventResponse = {
  result: {
    success: boolean
    outcome: string
    message?: string
    rewards?: {
      currency?: number
      items?: Array<{ item_id: string; quantity: number }>
      captured_elemental?: PlayerElemental
    }
    penalties?: {
      downgraded_elementals?: string[]
    }
  }
}

export type ApiCombineElementalsResponse = {
  success: boolean
  result_elemental?: PlayerElemental
  message: string
}

export type ApiSwapPartyResponse = {
  success: boolean
  message: string
  party: PlayerElemental[]
}

// Generic message response
export type ApiMessageResponse = {
  message: string
  success?: boolean
}
