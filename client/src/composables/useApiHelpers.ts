import { api } from '@elementary-dices/shared/api'
import type {
  EdenResponse,
  ApiPlayerElementalsResponse,
  ApiPlayerElementalResponse,
  ApiStartGameResponse,
  ApiEventResponse,
  ApiDiceRollResponse,
  ApiResolveEventResponse,
  ApiCombineElementalsResponse,
  ApiSwapPartyResponse,
  ApiPlayerPartyResponse,
  ApiPlayerBackpackResponse,
} from '@elementary-dices/shared'
import type { BaseStats } from '@elementary-dices/shared/types'

/**
 * Type-safe wrappers for dynamic Eden Treaty paths
 *
 * Eden Treaty cannot infer types for:
 * 1. Dynamic bracket notation: api.api.players[playerId].elementals.get()
 * 2. Kebab-case paths: api.api.players[userId]['start-game'].post()
 *
 * These wrappers provide explicit return types so consumers get full type inference.
 * All @ts-expect-error comments are centralized here instead of scattered across stores.
 */
export const playerApi = {
  /**
   * Get all elementals for a specific player
   */
  getElementals(playerId: string): Promise<EdenResponse<ApiPlayerElementalsResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals.get()
  },

  /**
   * Get active party for a player
   */
  getParty(playerId: string): Promise<EdenResponse<ApiPlayerPartyResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals.party.get()
  },

  /**
   * Get backpack for a player
   */
  getBackpack(playerId: string): Promise<EdenResponse<ApiPlayerBackpackResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals.backpack.get()
  },

  /**
   * Update a player's elemental (party position, active status, stats)
   */
  updateElemental(
    playerId: string,
    elementalId: string,
    updates: {
      is_in_active_party?: boolean
      party_position?: number | null
      current_stats?: BaseStats
    }
  ): Promise<EdenResponse<ApiPlayerElementalResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals[elementalId].patch(updates)
  },

  removeElementalFromParty(
    playerId: string,
    elementalId: string,
  ): Promise<EdenResponse<ApiPlayerElementalResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals[elementalId].delete()
  },

  /**
   * Start game - roll for first elemental
   */
  startGame(playerId: string): Promise<EdenResponse<ApiStartGameResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer kebab-case paths, but runtime works correctly
    return api.api.players[playerId]['start-game'].post()
  },

  /**
   * Swap party positions
   */
  swapPartyPositions(
    playerId: string,
    body: { position1: number; position2: number }
  ): Promise<EdenResponse<ApiSwapPartyResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals.swap.post(body)
  },

  /**
   * Combine elementals for evolution
   */
  combineElementals(
    playerId: string,
    body: { elemental_ids: string[] }
  ): Promise<EdenResponse<ApiCombineElementalsResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].elementals.combine.post(body)
  },
}

/**
 * Type-safe wrappers for event-related API calls
 * Events use kebab-case paths which Eden Treaty cannot infer
 */
export const eventApi = {
  /**
   * Get current event for player
   */
  getCurrentEvent(playerId: string): Promise<EdenResponse<ApiEventResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].events.current.get()
  },

  /**
   * Roll dice for wild encounter
   */
  rollForWildEncounter(
    playerId: string,
    eventId: string,
    body: { dice_type_id: string; context: string }
  ): Promise<EdenResponse<ApiDiceRollResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].events[eventId].roll.post(body)
  },

  /**
   * Resolve wild encounter outcome
   */
  resolveWildEncounter(
    playerId: string,
    eventId: string,
    body: { action: string; roll_id?: string; item_id?: string }
  ): Promise<EdenResponse<ApiResolveEventResponse>> {
    // @ts-expect-error Eden Treaty doesn't infer dynamic paths, but runtime works correctly
    return api.api.players[playerId].events[eventId].resolve.post(body)
  },
}
